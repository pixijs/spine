var spine = require('../SpineRuntime') || {};
spine.Bone = function (boneData, skeleton, parent)
{
    this.data = boneData;
    this.skeleton = skeleton;
    this.parent = parent;
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0, rotationIK: 0,
    scaleX: 1, scaleY: 1,
    flipX: false, flipY: false,
    m00: 0, m01: 0, worldX: 0, // a b x
    m10: 0, m11: 0, worldY: 0, // c d y
    worldRotation: 0,
    worldScaleX: 1, worldScaleY: 1,
    worldFlipX: false, worldFlipY: false,
    updateWorldTransform: function ()
    {
        var parent = this.parent;
        if (parent)
        {
            this.worldX = this.x * parent.m00 + this.y * parent.m01 + parent.worldX;
            this.worldY = this.x * parent.m10 + this.y * parent.m11 + parent.worldY;
            if (this.data.inheritScale)
            {
                this.worldScaleX = parent.worldScaleX * this.scaleX;
                this.worldScaleY = parent.worldScaleY * this.scaleY;
            } else {
                this.worldScaleX = this.scaleX;
                this.worldScaleY = this.scaleY;
            }
            this.worldRotation = this.data.inheritRotation ? (parent.worldRotation + this.rotationIK) : this.rotationIK;
            this.worldFlipX = parent.worldFlipX != this.flipX;
            this.worldFlipY = parent.worldFlipY != this.flipY;
        } else {
            var skeletonFlipX = this.skeleton.flipX, skeletonFlipY = this.skeleton.flipY;
            this.worldX = skeletonFlipX ? -this.x : this.x;
            this.worldY = (skeletonFlipY != spine.Bone.yDown) ? -this.y : this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotationIK;
            this.worldFlipX = skeletonFlipX != this.flipX;
            this.worldFlipY = skeletonFlipY != this.flipY;
        }
        var radians = this.worldRotation * spine.degRad;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        if (this.worldFlipX)
        {
            this.m00 = -cos * this.worldScaleX;
            this.m01 = sin * this.worldScaleY;
        } else {
            this.m00 = cos * this.worldScaleX;
            this.m01 = -sin * this.worldScaleY;
        }
        if (this.worldFlipY != spine.Bone.yDown)
        {
            this.m10 = -sin * this.worldScaleX;
            this.m11 = -cos * this.worldScaleY;
        } else {
            this.m10 = sin * this.worldScaleX;
            this.m11 = cos * this.worldScaleY;
        }
    },
    setToSetupPose: function ()
    {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.rotationIK = this.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.flipX = data.flipX;
        this.flipY = data.flipY;
    },
    worldToLocal: function (world)
    {
        var dx = world[0] - this.worldX, dy = world[1] - this.worldY;
        var m00 = this.m00, m10 = this.m10, m01 = this.m01, m11 = this.m11;
        if (this.worldFlipX != (this.worldFlipY != spine.Bone.yDown))
        {
            m00 = -m00;
            m11 = -m11;
        }
        var invDet = 1 / (m00 * m11 - m01 * m10);
        world[0] = dx * m00 * invDet - dy * m01 * invDet;
        world[1] = dy * m11 * invDet - dx * m10 * invDet;
    },
    localToWorld: function (local)
    {
        var localX = local[0], localY = local[1];
        local[0] = localX * this.m00 + localY * this.m01 + this.worldX;
        local[1] = localX * this.m10 + localY * this.m11 + this.worldY;
    }
};
module.exports = spine.Bone;
