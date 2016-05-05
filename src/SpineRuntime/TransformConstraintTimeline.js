var spine = require('../SpineUtil') || {};
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.TransformConstraintTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, mix, bendDirection, ...
    this.frames.length = frameCount * 3;
};
spine.TransformConstraintTimeline.prototype = {
    transformConstraintIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 5;
    },
    setFrame: function (frameIndex, time, rotateMix, translateMix, scaleMix, shareMix)
    {
        frameIndex *= 5;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = rotateMix;
        this.frames[frameIndex + 2] = translateMix;
        this.frames[frameIndex + 3] = scaleMix;
        this.frames[frameIndex + 4] = shareMix;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var constraint = skeleton.transformConstraints[this.transformConstraintIndex];

        if (time >= frames[frames.length - 5])
        { // Time is after last frame.
            constraint.rotateMix += (frames[i - 3] - constraint.rotateMix) * alpha;
            constraint.translateMix += (frames[i - 2] - constraint.translateMix) * alpha;
            constraint.scaleMix += (frames[i - 1] - constraint.scaleMix) * alpha;
            constraint.shearMix += (frames[i] - constraint.shearMix) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frame = spine.Animation.binarySearch(frames, time, 5);
        var frameTime = frames[frame];
        var percent = 1 - (time - frameTime) / (frames[frame + -5/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frame / 5 - 1, percent);

        var rotate = frames[frame + -4/*PREV_ROTATE_MIX*/];
        var translate = frames[frame + -3/*PREV_TRANSLATE_MIX*/];
        var scale = frames[frame + -2/*PREV_SCALE_MIX*/];
        var shear = frames[frame + -1/*PREV_SHEAR_MIX*/];
        constraint.rotateMix += (rotate + (frames[frame + 1/*ROTATE_MIX*/] - rotate) * percent - constraint.rotateMix) * alpha;
        constraint.translateMix += (translate + (frames[frame + 2/*TRANSLATE_MIX*/] - translate) * percent - constraint.translateMix)
            * alpha;
        constraint.scaleMix += (scale + (frames[frame + 3/*SCALE_MIX*/] - scale) * percent - constraint.scaleMix) * alpha;
        constraint.shearMix += (shear + (frames[frame + 4/*SHEAR_MIX*/] - shear) * percent - constraint.shearMix) * alpha;
    }
};
module.exports = spine.TransformConstraintTimeline;

