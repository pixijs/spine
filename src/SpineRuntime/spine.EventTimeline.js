spine.EventTimeline = function (frameCount)
{
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.events = [];
    this.events.length = frameCount;
};
spine.EventTimeline.prototype = {
    getFrameCount: function ()
    {
        return this.frames.length;
    },
    setFrame: function (frameIndex, time, event)
    {
        this.frames[frameIndex] = time;
        this.events[frameIndex] = event;
    },
    /** Fires events for frames > lastTime and <= time. */
    apply: function (skeleton, lastTime, time, firedEvents, alpha)
    {
        if (!firedEvents) return;

        var frames = this.frames;
        var frameCount = frames.length;

        if (lastTime > time)
        { // Fire events after last time for looped animations.
            this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha);
            lastTime = -1;
        } else if (lastTime >= frames[frameCount - 1]) // Last time is after last frame.
            return;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (lastTime < frames[0])
            frameIndex = 0;
        else
        {
            frameIndex = spine.Animation.binarySearch1(frames, lastTime);
            var frame = frames[frameIndex];
            while (frameIndex > 0)
            { // Fire multiple events with the same frame.
                if (frames[frameIndex - 1] != frame) break;
                frameIndex--;
            }
        }
        var events = this.events;
        for (; frameIndex < frameCount && time >= frames[frameIndex]; frameIndex++)
            firedEvents.push(events[frameIndex]);
    }
};

