var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.ShearTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.ShearTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y)
    {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3])
        { // Time is after last frame.
            bone.shearX += (bone.data.shearX * frames[frames.length - 2] - bone.shearX) * alpha;
            bone.shearY += (bone.data.shearY * frames[frames.length - 1] - bone.shearY) * alpha;
            return;
        }

        // Interpolate between the previous frame and the current frame.
        var frameIndex = spine.Animation.binarySearch(frames, time, 3);
        var prevFrameX = frames[frameIndex - 2];
        var prevFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*PREV_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.shearX += (bone.data.shearX + (prevFrameX + (frames[frameIndex + 1/*FRAME_X*/] - prevFrameX) * percent) - bone.shearX) * alpha;
        bone.shearY += (bone.data.shearY + (prevFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - prevFrameY) * percent) - bone.shearY) * alpha;
    }
};
module.exports = spine.ShearTimeline;

