var spine = require('../SpineUtil');
spine.Animation = require('./Animation');
spine.Curves = require('./Curves');
spine.FlipXTimeline = function (frameCount)
{
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, flip, ...
    this.frames.length = frameCount * 2;
};
spine.FlipXTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function ()
    {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, flip)
    {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = flip ? 1 : 0;
    },
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        var frames = this.frames;
        if (time < frames[0])
        {
            if (lastTime > time) this.apply(skeleton, lastTime, Number.MAX_VALUE, null, 0);
            return;
        } else if (lastTime > time) //
            lastTime = -1;
        var frameIndex = (time >= frames[frames.length - 2] ? frames.length : spine.Animation.binarySearch(frames, time, 2)) - 2;
        if (frames[frameIndex] < lastTime) return;
        skeleton.bones[this.boneIndex].flipX = frames[frameIndex + 1] != 0;
    }
};
module.exports = spine.FlipXTimeline;

