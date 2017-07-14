/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.5
 *
 * Copyright (c) 2013-2016, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable, and
 * non-transferable license to use, install, execute, and perform the Spine
 * Runtimes software and derivative works solely for personal or internal
 * use. Without the written permission of Esoteric Software (see Section 2 of
 * the Spine Software License Agreement), you may not (a) modify, translate,
 * adapt, or develop new applications using the Spine Runtimes or otherwise
 * create derivative works or improvements of the Spine Runtimes or (b) remove,
 * delete, alter, or obscure any trademarks or any copyright, trademark, patent,
 * or other intellectual property or proprietary rights notices on or in the
 * Software, including any copy thereof. Redistributions in binary or source
 * form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF
 * USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

namespace pixi_spine.core {
    export class TextureAtlas implements Disposable {
        pages = new Array<TextureAtlasPage>();
        regions = new Array<TextureAtlasRegion>();

        constructor(atlasText?: string, textureLoader?: (path: string, loaderFunction: (tex: PIXI.BaseTexture) => any) => any, callback?: (obj: TextureAtlas) => any) {
            if (atlasText) {
                this.addSpineAtlas(atlasText, textureLoader, callback);
            }
        }

        addTexture(name: string, texture: PIXI.Texture) {
            let pages = this.pages;
            let page: TextureAtlasPage = null;
            for (var i = 0; i < pages.length; i++) {
                if (pages[i].baseTexture === texture.baseTexture) {
                    page = pages[i];
                    break;
                }
            }
            if (page === null) {
                page = new TextureAtlasPage();
                page.name = 'texturePage';
                var baseTexture = texture.baseTexture;
                page.width = baseTexture.realWidth;
                page.height = baseTexture.realHeight;
                page.baseTexture = baseTexture;
                //those fields are not relevant in Pixi
                page.minFilter = page.magFilter = TextureFilter.Nearest;
                page.uWrap = TextureWrap.ClampToEdge;
                page.vWrap = TextureWrap.ClampToEdge;
                pages.push(page);
            }
            var region = new TextureAtlasRegion();
            region.name = name;
            region.page = page;
            region.texture = texture;
            region.index = -1;
            this.regions.push(region);
            return region;
        }

        addTextureHash(textures: Map<PIXI.Texture>, stripExtension: boolean) {
            for (var key in textures) {
                if (textures.hasOwnProperty(key)) {
                    this.addTexture(stripExtension && key.indexOf('.') !== -1 ? key.substr(0, key.lastIndexOf('.')) : key, textures[key]);
                }
            }
        }

        public addSpineAtlas(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: PIXI.BaseTexture)  => any) => any, callback: (obj: TextureAtlas) => any) {
            return this.load(atlasText, textureLoader, callback);
        }

        private load(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: PIXI.BaseTexture) => any) => any, callback: (obj: TextureAtlas) => any) {
            if (textureLoader == null)
                throw new Error("textureLoader cannot be null.");

            let reader = new TextureAtlasReader(atlasText);
            let tuple = new Array<string>(4);
            let page: TextureAtlasPage = null;

            let iterateParser = () => {
                while (true) {
                    let line = reader.readLine();
                    if (line == null) {
                        return callback && callback(this);
                    }
                    line = line.trim();
                    if (line.length == 0)
                        page = null;
                    else if (!page) {
                        page = new TextureAtlasPage();
                        page.name = line;

                        if (reader.readTuple(tuple) == 2) { // size is only optional for an atlas packed with an old TexturePacker.
                            page.width = parseInt(tuple[0]);
                            page.height = parseInt(tuple[1]);
                            reader.readTuple(tuple);
                        }
                        // page.format = Format[tuple[0]]; we don't need format in WebGL

                        reader.readTuple(tuple);
                        page.minFilter = Texture.filterFromString(tuple[0]);
                        page.magFilter = Texture.filterFromString(tuple[1]);

                        let direction = reader.readValue();
                        page.uWrap = TextureWrap.ClampToEdge;
                        page.vWrap = TextureWrap.ClampToEdge;
                        if (direction == "x")
                            page.uWrap = TextureWrap.Repeat;
                        else if (direction == "y")
                            page.vWrap = TextureWrap.Repeat;
                        else if (direction == "xy")
                            page.uWrap = page.vWrap = TextureWrap.Repeat;

                        textureLoader(line, (texture: PIXI.BaseTexture) => {
                            page.baseTexture = texture;
                            if (!texture.hasLoaded) {
                                texture.width = page.width;
                                texture.height = page.height;
                            }
                            this.pages.push(page);
                            page.setFilters();

                            if (!page.width || !page.height) {
                                page.width = texture.realWidth;
                                page.height = texture.realHeight;
                                if (!page.width || !page.height) {
                                    console.log("ERROR spine atlas page " + page.name + ": meshes wont work if you dont specify size in atlas (http://www.html5gamedevs.com/topic/18888-pixi-spines-and-meshes/?p=107121)");
                                }
                            }
                            iterateParser();
                        });
                        this.pages.push(page);
                        break;
                    } else {
                        let region: TextureAtlasRegion = new TextureAtlasRegion();
                        region.name = line;
                        region.page = page;

                        let rotate: number = reader.readValue() == "true" ? 6 : 0;

                        reader.readTuple(tuple);
                        let x = parseInt(tuple[0]);
                        let y = parseInt(tuple[1]);

                        reader.readTuple(tuple);
                        let width = parseInt(tuple[0]);
                        let height = parseInt(tuple[1]);

                        let resolution = page.baseTexture.resolution;
                        x /= resolution;
                        y /= resolution;
                        width /= resolution;
                        height /= resolution;

                        let frame = new PIXI.Rectangle(x, y, rotate ? height : width, rotate ? width : height);

                        if (reader.readTuple(tuple) == 4) { // split is optional
                            // region.splits = new Vector.<int>(parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3]));

                            if (reader.readTuple(tuple) == 4) { // pad is optional, but only present with splits
                                //region.pads = Vector.<int>(parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3]));

                                reader.readTuple(tuple);
                            }
                        }

                        let originalWidth = parseInt(tuple[0]) / resolution;
                        let originalHeight = parseInt(tuple[1]) / resolution;
                        reader.readTuple(tuple);
                        let offsetX = parseInt(tuple[0]) / resolution;
                        let offsetY = parseInt(tuple[1]) / resolution;

                        let orig = new PIXI.Rectangle(0, 0, originalWidth, originalHeight);
                        let trim = new PIXI.Rectangle(offsetX, originalHeight - height - offsetY, width, height);

                        //TODO: pixiv3 uses different frame/crop/trim

                        if (PIXI.VERSION[0] != '3') {
                            // pixi v4 or v5
                            region.texture = new PIXI.Texture(region.page.baseTexture, frame, orig, trim, rotate);
                        } else {
                            // pixi v3.0.11
                            var frame2 = new PIXI.Rectangle(x, y, width, height);
                            var crop = frame2.clone();
                            trim.width = originalWidth;
                            trim.height = originalHeight;
                            region.texture = new PIXI.Texture(region.page.baseTexture, frame2, crop, trim, rotate);
                        }

                        region.index = parseInt(reader.readValue());
                        (region.texture as any)._updateUvs();

                        this.regions.push(region);
                    }
                }
            }

            iterateParser();
        }

        findRegion(name: string): TextureAtlasRegion {
            for (let i = 0; i < this.regions.length; i++) {
                if (this.regions[i].name == name) {
                    return this.regions[i];
                }
            }
            return null;
        }

        dispose() {
            for (let i = 0; i < this.pages.length; i++) {
                this.pages[i].baseTexture.dispose();
            }
        }
    }

    class TextureAtlasReader {
        lines: Array<string>;
        index: number = 0;

        constructor(text: string) {
            this.lines = text.split(/\r\n|\r|\n/);
        }

        readLine(): string {
            if (this.index >= this.lines.length)
                return null;
            return this.lines[this.index++];
        }

        readValue(): string {
            let line = this.readLine();
            let colon = line.indexOf(":");
            if (colon == -1)
                throw new Error("Invalid line: " + line);
            return line.substring(colon + 1).trim();
        }

        readTuple(tuple: Array<string>): number {
            let line = this.readLine();
            let colon = line.indexOf(":");
            if (colon == -1)
                throw new Error("Invalid line: " + line);
            let i = 0, lastMatch = colon + 1;
            for (; i < 3; i++) {
                let comma = line.indexOf(",", lastMatch);
                if (comma == -1) break;
                tuple[i] = line.substr(lastMatch, comma - lastMatch).trim();
                lastMatch = comma + 1;
            }
            tuple[i] = line.substring(lastMatch).trim();
            return i + 1;
        }
    }

    export class TextureAtlasPage {
        name: string;
        minFilter: TextureFilter;
        magFilter: TextureFilter;
        uWrap: TextureWrap;
        vWrap: TextureWrap;
        baseTexture: PIXI.BaseTexture;
        width: number;
        height: number;

        public setFilters() {
            let tex = this.baseTexture;
            let filter = this.minFilter;
            if (filter == TextureFilter.Linear) {
                tex.scaleMode = PIXI.SCALE_MODES.LINEAR;
            } else if (this.minFilter == TextureFilter.Nearest) {
                tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
            } else {
                tex.mipmap = true;
                if (filter == TextureFilter.MipMapNearestNearest) {
                    tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
                } else {
                    tex.scaleMode = PIXI.SCALE_MODES.LINEAR;
                }
            }
        }
    }

    export class TextureAtlasRegion extends TextureRegion {
        page: TextureAtlasPage;
        name: string;
        index: number;
    }
}
