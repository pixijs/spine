var spine = require('../SpineUtil');
spine.AtlasReader = require('./AtlasReader');
spine.AtlasPage = require('./AtlasPage');
spine.AtlasRegion = require('./AtlasRegion');
var syncImageLoaderAdapter = require('../loaders/syncImageLoaderAdapter.js')

spine.Atlas = function(atlasText, loaderFunction, callback) {
    this.pages = [];
    this.regions = [];
    if (typeof atlasText === "string") {
        this.addSpineAtlas.call(this, atlasText, loaderFunction, callback);
    }
};

spine.Atlas.prototype = {
    addTexture: function(name, texture) {
        var pages = this.pages;
        var page = null;
        for (var i=0;i<pages.length;i++) {
            if (pages[i].rendererObject === texture.baseTexture) {
                page = pages[i];
                break;
            }
        }
        if (page === null) {
            page = new AtlasPage();
            page.name = 'texturePage';
            var baseTexture = texture.baseTexture;
            page.width = baseTexture.realWidth;
            page.height = baseTexture.realHeight;
            page.rendererObject = baseTexture;
            //those fields are not relevant in Pixi
            page.format = 'RGBA8888';
            page.minFilter = page.magFilter = "Nearest";
            page.uWrap = Atlas.TextureWrap.clampToEdge;
            page.vWrap = Atlas.TextureWrap.clampToEdge;
            pages.push(page);
        }
        var region = new AtlasRegion();
        region.name = name;
        region.page = page;
        region.rendererObject = texture;
        region.index = -1;
        this.regions.push(region);
        return region;
    },
    addTextureHash: function(textures) {
        for (var key in textures) {
            if (textures.hasOwnProperty(key)) {
                this.addTexture(key, textures[key]);
            }
        }
    },
    addSpineAtlas: function (atlasText, loaderFunction, callback)
    {
        //TODO: remove this legacy later
        if (typeof loaderFunction !== "function") {
            //old syntax
            var baseUrl = loaderFunction;
            var crossOrigin = callback;
            loaderFunction = syncImageLoaderAdapter(baseUrl, crossOrigin);
            callback = null;
        }

        this.texturesLoading = 0;

        var self = this;

        var reader = new spine.AtlasReader(atlasText);
        var tuple = [];
        tuple.length = 4;
        var page = null;

        iterateParser();

        function iterateParser() {
            while (true) {
                var line = reader.readLine();
                if (line === null) {
                    return callback && callback(self);
                }
                line = reader.trim(line);
                if (!line.length)
                    page = null;
                else if (!page) {
                    page = new spine.AtlasPage();
                    page.name = line;

                    if (reader.readTuple(tuple) == 2) { // size is only optional for an atlas packed with an old TexturePacker.
                        page.width = parseInt(tuple[0]);
                        page.height = parseInt(tuple[1]);
                        reader.readTuple(tuple);
                    } else {
                        //old format, detect width and height by texture
                    }
                    page.format = spine.Atlas.Format[tuple[0]];

                    reader.readTuple(tuple);
                    page.minFilter = spine.Atlas.TextureFilter[tuple[0]];
                    page.magFilter = spine.Atlas.TextureFilter[tuple[1]];

                    var direction = reader.readValue();
                    page.uWrap = spine.Atlas.TextureWrap.clampToEdge;
                    page.vWrap = spine.Atlas.TextureWrap.clampToEdge;
                    if (direction == "x")
                        page.uWrap = spine.Atlas.TextureWrap.repeat;
                    else if (direction == "y")
                        page.vWrap = spine.Atlas.TextureWrap.repeat;
                    else if (direction == "xy")
                        page.uWrap = page.vWrap = spine.Atlas.TextureWrap.repeat;

                    // @ivanpopelyshev: I so want to use generators and "yield()" here, or at least promises
                    loaderFunction(line, function (texture) {
                        page.rendererObject = texture;
                        self.pages.push(page);
                        if (!page.width || !page.height) {
                            page.width = texture.realWidth;
                            page.height = texture.realHeight;
                            if (!page.width || !page.height) {
                                console.log("ERROR spine atlas page " + page.name + ": meshes wont work if you dont specify size in atlas (http://www.html5gamedevs.com/topic/18888-pixi-spines-and-meshes/?p=107121)");
                            }
                        }
                        iterateParser();
                    });
                    break;
                } else {
                    var region = new spine.AtlasRegion();
                    region.name = line;
                    region.page = page;

                    var rotate = reader.readValue() === "true" ? 6 : 0;

                    reader.readTuple(tuple);
                    var x = parseInt(tuple[0]);
                    var y = parseInt(tuple[1]);

                    reader.readTuple(tuple);
                    var width = parseInt(tuple[0]);
                    var height = parseInt(tuple[1]);

                    var resolution = page.rendererObject.resolution;
                    x /= resolution;
                    y /= resolution;
                    width /= resolution;
                    height /= resolution;

                    var frame = new PIXI.Rectangle(x, y, rotate ? height : width, rotate ? width : height);

                    if (reader.readTuple(tuple) == 4) { // split is optional
                        region.splits = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                        if (reader.readTuple(tuple) == 4) { // pad is optional, but only present with splits
                            region.pads = [parseInt(tuple[0]), parseInt(tuple[1]), parseInt(tuple[2]), parseInt(tuple[3])];

                            reader.readTuple(tuple);
                        }
                    }

                    var originalWidth = parseInt(tuple[0]) / resolution;
                    var originalHeight = parseInt(tuple[1]) / resolution;
                    reader.readTuple(tuple);
                    var offsetX = parseInt(tuple[0]) / resolution;
                    var offsetY = parseInt(tuple[1]) / resolution;

                    var orig = new PIXI.Rectangle(0, 0, originalWidth, originalHeight);
                    var trim = new PIXI.Rectangle(offsetX, originalHeight - height - offsetY, width, height);

                    //TODO: pixiv3 uses different frame/crop/trim

                    if (PIXI.VERSION[0] == '4') {
                        // pixi v4.0.0
                        region.texture = new PIXI.Texture(region.page.rendererObject, frame, orig, trim, rotate);
                    } else {
                        // pixi v3.0.11
                        var frame2 = new PIXI.Rectangle(x, y, width, height);
                        var crop = frame2.clone();
                        trim.width = originalWidth;
                        trim.height = originalHeight;
                        region.texture = new PIXI.Texture(region.page.rendererObject, frame2, crop, trim, rotate);
                    }

                    region.index = parseInt(reader.readValue());

                    self.regions.push(region);
                }
            }
        }
    },
    findRegion: function (name)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
            if (regions[i].name == name) return regions[i];
        return null;
    },
    dispose: function ()
    {
        var pages = this.pages;
        for (var i = 0, n = pages.length; i < n; i++)
            pages[i].rendererObject.destroy(true);
    },
    updateUVs: function (page)
    {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
        {
            var region = regions[i];
            if (region.page != page) continue;
            region.texture._updateUvs();
        }
    }
};

spine.Atlas.Format = {
    alpha: 0,
    intensity: 1,
    luminanceAlpha: 2,
    rgb565: 3,
    rgba4444: 4,
    rgb888: 5,
    rgba8888: 6
};

spine.Atlas.TextureFilter = {
    nearest: 0,
    linear: 1,
    mipMap: 2,
    mipMapNearestNearest: 3,
    mipMapLinearNearest: 4,
    mipMapNearestLinear: 5,
    mipMapLinearLinear: 6
};

spine.Atlas.TextureWrap = {
    mirroredRepeat: 0,
    clampToEdge: 1,
    repeat: 2
};
module.exports = spine.Atlas;
