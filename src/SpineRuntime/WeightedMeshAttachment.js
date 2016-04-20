var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.WeightedMeshAttachment = function (name)
{
    this.name = name;
};
spine.WeightedMeshAttachment.prototype = {
    type: spine.AttachmentType.weightedmesh,
    parentMesh: null,
    inheritFFD: false,
    bones: null,
    weights: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
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
        var region = this.rendererObject;
        if (!region) return;
        var texture = region.texture;
        var r = texture._uvs;
        var w1 = region.width, h1 = region.height, w2 = region.originalWidth, h2 = region.originalHeight;
        var x = region.offsetX, y = region.pixiOffsetY;
        for (var i = 0; i < n; i += 2)
        {
            var u = this.regionUVs[i], v = this.regionUVs[i+1];
            u = (u * w2 - x) / w1;
            v = (v * h2 - y) / h1;
            this.uvs[i] = (r.x0 * (1 - u) + r.x1 * u) * (1-v) + (r.x3 * (1 - u) + r.x2 * u) * v;
            this.uvs[i+1] = (r.y0 * (1 - u) + r.y1 * u) * (1-v) + (r.y3 * (1 - u) + r.y2 * u) * v;
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
    },
    applyFFD: function(sourceAttachment) {
        return this === sourceAttachment || (this.inheritFFD && parentMesh === sourceAttachment);
    },
    setParentMesh: function(parentMesh) {
        this.parentMesh = parentMesh;
        if (parentMesh != null) {
            this.bones = parentMesh.bones;
            this.weights = parentMesh.weights;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
        }
    }
};
module.exports = spine.WeightedMeshAttachment;

