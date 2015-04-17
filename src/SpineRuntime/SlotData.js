var spine = require('../SpineRuntime') || {};
spine.SlotData = function (name, boneData)
{
    this.name = name;
    this.boneData = boneData;
};
spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null,
    additiveBlending: false
};
module.exports = spine.SlotData;

