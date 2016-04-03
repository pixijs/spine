var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkinnedMeshAttachment = function (name)
{
    this.name = name;
};
spine.SkinnedMeshAttachment.prototype = {
    type: spine.AttachmentType.skinnedmesh,
    bones: null,
    weights: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    regionU: 0, regionV: 0, regionU2: 0, regionV2: 0, regionRotate: false,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    edges: null,
    width: 0, height: 0,
    updateUVs: function (u, v, u2, v2, rotate)
    {
        var width = this.regionU2 - this.regionU, height = this.regionV2 - this.regionV;
        var n = this.regionUVs.length;
        if (!this.uvs || this.uvs.length != n)
        {
            this.uvs = new spine.Float32Array(n);
        }
        if (this.regionRotate)
        {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i + 1] * width;
                this.uvs[i + 1] = this.regionV + height - this.regionUVs[i] * height;
            }
        } else {
            for (var i = 0; i < n; i += 2)
            {
                this.uvs[i] = this.regionU + this.regionUVs[i] * width;
                this.uvs[i + 1] = this.regionV + this.regionUVs[i + 1] * height;
            }
        }
    },
    computeWorldVertices: function (x, y, slot, worldVertices)
    {
        var skeletonBones = slot.bone.skeleton.bones;
        var weights = this.weights;
        var bones = this.bones;

        var w = 0, v = 0, b = 0, f = 0, n = bones.length, nn;
        var wx, wy, vx, vy, weight;
        var m;
        if (!slot.attachmentVertices.length)
        {
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3)
                {
                    m = skeletonBones[bones[v]].matrix;
                    vx = weights[b];
                    vy = weights[b + 1];
                    weight = weights[b + 2];
                    wx += (vx * m.a + vy * m.c + m.tx) * weight;
                    wy += (vx * m.b + vy * m.d + m.ty) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        } else {
            var ffd = slot.attachmentVertices;
            for (; v < n; w += 2)
            {
                wx = 0;
                wy = 0;
                nn = bones[v++] + v;
                for (; v < nn; v++, b += 3, f += 2)
                {
                    m = skeletonBones[bones[v]].matrix;
                    vx = weights[b] + ffd[f];
                    vy = weights[b + 1] + ffd[f + 1];
                    weight = weights[b + 2];
                    wx += (vx * m.a + vy * m.c + m.tx) * weight;
                    wy += (vx * m.b + vy * m.d + m.ty) * weight;
                }
                worldVertices[w] = wx + x;
                worldVertices[w + 1] = wy + y;
            }
        }
    }
};
module.exports = spine.SkinnedMeshAttachment;

