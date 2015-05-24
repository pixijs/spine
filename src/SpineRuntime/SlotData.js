var spine = require('../SpineUtil');
spine.SlotData = function (name, boneData)
{
    this.name = name;
    this.boneData = boneData;
};

spine.SlotData.PIXI_BLEND_MODE_MAP = {
    'multiply': PIXI.BLEND_MODES.MULTIPLY,
    'screen': PIXI.BLEND_MODES.SCREEN,
    'additive': PIXI.BLEND_MODES.ADD,
    'normal': PIXI.BLEND_MODES.NORMAL
};

spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null,
    blendMode: PIXI.BLEND_MODES.NORMAL


};


module.exports = spine.SlotData;

