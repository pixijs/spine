var spine = require('../SpineRuntime') || {};
spine.AttachmentType = require('./AttachmentType');
spine.SkeletonBounds = function ()
{
    this.polygonPool = [];
    this.polygons = [];
    this.boundingBoxes = [];
};
spine.SkeletonBounds.prototype = {
    minX: 0, minY: 0, maxX: 0, maxY: 0,
    update: function (skeleton, updateAabb)
    {
        var slots = skeleton.slots;
        var slotCount = slots.length;
        var x = skeleton.x, y = skeleton.y;
        var boundingBoxes = this.boundingBoxes;
        var polygonPool = this.polygonPool;
        var polygons = this.polygons;

        boundingBoxes.length = 0;
        for (var i = 0, n = polygons.length; i < n; i++)
            polygonPool.push(polygons[i]);
        polygons.length = 0;

        for (var i = 0; i < slotCount; i++)
        {
            var slot = slots[i];
            var boundingBox = slot.attachment;
            if (boundingBox.type != spine.AttachmentType.boundingbox) continue;
            boundingBoxes.push(boundingBox);

            var poolCount = polygonPool.length, polygon;
            if (poolCount > 0)
            {
                polygon = polygonPool[poolCount - 1];
                polygonPool.splice(poolCount - 1, 1);
            } else
                polygon = [];
            polygons.push(polygon);

            polygon.length = boundingBox.vertices.length;
            boundingBox.computeWorldVertices(x, y, slot.bone, polygon);
        }

        if (updateAabb) this.aabbCompute();
    },
    aabbCompute: function ()
    {
        var polygons = this.polygons;
        var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE;
        for (var i = 0, n = polygons.length; i < n; i++)
        {
            var vertices = polygons[i];
            for (var ii = 0, nn = vertices.length; ii < nn; ii += 2)
            {
                var x = vertices[ii];
                var y = vertices[ii + 1];
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    },
    /** Returns true if the axis aligned bounding box contains the point. */
    aabbContainsPoint: function (x, y)
    {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    },
    /** Returns true if the axis aligned bounding box intersects the line segment. */
    aabbIntersectsSegment: function (x1, y1, x2, y2)
    {
        var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;
        if ((x1 <= minX && x2 <= minX) || (y1 <= minY && y2 <= minY) || (x1 >= maxX && x2 >= maxX) || (y1 >= maxY && y2 >= maxY))
            return false;
        var m = (y2 - y1) / (x2 - x1);
        var y = m * (minX - x1) + y1;
        if (y > minY && y < maxY) return true;
        y = m * (maxX - x1) + y1;
        if (y > minY && y < maxY) return true;
        var x = (minY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        x = (maxY - y1) / m + x1;
        if (x > minX && x < maxX) return true;
        return false;
    },
    /** Returns true if the axis aligned bounding box intersects the axis aligned bounding box of the specified bounds. */
    aabbIntersectsSkeleton: function (bounds)
    {
        return this.minX < bounds.maxX && this.maxX > bounds.minX && this.minY < bounds.maxY && this.maxY > bounds.minY;
    },
    /** Returns the first bounding box attachment that contains the point, or null. When doing many checks, it is usually more
     * efficient to only call this method if {@link #aabbContainsPoint(float, float)} returns true. */
    containsPoint: function (x, y)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (this.polygonContainsPoint(polygons[i], x, y)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns the first bounding box attachment that contains the line segment, or null. When doing many checks, it is usually
     * more efficient to only call this method if {@link #aabbIntersectsSegment(float, float, float, float)} returns true. */
    intersectsSegment: function (x1, y1, x2, y2)
    {
        var polygons = this.polygons;
        for (var i = 0, n = polygons.length; i < n; i++)
            if (polygons[i].intersectsSegment(x1, y1, x2, y2)) return this.boundingBoxes[i];
        return null;
    },
    /** Returns true if the polygon contains the point. */
    polygonContainsPoint: function (polygon, x, y)
    {
        var nn = polygon.length;
        var prevIndex = nn - 2;
        var inside = false;
        for (var ii = 0; ii < nn; ii += 2)
        {
            var vertexY = polygon[ii + 1];
            var prevY = polygon[prevIndex + 1];
            if ((vertexY < y && prevY >= y) || (prevY < y && vertexY >= y))
            {
                var vertexX = polygon[ii];
                if (vertexX + (y - vertexY) / (prevY - vertexY) * (polygon[prevIndex] - vertexX) < x) inside = !inside;
            }
            prevIndex = ii;
        }
        return inside;
    },
    /** Returns true if the polygon contains the line segment. */
    polygonIntersectsSegment: function (polygon, x1, y1, x2, y2)
    {
        var nn = polygon.length;
        var width12 = x1 - x2, height12 = y1 - y2;
        var det1 = x1 * y2 - y1 * x2;
        var x3 = polygon[nn - 2], y3 = polygon[nn - 1];
        for (var ii = 0; ii < nn; ii += 2)
        {
            var x4 = polygon[ii], y4 = polygon[ii + 1];
            var det2 = x3 * y4 - y3 * x4;
            var width34 = x3 - x4, height34 = y3 - y4;
            var det3 = width12 * height34 - height12 * width34;
            var x = (det1 * width34 - width12 * det2) / det3;
            if (((x >= x3 && x <= x4) || (x >= x4 && x <= x3)) && ((x >= x1 && x <= x2) || (x >= x2 && x <= x1)))
            {
                var y = (det1 * height34 - height12 * det2) / det3;
                if (((y >= y3 && y <= y4) || (y >= y4 && y <= y3)) && ((y >= y1 && y <= y2) || (y >= y2 && y <= y1))) return true;
            }
            x3 = x4;
            y3 = y4;
        }
        return false;
    },
    getPolygon: function (attachment)
    {
        var index = this.boundingBoxes.indexOf(attachment);
        return index == -1 ? null : this.polygons[index];
    },
    getWidth: function ()
    {
        return this.maxX - this.minX;
    },
    getHeight: function ()
    {
        return this.maxY - this.minY;
    }
};
module.exports = spine.SkeletonBounds;

