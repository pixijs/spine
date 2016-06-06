var spine = require('../SpineRuntime');
var atlasParser = require('../loaders/atlasParser');

/* Esoteric Software SPINE wrapper for pixi.js */
spine.Bone.yDown = true;

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
function Spine(spineData)
{
    PIXI.Container.call(this);

    if (!spineData)
    {
        throw new Error('The spineData param is required.');
    }

    if ((typeof spineData) === "string")
    {
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
    this.skeleton = new spine.Skeleton(spineData);
    this.skeleton.updateWorldTransform();

    /**
     * A spine AnimationStateData object created from the spine data passed in the constructor
     *
     * @member {object}
     */
    this.stateData = new spine.AnimationStateData(spineData);

    /**
     * A spine AnimationState object created from the spine AnimationStateData object
     *
     * @member {object}
     */
    this.state = new spine.AnimationState(this.stateData);

    /**
     * An array of containers
     *
     * @member {Container[]}
     */
    this.slotContainers = [];

    for (var i = 0, n = this.skeleton.slots.length; i < n; i++)
    {
        var slot = this.skeleton.slots[i];
        var attachment = slot.attachment;
        var slotContainer = new PIXI.Container();
        this.slotContainers.push(slotContainer);
        this.addChild(slotContainer);

        if (attachment instanceof spine.RegionAttachment)
        {
            var spriteName = attachment.rendererObject.name;
            var sprite = this.createSprite(slot, attachment);
            slot.currentSprite = sprite;
            slot.currentSpriteName = spriteName;
            slotContainer.addChild(sprite);
        }
        else if (attachment instanceof spine.MeshAttachment)
        {
            var mesh = this.createMesh(slot, attachment);
            slot.currentMesh = mesh;
            slot.currentMeshName = attachment.name;
            slotContainer.addChild(mesh);
        }
        else
        {
            continue;
        }

    }

    /**
     * Should the Spine object update its transforms
     *
     * @member {boolean}
     */
    this.autoUpdate = true;
}

Spine.fromAtlas = function(resourceName) {
    var skeletonData = atlasParser.AnimCache[resourceName];

    if (!skeletonData)
    {
        throw new Error('Spine data "' + resourceName + '" does not exist in the animation cache');
    }

    return new Spine(skeletonData);
}

Spine.prototype = Object.create(PIXI.Container.prototype);
Spine.prototype.constructor = Spine;
module.exports = Spine;

Spine.globalAutoUpdate = true;

Object.defineProperties(Spine.prototype, {
    /**
     * If this flag is set to true, the spine animation will be autoupdated every time
     * the object id drawn. The down side of this approach is that the delta time is
     * automatically calculated and you could miss out on cool effects like slow motion,
     * pause, skip ahead and the sorts. Most of these effects can be achieved even with
     * autoupdate enabled but are harder to achieve.
     *
     * @member {boolean}
     * @memberof Spine#
     * @default true
     */
    autoUpdate: {
        get: function ()
        {
            return (this.updateTransform === Spine.prototype.autoUpdateTransform);
        },

        set: function (value)
        {
            this.updateTransform = value ? Spine.prototype.autoUpdateTransform : PIXI.Container.prototype.updateTransform;
        }
    }
});

/**
 * Update the spine skeleton and its animations by delta time (dt)
 *
 * @param dt {number} Delta time. Time by which the animation should be updated
 */
Spine.prototype.update = function (dt)
{
    this.state.update(dt);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    var drawOrder = this.skeleton.drawOrder;
    var slots = this.skeleton.slots;

    for (var i = 0, n = drawOrder.length; i < n; i++)
    {
        this.children[i] = this.slotContainers[drawOrder[i]];
    }

    for (i = 0, n = slots.length; i < n; i++)
    {
        var slot = slots[i];
        var attachment = slot.attachment;
        var slotContainer = this.slotContainers[i];

        if (!attachment)
        {
            slotContainer.visible = false;
            continue;
        }

        var type = attachment.type;
        if (type === spine.AttachmentType.region)
        {
            if (attachment.rendererObject)
            {
                if (!slot.currentSpriteName || slot.currentSpriteName !== attachment.rendererObject.name)
                {
                    var spriteName = attachment.rendererObject.name;
                    if (slot.currentSprite !== undefined)
                    {
                        slot.currentSprite.visible = false;
                    }
                    slot.sprites = slot.sprites || {};
                    if (slot.sprites[spriteName] !== undefined)
                    {
                        slot.sprites[spriteName].visible = true;
                    }
                    else
                    {
                        var sprite = this.createSprite(slot, attachment);
                        slotContainer.addChild(sprite);
                    }
                    slot.currentSprite = slot.sprites[spriteName];
                    slot.currentSpriteName = spriteName;
                }
            }

            if (slotContainer.transform ) {
                var transform = slotContainer.transform;
                //PIXI v4.1
                var lt;
                if (slotContainer.transform.matrix2d) {
                    lt = transform.matrix2d;
                    transform._dirtyVersion++;
                    transform.version = transform._dirtyVersion;
                    transform.isStatic = true;
                    transform.operMode = 0;
                } else {
                //PIXI v4.0
                    if (!transform._dirtyLocal) {
                        transform = new PIXI.TransformStatic();
                        slotContainer.transform = transform;
                    }
                    lt = transform.localTransform;
                    transform._dirtyParentVersion = -1;
                    transform._dirtyLocal = 1;
                    transform._versionLocal = 1;
                }
                slot.bone.matrix.copy(lt);
                lt.tx += slot.bone.skeleton.x;
                lt.ty += slot.bone.skeleton.y;
            } else {
                //PIXI v3
                var lt = slotContainer.localTransform || new PIXI.Matrix();
                slot.bone.matrix.copy(lt);
                lt.tx += slot.bone.skeleton.x;
                lt.ty += slot.bone.skeleton.y;
                slotContainer.localTransform = lt;
                slotContainer.displayObjectUpdateTransform = SlotContainerUpdateTransformV3;
            }

            slot.currentSprite.blendMode = slot.blendMode;
            slot.currentSprite.tint = PIXI.utils.rgb2hex([slot.r * attachment.r, slot.g * attachment.g, slot.b * attachment.b]);
        }
        else if (type === spine.AttachmentType.skinnedmesh || type === spine.AttachmentType.mesh)
        {
            if (!slot.currentMeshName || slot.currentMeshName !== attachment.name)
            {
                var meshName = attachment.name;
                if (slot.currentMesh !== undefined)
                {
                    slot.currentMesh.visible = false;
                }

                slot.meshes = slot.meshes || {};

                if (slot.meshes[meshName] !== undefined)
                {
                    slot.meshes[meshName].visible = true;
                }
                else
                {
                    var mesh = this.createMesh(slot, attachment);
                    slotContainer.addChild(mesh);
                }

                slot.currentMesh = slot.meshes[meshName];
                slot.currentMeshName = meshName;
            }
            attachment.computeWorldVertices(slot.bone.skeleton.x, slot.bone.skeleton.y, slot, slot.currentMesh.vertices);
        }
        else
        {
            slotContainer.visible = false;
            continue;
        }
        slotContainer.visible = true;

        slotContainer.alpha = slot.a;
    }
};

/**
 * When autoupdate is set to yes this function is used as pixi's updateTransform function
 *
 * @private
 */
Spine.prototype.autoUpdateTransform = function ()
{
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
 * Create a new sprite to be used with spine.RegionAttachment
 *
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createSprite = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var texture = descriptor.texture;
    var sprite = new PIXI.Sprite(texture);
    sprite.scale.x = attachment.scaleX * attachment.width / descriptor.originalWidth;
    sprite.scale.y = - attachment.scaleY * attachment.height / descriptor.originalHeight;
    sprite.rotation = attachment.rotation * spine.degRad;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.position.x = attachment.x;
    sprite.position.y = attachment.y;
    sprite.alpha = attachment.a;

    slot.sprites = slot.sprites || {};
    slot.sprites[descriptor.name] = sprite;
    return sprite;
};

/**
 * Creates a Strip from the spine data
 * @param slot {spine.Slot} The slot to which the attachment is parented
 * @param attachment {spine.RegionAttachment} The attachment that the sprite will represent
 * @private
 */
Spine.prototype.createMesh = function (slot, attachment)
{
    var descriptor = attachment.rendererObject;
    var baseTexture = descriptor.page.rendererObject;
    var texture = new PIXI.Texture(baseTexture);

    var strip = new PIXI.mesh.Mesh(
        texture,
        new Float32Array(attachment.uvs.length),
        new Float32Array(attachment.uvs),
        new Uint16Array(attachment.triangles),
        PIXI.mesh.Mesh.DRAW_MODES.TRIANGLES);

    strip.canvasPadding = 1.5;

    strip.alpha = attachment.a;

    slot.meshes = slot.meshes || {};
    slot.meshes[attachment.name] = strip;

    return strip;
};

function SlotContainerUpdateTransformV3()
{
    var pt = this.parent.worldTransform;
    var wt = this.worldTransform;
    var lt = this.localTransform;
    wt.a  = lt.a  * pt.a + lt.b  * pt.c;
    wt.b  = lt.a  * pt.b + lt.b  * pt.d;
    wt.c  = lt.c  * pt.a + lt.d  * pt.c;
    wt.d  = lt.c  * pt.b + lt.d  * pt.d;
    wt.tx = lt.tx * pt.a + lt.ty * pt.c + pt.tx;
    wt.ty = lt.tx * pt.b + lt.ty * pt.d + pt.ty;
    this.worldAlpha = this.alpha * this.parent.worldAlpha;
    this._currentBounds = null;
};
