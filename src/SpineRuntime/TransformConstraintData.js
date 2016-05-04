var spine = require('../SpineUtil') || {};
spine.TransformConstraintData = function (name)
{
    this.name = name;
    this.bone = null;
};
spine.TransformConstraintData.prototype = {
    target: null,
    rotateMix: 1,
    translateMix: 1,
    scaleMix: 1,
    shearMix: 1,
    offsetRotation: 0,
    offsetX: 0,
    offsetY: 0,
    offsetScaleX: 0,
    offsetScaleY: 0,
    offsetShearY: 0
};
module.exports = spine.TransformConstraintData;

