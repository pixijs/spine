/// <reference types="pixi.js" />
/// <reference path="polyfills.ts" />
/// <reference path="core/Bone.ts" />
namespace pixi_spine {
    /* Esoteric Software SPINE wrapper for pixi.js */
    core.Bone.yDown = true;

    let tempRgb = [0, 0, 0];

    export interface ISpineDisplayObject extends PIXI.DisplayObject {
        region?: core.TextureRegion;
        attachment?: core.Attachment;
    }

    export class SpineSprite extends PIXI.Sprite implements ISpineDisplayObject {
        region?: core.TextureRegion = null;
        attachment?: core.Attachment = null;
    }

    const gp = PIXI.GraphicsGeometry.prototype as any;
    if (!gp.invalidate) {
        let tmp = [];
        gp.invalidate = function() {
            const t = this.graphicsData;
            tmp.push(0);
            this.graphicsData = tmp;
            this.clear();
            this.graphicsData = t;
        }
    }

    export class SpineMesh extends PIXI.SimpleMesh implements ISpineDisplayObject {
        region?: core.TextureRegion = null;
        attachment?: core.Attachment = null;

        constructor(texture: PIXI.Texture, vertices?: Float32Array, uvs?: Float32Array, indices?: Uint16Array, drawMode?: number) {
            super(texture, vertices, uvs, indices, drawMode);
        }
    }

    /**
     * A class that enables the you to import and run your spine animations in pixi.
     * The Spine animation data needs to be loaded using either the Loader or a SpineLoader before it can be used by this class
     * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
     *
     * ```js
     * let spineAnimation = new spine(spineData);
     * ```
     *
     * @class
     * @extends Container
     * @memberof spine
     * @param spineData {object} The spine data loaded from a spine atlas.
     */
    export class Spine extends PIXI.Container {
        static globalAutoUpdate: boolean = true;
        static globalDelayLimit: number  = 0;

        tintRgb: ArrayLike<number>;
        spineData: core.SkeletonData;
        skeleton: core.Skeleton;
        stateData: core.AnimationStateData;
        state: core.AnimationState;
        slotContainers: Array<PIXI.Container>;
        tempClipContainers: Array<PIXI.Container>;
        localDelayLimit: number;
        private _autoUpdate: boolean;
        private _visible: boolean;

        constructor(spineData: core.SkeletonData) {
            super();

            if (!spineData) {
                throw new Error('The spineData param is required.');
            }

            if ((typeof spineData) === "string") {
                throw new Error('spineData param cant be string. Please use spine.Spine.fromAtlas("YOUR_RESOURCE_NAME") from now on.');
            }

            /**
             * The spineData object
             *
             * @member {object}
             */
            this.spineData = spineData;

            /**
             * A spine Skeleton object
             *
             * @member {object}
             */
            this.skeleton = new core.Skeleton(spineData);
            this.skeleton.updateWorldTransform();

            /**
             * A spine AnimationStateData object created from the spine data passed in the constructor
             *
             * @member {object}
             */
            this.stateData = new core.AnimationStateData(spineData);

            /**
             * A spine AnimationState object created from the spine AnimationStateData object
             *
             * @member {object}
             */
            this.state = new core.AnimationState(this.stateData);

            /**
             * An array of containers
             *
             * @member {Container[]}
             */
            this.slotContainers = [];

            this.tempClipContainers = [];

            for (let i = 0, n = this.skeleton.slots.length; i < n; i++) {
                let slot = this.skeleton.slots[i];
                let attachment: any = slot.getAttachment();
                let slotContainer = this.newContainer();
                this.slotContainers.push(slotContainer);
                this.addChild(slotContainer);
                this.tempClipContainers.push(null);

                if (attachment instanceof core.RegionAttachment) {
                    let spriteName = (attachment.region as core.TextureAtlasRegion).name;
                    let sprite = this.createSprite(slot, attachment, spriteName);
                    slot.currentSprite = sprite;
                    slot.currentSpriteName = spriteName;
                    slotContainer.addChild(sprite);
                }
                else if (attachment instanceof core.MeshAttachment) {
                    let mesh = this.createMesh(slot, attachment);
                    slot.currentMesh = mesh;
                    slot.currentMeshId = attachment.id;
                    slotContainer.addChild(mesh);
                }
                else if (attachment instanceof core.ClippingAttachment) {
                    this.createGraphics(slot, attachment);
                    slotContainer.addChild(slot.clippingContainer);
                    slotContainer.addChild(slot.currentGraphics);
                }
                else {
                    continue;
                }

            }

            /**
             * The tint applied to all spine slots. This is a [r,g,b] value. A value of [1,1,1] will remove any tint effect.
             *
             * @member {number}
             * @memberof spine.Spine#
             */
            this.tintRgb = new Float32Array([1, 1, 1]);

            this.autoUpdate = true;
            this.visible = true;
        }

        /**
         * If this flag is set to true, the spine animation will be automatically updated every
         * time the object id drawn. The down side of this approach is that the delta time is
         * automatically calculated and you could miss out on cool effects like slow motion,
         * pause, skip ahead and the sorts. Most of these effects can be achieved even with
         * autoUpdate enabled but are harder to achieve.
         *
         * @member {boolean}
         * @memberof spine.Spine#
         * @default true
         */
        get autoUpdate(): boolean {
            return this._autoUpdate;
        }

        set autoUpdate(value: boolean) {
            if (value !== this._autoUpdate) {
                this._autoUpdate = value;
                this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
            }
        }

        /**
         * The visibility of the spine object. If false the object will not be drawn,
         * the updateTransform function will not be called, and the spine will not be automatically updated.
         *
         * @member {boolean}
         * @memberof spine.Spine#
         * @default true
         */
        get visible(): boolean {
            return this._visible;
        }

        set visible(value: boolean) {
            if (value !== this._visible) {
                this._visible = value;
                if (value) {
                    this.lastTime = 0;
                }
            }
        }

        /**
         * The tint applied to the spine object. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @member {number}
         * @memberof spine.Spine#
         * @default 0xFFFFFF
         */
        get tint(): number {
            return PIXI.utils.rgb2hex(this.tintRgb as any);
        }

        set tint(value: number) {
            this.tintRgb = PIXI.utils.hex2rgb(value, this.tintRgb as any);
        }

        /**
         * Limit value for the update dt with Spine.globalDelayLimit
         * that can be overridden with localDelayLimit
         * @return {number} - Maximum processed dt value for the update
         */
        get delayLimit() : number {
            let limit = typeof this.localDelayLimit !== "undefined"?
                this.localDelayLimit: Spine.globalDelayLimit;

            // If limit is 0, this means there is no limit for the delay
            return limit || Number.MAX_VALUE
        }

        /**
         * Update the spine skeleton and its animations by delta time (dt)
         *
         * @param dt {number} Delta time. Time by which the animation should be updated
         */
        update(dt: number) {
            // Limit delta value to avoid animation jumps
            let delayLimit = this.delayLimit;
            if (dt > delayLimit) dt = delayLimit;

            this.state.update(dt);
            this.state.apply(this.skeleton);

            //check we haven't been destroyed via a spine event callback in state update
            if(!this.skeleton)
                return;

            this.skeleton.updateWorldTransform();

            let slots = this.skeleton.slots;

            // in case pixi has double tint
            let globalClr = (this as any).color;
            let light: ArrayLike<number> = null, dark: ArrayLike<number> = null;

            if (globalClr) {
                light = globalClr.light;
                dark = globalClr.dark;
            } else {
                light = this.tintRgb;
            }

            let thack = false;

            for (let i = 0, n = slots.length; i < n; i++) {
                let slot = slots[i];
                let attachment = slot.getAttachment();
                let slotContainer = this.slotContainers[i];

                if (!attachment) {
                    slotContainer.visible = false;
                    continue;
                }

                let spriteColor: any = null;

                let attColor = (attachment as any).color;
                if (attachment instanceof core.RegionAttachment) {
                    let region = (attachment as core.RegionAttachment).region;
                    if (region) {
                        if (slot.currentMesh) {
                            slot.currentMesh.visible = false;
                            slot.currentMesh = null;
                            slot.currentMeshId = undefined;
                            slot.currentMeshName = undefined;
                        }
                        let ar = region as core.TextureAtlasRegion;
                        if (!slot.currentSpriteName || slot.currentSpriteName !== ar.name) {
                            let spriteName = ar.name;
                            if (slot.currentSprite) {
                                slot.currentSprite.visible = false;
                            }
                            slot.sprites = slot.sprites || {};
                            if (slot.sprites[spriteName] !== undefined) {
                                slot.sprites[spriteName].visible = true;
                            }
                            else {
                                let sprite = this.createSprite(slot, attachment, spriteName);
                                slotContainer.addChild(sprite);
                            }
                            slot.currentSprite = slot.sprites[spriteName];
                            slot.currentSpriteName = spriteName;

                        // force sprite update when attachment name is same.
                        // issues https://github.com/pixijs/pixi-spine/issues/318
                        } else if (slot.currentSpriteName === ar.name && !slot.hackRegion) {
                            this.setSpriteRegion(attachment, slot.currentSprite, region);
                        }
                    }

                    let transform = slotContainer.transform;
                    transform.setFromMatrix(slot.bone.matrix);

                    if (slot.currentSprite.color) {
                        //YAY! double - tint!
                        spriteColor = slot.currentSprite.color;
                    } else {
                        tempRgb[0] = light[0] * slot.color.r * attColor.r;
                        tempRgb[1] = light[1] * slot.color.g * attColor.g;
                        tempRgb[2] = light[2] * slot.color.b * attColor.b;
                        slot.currentSprite.tint = PIXI.utils.rgb2hex(tempRgb);
                    }
                    slot.currentSprite.blendMode = slot.blendMode;
                }
                else if (attachment instanceof core.MeshAttachment) {
                    if (slot.currentSprite) {
                        //TODO: refactor this thing, switch it on and off for container
                        slot.currentSprite.visible = false;
                        slot.currentSprite = null;
                        slot.currentSpriteName = undefined;

                        //TODO: refactor this shit
                        const transform = new PIXI.Transform();
                        (transform as any)._parentID = -1;
                        (transform as any)._worldID = (slotContainer.transform as any)._worldID;
                        slotContainer.transform = transform;
                    }
                    if (!slot.currentMeshId || slot.currentMeshId !== attachment.id) {
                        let meshId = attachment.id;
                        if (slot.currentMesh) {
                            slot.currentMesh.visible = false;
                        }

                        slot.meshes = slot.meshes || {};

                        if (slot.meshes[meshId] !== undefined) {
                            slot.meshes[meshId].visible = true;
                        }
                        else {
                            let mesh = this.createMesh(slot, attachment);
                            slotContainer.addChild(mesh);
                        }

                        slot.currentMesh = slot.meshes[meshId];
                        slot.currentMeshName = attachment.name;
                        slot.currentMeshId = meshId;
                    }
                    (attachment as core.VertexAttachment).computeWorldVerticesOld(slot, slot.currentMesh.vertices);
                    if (slot.currentMesh.color) {
                        // pixi-heaven
                        spriteColor = slot.currentMesh.color;
                    } else {
                        tempRgb[0] = light[0] * slot.color.r * attColor.r;
                        tempRgb[1] = light[1] * slot.color.g * attColor.g;
                        tempRgb[2] = light[2] * slot.color.b * attColor.b;
                        slot.currentMesh.tint = PIXI.utils.rgb2hex(tempRgb);
                    }
                    slot.currentMesh.blendMode = slot.blendMode;
                }
                else if (attachment instanceof core.ClippingAttachment) {
                    if (!slot.currentGraphics) {
                        this.createGraphics(slot, attachment);
                        slotContainer.addChild(slot.clippingContainer);
                        slotContainer.addChild(slot.currentGraphics);
                    }
                    this.updateGraphics(slot, attachment);
                }
                else {
                    slotContainer.visible = false;
                    continue;
                }
                slotContainer.visible = true;

                // pixi has double tint
                if (spriteColor) {
                    let r0 = slot.color.r * attColor.r;
                    let g0 = slot.color.g * attColor.g;
                    let b0 = slot.color.b * attColor.b;

                    //YAY! double-tint!
                    spriteColor.setLight(
                        light[0] * r0 + dark[0] * (1.0 - r0),
                        light[1] * g0 + dark[1] * (1.0 - g0),
                        light[2] * b0 + dark[2] * (1.0 - b0),
                    );
                    if (slot.darkColor) {
                        r0 = slot.darkColor.r;
                        g0 = slot.darkColor.g;
                        b0 = slot.darkColor.b;
                    } else {
                        r0 = 0.0;
                        g0 = 0.0;
                        b0 = 0.0;
                    }
                    spriteColor.setDark(
                        light[0] * r0 + dark[0] * (1 - r0),
                        light[1] * g0 + dark[1] * (1 - g0),
                        light[2] * b0 + dark[2] * (1 - b0),
                    );
                }

                slotContainer.alpha = slot.color.a;
            }

            //== this is clipping implementation ===
            //TODO: remove parent hacks when pixi masks allow it
            let drawOrder = this.skeleton.drawOrder;
            let clippingAttachment: core.ClippingAttachment = null;
            let clippingContainer: PIXI.Container = null;

            for (let i = 0, n = drawOrder.length; i < n; i++) {
                let slot = slots[drawOrder[i].data.index];
                let slotContainer = this.slotContainers[drawOrder[i].data.index];

                if (!clippingContainer) {
					//Adding null check as it is possible for slotContainer.parent to be null in the event of a spine being disposed off in its loop callback
                    if (slotContainer.parent !== null && slotContainer.parent !== this) {
                        slotContainer.parent.removeChild(slotContainer);
                        //silend add hack
                        (slotContainer as any).parent = this;
                    }
                }
                if (slot.currentGraphics && slot.getAttachment()) {
                    clippingContainer = slot.clippingContainer;
                    clippingAttachment = slot.getAttachment() as core.ClippingAttachment;
                    clippingContainer.children.length = 0;
                    this.children[i] = slotContainer;

                    if (clippingAttachment.endSlot == slot.data) {
                        clippingAttachment.endSlot = null;
                    }

                } else {
                    if (clippingContainer) {
                        let c = this.tempClipContainers[i];
                        if (!c) {
                            c = this.tempClipContainers[i] = this.newContainer();
                            c.visible = false;
                        }
                        this.children[i] = c;

                        //silent remove hack
                        (slotContainer as any).parent = null;
                        clippingContainer.addChild(slotContainer);
                        if (clippingAttachment.endSlot == slot.data) {
                            clippingContainer.renderable = true;
                            clippingContainer = null;
                            clippingAttachment = null;
                        }
                    } else {
                        this.children[i] = slotContainer;
                    }
                }
            }
        };

        private setSpriteRegion(attachment: core.RegionAttachment, sprite: SpineSprite, region: core.TextureRegion) {
            // prevent setters calling when attachment and region is same
            if(sprite.attachment === attachment && sprite.region === region) {
                return;
            }

            sprite.region = region;
            sprite.attachment = attachment;

            sprite.texture = region.texture;
            sprite.rotation = attachment.rotation * core.MathUtils.degRad;
            sprite.position.x = attachment.x;
            sprite.position.y = attachment.y;
            sprite.alpha = attachment.color.a;

            if (!region.size) {
                sprite.scale.x = attachment.scaleX * attachment.width / region.originalWidth;
                sprite.scale.y = -attachment.scaleY * attachment.height / region.originalHeight;
            } else {
                //hacked!
                sprite.scale.x = region.size.width / region.originalWidth;
                sprite.scale.y = -region.size.height / region.originalHeight;
            }
        }

        private setMeshRegion(attachment: core.MeshAttachment, mesh: SpineMesh, region: core.TextureRegion) {

            if(mesh.attachment === attachment && mesh.region === region) {
                return;
            }

            mesh.region = region;
            mesh.attachment = attachment;
            mesh.texture = region.texture;
            region.texture.updateUvs();
            mesh.uvBuffer.update(attachment.regionUVs);
        }

        protected lastTime: number;

        /**
         * When autoupdate is set to yes this function is used as pixi's updateTransform function
         *
         * @private
         */
        autoUpdateTransform() {
            if (Spine.globalAutoUpdate) {
                this.lastTime = this.lastTime || Date.now();
                let timeDelta = (Date.now() - this.lastTime) * 0.001;
                this.lastTime = Date.now();
                this.update(timeDelta);
            } else {
                this.lastTime = 0;
            }

            PIXI.Container.prototype.updateTransform.call(this);
        };

        /**
         * Create a new sprite to be used with core.RegionAttachment
         *
         * @param slot {spine.Slot} The slot to which the attachment is parented
         * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
         * @private
         */
        createSprite(slot: core.Slot, attachment: core.RegionAttachment, defName: string) {
            let region = attachment.region;
            if (slot.hackAttachment === attachment) {
                region = slot.hackRegion;
            }
            let texture = region.texture;
            let sprite = this.newSprite(texture);

            sprite.anchor.set(0.5);
            this.setSpriteRegion(attachment, sprite, attachment.region);

            slot.sprites = slot.sprites || {};
            slot.sprites[defName] = sprite;
            return sprite;
        };

        /**
         * Creates a Strip from the spine data
         * @param slot {spine.Slot} The slot to which the attachment is parented
         * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
         * @private
         */
        createMesh(slot: core.Slot, attachment: core.MeshAttachment) {
            let region = attachment.region;
            if (slot.hackAttachment === attachment) {
                region = slot.hackRegion;
                slot.hackAttachment = null;
                slot.hackRegion = null;
            }
            let strip = this.newMesh(
                region.texture,
                new Float32Array(attachment.regionUVs.length),
                attachment.regionUVs,
                new Uint16Array(attachment.triangles),
                PIXI.DRAW_MODES.TRIANGLES);

            if (typeof (strip as any)._canvasPadding !== "undefined") {
                (strip as any)._canvasPadding = 1.5;
            }

            strip.alpha = attachment.color.a;

            strip.region = attachment.region;
            this.setMeshRegion(attachment, strip, region);

            slot.meshes = slot.meshes || {};
            slot.meshes[attachment.id] = strip;
            return strip;
        };

        static clippingPolygon: Array<number> = [];

        createGraphics(slot: core.Slot, clip: core.ClippingAttachment) {
            let graphics = this.newGraphics();
            let poly = new PIXI.Polygon([]);
            graphics.clear();
            graphics.beginFill(0xffffff, 1);
            graphics.drawPolygon(poly as any);
            graphics.renderable = false;
            slot.currentGraphics = graphics;
            slot.clippingContainer = this.newContainer();
            slot.clippingContainer.mask = slot.currentGraphics;

            return graphics;
        }

        updateGraphics(slot: core.Slot, clip: core.ClippingAttachment) {
            let geom = slot.currentGraphics.geometry;
            let vertices = (geom.graphicsData[0].shape as PIXI.Polygon).points;
            let n = clip.worldVerticesLength;
            vertices.length = n;
            clip.computeWorldVertices(slot, 0, n, vertices, 0, 2);
            geom.invalidate();
        }

        /**
         * Changes texture in attachment in specific slot.
         *
         * PIXI runtime feature, it was made to satisfy our users.
         *
         * @param slotIndex {number}
         * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
         * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
         * @returns {boolean} Success flag
         */
        hackTextureBySlotIndex(slotIndex: number, texture: PIXI.Texture = null, size: PIXI.Rectangle = null) {
            let slot = this.skeleton.slots[slotIndex];
            if (!slot) {
                return false;
            }
            let attachment: any = slot.getAttachment();
            let region: core.TextureRegion = attachment.region;
            if (texture) {
                region = new core.TextureRegion();
                region.texture = texture;
                region.size = size;
                slot.hackRegion = region;
                slot.hackAttachment = attachment;
            } else {
                slot.hackRegion = null;
                slot.hackAttachment = null;
            }
            if (slot.currentSprite && slot.currentSprite.region != region) {
                this.setSpriteRegion(attachment, slot.currentSprite, region);
                slot.currentSprite.region = region;
            } else if (slot.currentMesh && slot.currentMesh.region != region) {
                this.setMeshRegion(attachment, slot.currentMesh, region);
            }
            return true;
        }

        /**
         * Changes texture in attachment in specific slot.
         *
         * PIXI runtime feature, it was made to satisfy our users.
         *
         * @param slotName {string}
         * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
         * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
         * @returns {boolean} Success flag
         */
        hackTextureBySlotName(slotName: string, texture: PIXI.Texture = null, size: PIXI.Rectangle = null) {
            let index = this.skeleton.findSlotIndex(slotName);
            if (index == -1) {
                return false;
            }
            return this.hackTextureBySlotIndex(index, texture, size);
        }

        /**
         * Changes texture of an attachment
         *
         * PIXI runtime feature, it was made to satisfy our users.
         *
         * @param slotName {string}
         * @param attachmentName {string}
         * @param [texture = null] {PIXI.Texture} If null, take default (original) texture
         * @param [size = null] {PIXI.Point} sometimes we need new size for region attachment, you can pass 'texture.orig' there
         * @returns {boolean} Success flag
         */
        hackTextureAttachment(slotName: string, attachmentName: string, texture, size: PIXI.Rectangle = null) {
            // changes the texture of an attachment at the skeleton level
            const slotIndex = this.skeleton.findSlotIndex(slotName)
            const attachment: any = this.skeleton.getAttachmentByName(slotName, attachmentName)
            attachment.region.texture = texture

            const slot = this.skeleton.slots[slotIndex]
            if (!slot) {
                return false
            }

            // gets the currently active attachment in this slot
            const currentAttachment: any = slot.getAttachment()
            if (attachmentName === currentAttachment.name) {
                // if the attachment we are changing is currently active, change the the live texture
                let region: core.TextureRegion = attachment.region
                if (texture) {
                    region = new core.TextureRegion()
                    region.texture = texture
                    region.size = size
                    slot.hackRegion = region
                    slot.hackAttachment = currentAttachment
                } else {
                    slot.hackRegion = null
                    slot.hackAttachment = null
                }
                if (slot.currentSprite && slot.currentSprite.region != region) {
                    this.setSpriteRegion(currentAttachment, slot.currentSprite, region)
                    slot.currentSprite.region = region
                } else if (slot.currentMesh && slot.currentMesh.region != region) {
                    this.setMeshRegion(currentAttachment, slot.currentMesh, region)
                }
                return true
            }
            return false
        }

        //those methods can be overriden to spawn different classes
        newContainer() {
            return new PIXI.Container();
        }

        newSprite(tex: PIXI.Texture) {
            return new SpineSprite(tex);
        }

        newGraphics() {
            return new PIXI.Graphics();
        }

        newMesh(texture: PIXI.Texture, vertices?: Float32Array, uvs?: Float32Array, indices?: Uint16Array, drawMode?: number) {
            return new SpineMesh(texture, vertices, uvs, indices, drawMode);
        }

        transformHack() {
            return 1;
        }

        /**
         * Hack for pixi-display and pixi-lights. Every attachment name ending with a suffix will be added to different layer
         * @param nameSuffix
         * @param group
         * @param outGroup
         */
        hackAttachmentGroups(nameSuffix: string, group: any, outGroup: any) {
            if (!nameSuffix) {
                return;
            }
            const list_d = [], list_n = [];
            for (let i = 0, len = this.skeleton.slots.length; i < len; i++) {
                const slot = this.skeleton.slots[i];
                const name = slot.currentSpriteName || slot.currentMeshName || "";
                const target = slot.currentSprite || slot.currentMesh;
                if(name.endsWith(nameSuffix)){
                    target.parentGroup = group;
                    list_n.push(target);
                }else if(outGroup && target){
                    target.parentGroup = outGroup;
                    list_d.push(target);
                }
            }
            return [list_d,list_n];
        };

        destroy(options?: any): void {
            for (let i = 0, n = this.skeleton.slots.length; i < n; i++) {
                let slot = this.skeleton.slots[i];
                for (let name in slot.meshes) {
                    slot.meshes[name].destroy(options);
                }
                slot.meshes = null;

                for (let name in slot.sprites) {
                    slot.sprites[name].destroy(options);
                }
                slot.sprites = null;
            }

            for (let i = 0, n = this.slotContainers.length; i < n; i++) {
                this.slotContainers[i].destroy(options);
            }
            this.spineData = null;
            this.skeleton = null;
            this.slotContainers = null;
            this.stateData = null;
            this.state = null;
            this.tempClipContainers = null;

            super.destroy(options);
        }
    }

    function SlotContainerUpdateTransformV3() {
        let pt = this.parent.worldTransform;
        let wt = this.worldTransform;
        let lt = this.localTransform;
        wt.a = lt.a * pt.a + lt.b * pt.c;
        wt.b = lt.a * pt.b + lt.b * pt.d;
        wt.c = lt.c * pt.a + lt.d * pt.c;
        wt.d = lt.c * pt.b + lt.d * pt.d;
        wt.tx = lt.tx * pt.a + lt.ty * pt.c + pt.tx;
        wt.ty = lt.tx * pt.b + lt.ty * pt.d + pt.ty;
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
        this._currentBounds = null;
    }
}
