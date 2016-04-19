var spine = require('../SpineUtil');
spine.RegionAttachment = require('./RegionAttachment');
spine.MeshAttachment = require('./MeshAttachment');
spine.WeightedMeshAttachment = require('./WeightedMeshAttachment');
spine.BoundingBoxAttachment = require('./BoundingBoxAttachment');
spine.AtlasAttachmentParser = function (atlas)
{
    this.atlas = atlas;
};
spine.AtlasAttachmentParser.prototype = {
    newRegionAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (region attachment: " + name + ")";
        var attachment = new spine.RegionAttachment(name);
        attachment.rendererObject = region;
        attachment.setUVs(region.u, region.v, region.u2, region.v2, region.rotate);
        attachment.regionOffsetX = region.offsetX;
        attachment.regionOffsetY = region.offsetY;
        attachment.regionWidth = region.width;
        attachment.regionHeight = region.height;
        attachment.regionOriginalWidth = region.originalWidth;
        attachment.regionOriginalHeight = region.originalHeight;
        return attachment;
    },
    newMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (mesh attachment: " + name + ")";
        var attachment = new spine.MeshAttachment(name);
        attachment.rendererObject = region;
        return attachment;
    },
    newWeightedMeshAttachment: function (skin, name, path)
    {
        var region = this.atlas.findRegion(path);
        if (!region) throw "Region not found in atlas: " + path + " (skinned mesh attachment: " + name + ")";
        var attachment = new spine.WeightedMeshAttachment(name);
        attachment.rendererObject = region;
        return attachment;
    },
    newBoundingBoxAttachment: function (skin, name)
    {
        return new spine.BoundingBoxAttachment(name);
    }
};
module.exports = spine.AtlasAttachmentParser;

