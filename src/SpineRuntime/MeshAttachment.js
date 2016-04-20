var spine = require('../SpineUtil') || {};
spine.AttachmentType = require('./AttachmentType');
spine.MeshAttachment = function (name)
{
    this.name = name;
};
spine.MeshAttachment.prototype = {
    type: spine.AttachmentType.mesh,
    parentMesh: null,
    inheritFFD: false,
    vertices: null,
    uvs: null,
    regionUVs: null,
    triangles: null,
    hullLength: 0,
    r: 1, g: 1, b: 1, a: 1,
    path: null,
    rendererObject: null,
    edges: null,
    width: 0, height: 0,
    updateUVs: function ()
    {
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
        var bone = slot.bone;
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.matrix.a, m01 = bone.matrix.c, m10 = bone.matrix.b, m11 = bone.matrix.d;
        var vertices = this.vertices;
        var verticesCount = vertices.length;
        if (slot.attachmentVertices.length == verticesCount) vertices = slot.attachmentVertices;
        for (var i = 0; i < verticesCount; i += 2)
        {
            var vx = vertices[i];
            var vy = vertices[i + 1];
            worldVertices[i] = vx * m00 + vy * m01 + x;
            worldVertices[i + 1] = vx * m10 + vy * m11 + y;
        }
    },
    applyFFD: function(sourceAttachment) {
        return this === sourceAttachment || (this.inheritFFD && parentMesh === sourceAttachment);
    },
    setParentMesh: function(parentMesh) {
        this.parentMesh = parentMesh;
        if (parentMesh != null) {
            this.vertices = parentMesh.vertices;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
        }
    }
};
module.exports = spine.MeshAttachment;

