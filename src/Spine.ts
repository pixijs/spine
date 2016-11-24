/// <reference types="pixi.js" />

module PIXI.spine {
    /* Esoteric Software SPINE wrapper for pixi.js */
    core.Bone.yDown = true;

    let tempRgb = [0, 0, 0];

    export class SpineSprite extends PIXI.Sprite {
        region: core.TextureRegion;

        constructor(tex: PIXI.Texture) {
            super(tex);
        }
    }

    export class SpineMesh extends PIXI.mesh.Mesh {
        region: core.TextureRegion;

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
     * var spineAnimation = new PIXI.Spine(spineData);
     * ```
     *
     * @class
     * @extends Container
     * @memberof PIXI.spine
     * @param spineData {object} The spine data loaded from a spine atlas.
     */
    export class Spine extends PIXI.Container {
        static globalAutoUpdate: boolean = true;

        tintRgb: ArrayLike<number>;
        spineData: core.SkeletonData;
        skeleton: core.Skeleton;
        stateData: core.AnimationStateData;
        state: core.AnimationState;
        slotContainers: Array<PIXI.Container>;

        constructor(spineData: core.SkeletonData) {
            super();

            if (!spineData) {
                throw new Error('The spineData param is required.');
            }

            if ((typeof spineData) === "string") {
                throw new Error('spineData param cant be string. Please use PIXI.spine.Spine.fromAtlas("YOUR_RESOURCE_NAME") from now on.');
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

            for (var i = 0, n = this.skeleton.slots.length; i < n; i++) {
                var slot = this.skeleton.slots[i];
                var attachment: any = slot.attachment;
                var slotContainer = new PIXI.Container();
                this.slotContainers.push(slotContainer);
                this.addChild(slotContainer);

                if (attachment instanceof core.RegionAttachment) {
                    var spriteName = (attachment.region as core.TextureAtlasRegion).name;
                    var sprite = this.createSprite(slot, attachment, spriteName);
                    slot.currentSprite = sprite;
                    slot.currentSpriteName = spriteName;
                    slotContainer.addChild(sprite);
                }
                else if (attachment instanceof core.MeshAttachment) {
                    var mesh = this.createMesh(slot, attachment);
                    slot.currentMesh = mesh;
                    slot.currentMeshName = attachment.name;
                    slotContainer.addChild(mesh);
                }
                else {
                    continue;
                }

            }

            /**
             * Should the Spine object update its transforms
             *
             * @member {boolean}
             */
            this.autoUpdate = true;

            /**
             * The tint applied to all spine slots. This is a [r,g,b] value. A value of [1,1,1] will remove any tint effect.
             *
             * @member {number}
             * @memberof PIXI.spine.Spine#
             */
            this.tintRgb = new Float32Array([1, 1, 1]);
        }

        /**
         * If this flag is set to true, the spine animation will be autoupdated every time
         * the object id drawn. The down side of this approach is that the delta time is
         * automatically calculated and you could miss out on cool effects like slow motion,
         * pause, skip ahead and the sorts. Most of these effects can be achieved even with
         * autoupdate enabled but are harder to achieve.
         *
         * @member {boolean}
         * @memberof PIXI.spine.Spine#
         * @default true
         */
        get autoUpdate(): boolean {
            return (this.updateTransform === Spine.prototype.autoUpdateTransform);
        }

        set autoUpdate(value: boolean) {
            this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
        }

        /**
         * The tint applied to the spine object. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
         *
         * @member {number}
         * @memberof PIXI.spine.Spine#
         * @default 0xFFFFFF
         */
        get tint(): number {
            return PIXI.utils.rgb2hex(this.tintRgb as any);
        }

        set tint(value: number) {
            this.tintRgb = PIXI.utils.hex2rgb(value, this.tintRgb as any);
        }

        /**
         * Update the spine skeleton and its animations by delta time (dt)
         *
         * @param dt {number} Delta time. Time by which the animation should be updated
         */
        update(dt: number) {
            this.state.update(dt);
            this.state.apply(this.skeleton);
            this.skeleton.updateWorldTransform();

            let drawOrder = this.skeleton.drawOrder;
            let slots = this.skeleton.slots;

            for (var i = 0, n = drawOrder.length; i < n; i++) {
                this.children[i] = this.slotContainers[drawOrder[i].data.index];
            }

            var r0 = this.tintRgb[0];
            var g0 = this.tintRgb[1];
            var b0 = this.tintRgb[2];

            for (i = 0, n = slots.length; i < n; i++) {
                var slot = slots[i];
                var attachment = slot.attachment;
                var slotContainer = this.slotContainers[i];

                if (!attachment) {
                    slotContainer.visible = false;
                    continue;
                }

                var attColor = (attachment as any).color;
                if (attachment instanceof core.RegionAttachment) {
                    let region = (attachment as core.RegionAttachment).region;
                    if (region) {
                        if (slot.currentMesh) {
                            slot.currentMesh.visible = false;
                            slot.currentMesh = null;
                            slot.currentMeshName = undefined;
                        }
                        let ar = region as core.TextureAtlasRegion;
                        if (!slot.currentSpriteName || slot.currentSpriteName !== ar.name) {
                            var spriteName = ar.name;
                            if (slot.currentSprite) {
                                slot.currentSprite.visible = false;
                            }
                            slot.sprites = slot.sprites || {};
                            if (slot.sprites[spriteName] !== undefined) {
                                slot.sprites[spriteName].visible = true;
                            }
                            else {
                                var sprite = this.createSprite(slot, attachment, spriteName);
                                slotContainer.addChild(sprite);
                            }
                            slot.currentSprite = slot.sprites[spriteName];
                            slot.currentSpriteName = spriteName;
                        }
                    }

                    if (slotContainer.transform) {
                        //TODO: refactor this thing, switch it on and off for container
                        let transform = slotContainer.transform;
                        let transAny : any  = transform;
                        let lt: PIXI.Matrix;
                        if (transAny.matrix2d) {
                            //gameofbombs pixi fork, sorry for that, we really use it :)
                            lt = transAny.matrix2d;
                            transAny._dirtyVersion++;
                            transAny.version = transAny._dirtyVersion;
                            transAny.isStatic = true;
                            transAny.operMode = 0;
                        } else {
                            if (transAny.position) {
                                transform = new PIXI.TransformBase();
                                slotContainer.transform = transform;
                            }
                            lt = transform.localTransform;
                        }
                        slot.bone.matrix.copy(lt);
                    } else {
                        //PIXI v3
                        var lt = slotContainer.localTransform || new PIXI.Matrix();
                        slot.bone.matrix.copy(lt);
                        slotContainer.localTransform = lt;
                        (slotContainer as any).displayObjectUpdateTransform = SlotContainerUpdateTransformV3;
                    }
                    tempRgb[0] = r0 * slot.color.r * attColor.r;
                    tempRgb[1] = g0 * slot.color.g * attColor.g;
                    tempRgb[2] = b0 * slot.color.b * attColor.b;
                    slot.currentSprite.tint = PIXI.utils.rgb2hex(tempRgb);
                    slot.currentSprite.blendMode = slot.blendMode;
                }
                else if (attachment instanceof core.MeshAttachment) {
                    if (slot.currentSprite) {
                        //TODO: refactor this thing, switch it on and off for container
                        slot.currentSprite.visible = false;
                        slot.currentSprite = null;
                        slot.currentSpriteName = undefined;

                        if (slotContainer.transform) {
                            slotContainer.transform = new PIXI.TransformStatic();
                        }
                        else {
                            slotContainer.localTransform = new PIXI.Matrix();
                            (slotContainer as any).displayObjectUpdateTransform = PIXI.DisplayObject.prototype.updateTransform;
                        }
                    }
                    if (!slot.currentMeshName || slot.currentMeshName !== attachment.name) {
                        var meshName = attachment.name;
                        if (slot.currentMesh) {
                            slot.currentMesh.visible = false;
                        }

                        slot.meshes = slot.meshes || {};

                        if (slot.meshes[meshName] !== undefined) {
                            slot.meshes[meshName].visible = true;
                        }
                        else {
                            var mesh = this.createMesh(slot, attachment);
                            slotContainer.addChild(mesh);
                        }

                        slot.currentMesh = slot.meshes[meshName];
                        slot.currentMeshName = meshName;
                    }
                    (attachment as core.VertexAttachment).computeWorldVertices(slot, slot.currentMesh.vertices);
                    if (PIXI.VERSION[0] !== '3') {
                        // PIXI version 4
                        // slot.currentMesh.dirty++;
                        //only for PIXI v4
                        var tintRgb = slot.currentMesh.tintRgb;
                        tintRgb[0] = r0 * slot.color.r * attColor.r;
                        tintRgb[1] = g0 * slot.color.g * attColor.g;
                        tintRgb[2] = b0 * slot.color.b * attColor.b;
                    }
                    slot.currentMesh.blendMode = slot.blendMode;
                }
                else {
                    slotContainer.visible = false;
                    continue;
                }
                slotContainer.visible = true;

                slotContainer.alpha = slot.color.a;
            }
        };

        private setSpriteRegion(attachment: core.RegionAttachment, sprite: SpineSprite, region: core.TextureRegion) {
            sprite.region = region;
            sprite.texture = region.texture;
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
            mesh.region = region;
            mesh.texture = region.texture;
            attachment.updateUVs(region, mesh.uvs);
            // if (PIXI.VERSION[0] !== '3') {
            // PIXI version 4
            // mesh.indexDirty++;
            // } else {
            // PIXI version 3
            mesh.dirty++;
            // }
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
                var timeDelta = (Date.now() - this.lastTime) * 0.001;
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
            if (slot.tempAttachment === attachment) {
                region = slot.tempRegion;
                slot.tempAttachment = null;
                slot.tempRegion = null;
            }
            var texture = region.texture;
            var sprite = new SpineSprite(texture);
            sprite.rotation = attachment.rotation * core.MathUtils.degRad;
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;
            sprite.position.x = attachment.x;
            sprite.position.y = attachment.y;
            sprite.alpha = attachment.color.a;

            sprite.region = attachment.region;
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
            if (slot.tempAttachment === attachment) {
                region = slot.tempRegion;
                slot.tempAttachment = null;
                slot.tempRegion = null;
            }
            let strip = new SpineMesh(
                region.texture,
                new Float32Array(attachment.regionUVs.length),
                new Float32Array(attachment.regionUVs.length),
                new Uint16Array(attachment.triangles),
                PIXI.mesh.Mesh.DRAW_MODES.TRIANGLES);

            strip.canvasPadding = 1.5;

            strip.alpha = attachment.color.a;

            strip.region = attachment.region;
            this.setMeshRegion(attachment, strip, region);

            slot.meshes = slot.meshes || {};
            slot.meshes[attachment.name] = strip;
            return strip;
        };

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
            var slot = this.skeleton.slots[slotIndex];
            if (!slot) {
                return false;
            }
            var attachment: any = slot.attachment;
            var region: core.TextureRegion = attachment.region;
            if (texture) {
                region = new core.TextureRegion();
                region.texture = texture;
                region.size = size;
            }
            if (slot.currentSprite && slot.currentSprite.region != region) {
                this.setSpriteRegion(attachment, slot.currentSprite, region);
                slot.currentSprite.region = region;
            } else if (slot.currentMesh && slot.currentMesh.region != region) {
                this.setMeshRegion(attachment, slot.currentMesh, region);
            } else {
                slot.tempRegion = region;
                slot.tempAttachment = attachment;
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
        hackTextureBySlotName = function (slotName: String, texture: PIXI.Texture = null, size: PIXI.Rectangle = null) {
            var index = this.skeleton.findSlotIndex(slotName);
            if (index == -1) {
                return false;
            }
            return this.hackTextureBySlotIndex(index, texture, size);
        }
    }

    function SlotContainerUpdateTransformV3() {
        var pt = this.parent.worldTransform;
        var wt = this.worldTransform;
        var lt = this.localTransform;
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
