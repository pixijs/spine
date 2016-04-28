var spine = require('../SpineUtil');
spine.TrackEntry = require('./TrackEntry');
spine.AnimationState = function (stateData)
{
    this.data = stateData;
    this.tracks = [];
    this.events = [];
};
spine.AnimationState.prototype = {
    onStart: null,
    onEnd: null,
    onComplete: null,
    onEvent: null,
    timeScale: 1,
    update: function (delta)
    {
        delta *= this.timeScale;
        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            current.time += delta * current.timeScale;
            if (current.previous)
            {
                var previousDelta = delta * current.previous.timeScale;
                current.previous.time += previousDelta;
                current.mixTime += previousDelta;
            }

            var next = current.next;
            if (next)
            {
                next.time = current.lastTime - next.delay;
                if (next.time >= 0) this.setCurrent(i, next);
            } else {
                // End non-looping animation when it reaches its end time and there is no next entry.
                if (!current.loop && current.lastTime >= current.endTime) this.clearTrack(i);
            }
        }
    },
    apply: function (skeleton)
    {
        skeleton.resetDrawOrder();

        for (var i = 0; i < this.tracks.length; i++)
        {
            var current = this.tracks[i];
            if (!current) continue;

            this.events.length = 0;

            var time = current.time;
            var lastTime = current.lastTime;
            var endTime = current.endTime;
            var loop = current.loop;
            if (!loop && time > endTime) time = endTime;

            var previous = current.previous;
            if (!previous)
            {
                if (current.mix == 1)
                    current.animation.apply(skeleton, current.lastTime, time, loop, this.events);
                else
                    current.animation.mix(skeleton, current.lastTime, time, loop, this.events, current.mix);
            } else {
                var previousTime = previous.time;
                if (!previous.loop && previousTime > previous.endTime) previousTime = previous.endTime;
                previous.animation.apply(skeleton, previousTime, previousTime, previous.loop, null);

                var alpha = current.mixTime / current.mixDuration * current.mix;
                if (alpha >= 1)
                {
                    alpha = 1;
                    current.previous = null;
                }
                current.animation.mix(skeleton, current.lastTime, time, loop, this.events, alpha);
            }

            for (var ii = 0, nn = this.events.length; ii < nn; ii++)
            {
                var event = this.events[ii];
                if (current.onEvent) current.onEvent(i, event);
                if (this.onEvent) this.onEvent(i, event);
            }

            // Check if completed the animation or a loop iteration.
            if (loop ? (lastTime % endTime > time % endTime) : (lastTime < endTime && time >= endTime))
            {
                var count = Math.floor(time / endTime);
                if (current.onComplete) current.onComplete(i, count);
                if (this.onComplete) this.onComplete(i, count);
            }

            current.lastTime = current.time;
        }
    },
    clearTracks: function ()
    {
        for (var i = 0, n = this.tracks.length; i < n; i++)
            this.clearTrack(i);
        this.tracks.length = 0;
    },
    clearTrack: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return;
        var current = this.tracks[trackIndex];
        if (!current) return;

        if (current.onEnd) current.onEnd(trackIndex);
        if (this.onEnd) this.onEnd(trackIndex);

        this.tracks[trackIndex] = null;
    },
    _expandToIndex: function (index)
    {
        if (index < this.tracks.length) return this.tracks[index];
        while (index >= this.tracks.length)
            this.tracks.push(null);
        return null;
    },
    setCurrent: function (index, entry)
    {
        var current = this._expandToIndex(index);
        if (current)
        {
            var previous = current.previous;
            current.previous = null;

            if (current.onEnd) current.onEnd(index);
            if (this.onEnd) this.onEnd(index);

            entry.mixDuration = this.data.getMix(current.animation, entry.animation);
            if (entry.mixDuration > 0)
            {
                entry.mixTime = 0;
                // If a mix is in progress, mix from the closest animation.
                if (previous && current.mixTime / current.mixDuration < 0.5)
                    entry.previous = previous;
                else
                    entry.previous = current;
            }
        }

        this.tracks[index] = entry;

        if (entry.onStart) entry.onStart(index);
        if (this.onStart) this.onStart(index);
    },
    setAnimationByName: function (trackIndex, animationName, loop)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.setAnimation(trackIndex, animation, loop);
    },
    /** Set the current animation. Any queued animations are cleared. */
    setAnimation: function (trackIndex, animation, loop)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;
        this.setCurrent(trackIndex, entry);
        return entry;
    },
    addAnimationByName: function (trackIndex, animationName, loop, delay)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        return this.addAnimation(trackIndex, animation, loop, delay);
    },
    /** Adds an animation to be played delay seconds after the current or last queued animation.
     * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
    addAnimation: function (trackIndex, animation, loop, delay)
    {
        var entry = new spine.TrackEntry();
        entry.animation = animation;
        entry.loop = loop;
        entry.endTime = animation.duration;

        var last = this._expandToIndex(trackIndex);
        if (last)
        {
            while (last.next)
                last = last.next;
            last.next = entry;
        } else
            this.tracks[trackIndex] = entry;

        if (delay <= 0)
        {
            if (last)
                delay += last.endTime - this.data.getMix(last.animation, animation);
            else
                delay = 0;
        }
        entry.delay = delay;

        return entry;
    },
    /**
     * Returns true if animation exists in skeleton data
     * @param animationName
     * @returns {boolean}
     */
    hasAnimationByName: function (animationName)
    {
        var animation = this.data.skeletonData.findAnimation(animationName);
        return animation !== null;
    },
    /** May be null. */
    getCurrent: function (trackIndex)
    {
        if (trackIndex >= this.tracks.length) return null;
        return this.tracks[trackIndex];
    }
};
module.exports = spine.AnimationState;

