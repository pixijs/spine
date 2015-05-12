var spine = require('../SpineUtil');
spine.SlotData = function (name, boneData)
{
    this.name = name;
    this.boneData = boneData;
};

spine.SlotData.PIXI_BLEND_MODE_MAP = {
    'multiply': PIXI.blendModes.MULTIPLY,
    'screen': PIXI.blendModes.SCREEN,
    'additive': PIXI.blendModes.ADD,
    'normal': PIXI.blendModes.NORMAL
};

spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null,
    blendMode: PIXI.blendModes.NORMAL


};


module.exports = spine.SlotData;

