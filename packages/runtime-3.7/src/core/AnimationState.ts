import { IAnimationState, IAnimationStateListener, ITrackEntry, MathUtils, MixBlend, MixDirection, Pool, IntSet, Utils } from '@pixi/spine-base';
import { Animation, AttachmentTimeline, DrawOrderTimeline, RotateTimeline, Timeline } from './Animation';
import type { AnimationStateData } from './AnimationStateData';
import type { Event } from './Event';
import type { Skeleton } from './Skeleton';

/**
 * @public
 */
export class AnimationState implements IAnimationState<AnimationStateData> {
    static emptyAnimation = new Animation('<empty>', [], 0);
    static SUBSEQUENT = 0;
    static FIRST = 1;
    static HOLD = 2;
    static HOLD_MIX = 3;

    data: AnimationStateData;
    tracks = new Array<TrackEntry>();
    events = new Array<Event>();
    listeners = new Array<AnimationStateListener>();
    queue = new EventQueue(this);
    propertyIDs = new IntSet();
    animationsChanged = false;
    timeScale = 1;

    trackEntryPool = new Pool<TrackEntry>(() => new TrackEntry());

    constructor(data: AnimationStateData) {
        this.data = data;
    }

    update(delta: number) {
        delta *= this.timeScale;
        const tracks = this.tracks;

        for (let i = 0, n = tracks.length; i < n; i++) {
            const current = tracks[i];

            if (current == null) continue;

            current.animationLast = current.nextAnimationLast;
            current.trackLast = current.nextTrackLast;

            let currentDelta = delta * current.timeScale;

            if (current.delay > 0) {
                current.delay -= currentDelta;
                if (current.delay > 0) continue;
                currentDelta = -current.delay;
                current.delay = 0;
            }

            let next = current.next;

            if (next != null) {
                // When the next entry's delay is passed, change to the next entry, preserving leftover time.
                const nextTime = current.trackLast - next.delay;

                if (nextTime >= 0) {
                    next.delay = 0;
                    next.trackTime = current.timeScale == 0 ? 0 : (nextTime / current.timeScale + delta) * next.timeScale;
                    current.trackTime += currentDelta;
                    this.setCurrent(i, next, true);
                    while (next.mixingFrom != null) {
                        next.mixTime += delta;
                        next = next.mixingFrom;
                    }
                    continue;
                }
            } else if (current.trackLast >= current.trackEnd && current.mixingFrom == null) {
                tracks[i] = null;
                this.queue.end(current);
                this.disposeNext(current);
                continue;
            }
            if (current.mixingFrom != null && this.updateMixingFrom(current, delta)) {
                // End mixing from entries once all have completed.
                let from = current.mixingFrom;

                current.mixingFrom = null;
                if (from != null) from.mixingTo = null;
                while (from != null) {
                    this.queue.end(from);
                    from = from.mixingFrom;
                }
            }

            current.trackTime += currentDelta;
        }

        this.queue.drain();
    }

    updateMixingFrom(to: TrackEntry, delta: number): boolean {
        const from = to.mixingFrom;

        if (from == null) return true;

        const finished = this.updateMixingFrom(from, delta);

        from.animationLast = from.nextAnimationLast;
        from.trackLast = from.nextTrackLast;

        // Require mixTime > 0 to ensure the mixing from entry was applied at least once.
        if (to.mixTime > 0 && to.mixTime >= to.mixDuration) {
            // Require totalAlpha == 0 to ensure mixing is complete, unless mixDuration == 0 (the transition is a single frame).
            if (from.totalAlpha == 0 || to.mixDuration == 0) {
                to.mixingFrom = from.mixingFrom;
                if (from.mixingFrom != null) from.mixingFrom.mixingTo = to;
                to.interruptAlpha = from.interruptAlpha;
                this.queue.end(from);
            }

            return finished;
        }

        from.trackTime += delta * from.timeScale;
        to.mixTime += delta;

        return false;
    }

    apply(skeleton: Skeleton): boolean {
        if (skeleton == null) throw new Error('skeleton cannot be null.');
        if (this.animationsChanged) this._animationsChanged();

        const events = this.events;
        const tracks = this.tracks;
        let applied = false;

        for (let i = 0, n = tracks.length; i < n; i++) {
            const current = tracks[i];

            if (current == null || current.delay > 0) continue;
            applied = true;
            const blend: MixBlend = i == 0 ? MixBlend.first : current.mixBlend;

            // Apply mixing from entries first.
            let mix = current.alpha;

            if (current.mixingFrom != null) mix *= this.applyMixingFrom(current, skeleton, blend);
            else if (current.trackTime >= current.trackEnd && current.next == null) mix = 0;

            // Apply current entry.
            const animationLast = current.animationLast;
            const animationTime = current.getAnimationTime();
            const timelineCount = current.animation.timelines.length;
            const timelines = current.animation.timelines;

            if ((i == 0 && mix == 1) || blend == MixBlend.add) {
                for (let ii = 0; ii < timelineCount; ii++) {
                    // Fixes issue #302 on IOS9 where mix, blend sometimes became undefined and caused assets
                    // to sometimes stop rendering when using color correction, as their RGBA values become NaN.
                    // (https://github.com/pixijs/pixi-spine/issues/302)
                    Utils.webkit602BugfixHelper(mix, blend);
                    timelines[ii].apply(skeleton, animationLast, animationTime, events, mix, blend, MixDirection.mixIn);
                }
            } else {
                const timelineMode = current.timelineMode;

                const firstFrame = current.timelinesRotation.length == 0;

                if (firstFrame) Utils.setArraySize(current.timelinesRotation, timelineCount << 1, null);
                const timelinesRotation = current.timelinesRotation;

                for (let ii = 0; ii < timelineCount; ii++) {
                    const timeline = timelines[ii];
                    const timelineBlend = timelineMode[ii] == AnimationState.SUBSEQUENT ? blend : MixBlend.setup;

                    if (timeline instanceof RotateTimeline) {
                        this.applyRotateTimeline(timeline, skeleton, animationTime, mix, timelineBlend, timelinesRotation, ii << 1, firstFrame);
                    } else {
                        // This fixes the WebKit 602 specific issue described at http://esotericsoftware.com/forum/iOS-10-disappearing-graphics-10109
                        Utils.webkit602BugfixHelper(mix, blend);
                        timeline.apply(skeleton, animationLast, animationTime, events, mix, timelineBlend, MixDirection.mixIn);
                    }
                }
            }
            this.queueEvents(current, animationTime);
            events.length = 0;
            current.nextAnimationLast = animationTime;
            current.nextTrackLast = current.trackTime;
        }

        this.queue.drain();

        return applied;
    }

    applyMixingFrom(to: TrackEntry, skeleton: Skeleton, blend: MixBlend) {
        const from = to.mixingFrom;

        if (from.mixingFrom != null) this.applyMixingFrom(from, skeleton, blend);

        let mix = 0;

        if (to.mixDuration == 0) {
            // Single frame mix to undo mixingFrom changes.
            mix = 1;
            if (blend == MixBlend.first) blend = MixBlend.setup;
        } else {
            mix = to.mixTime / to.mixDuration;
            if (mix > 1) mix = 1;
            if (blend != MixBlend.first) blend = from.mixBlend;
        }

        const events = mix < from.eventThreshold ? this.events : null;
        const attachments = mix < from.attachmentThreshold;
        const drawOrder = mix < from.drawOrderThreshold;
        const animationLast = from.animationLast;
        const animationTime = from.getAnimationTime();
        const timelineCount = from.animation.timelines.length;
        const timelines = from.animation.timelines;
        const alphaHold = from.alpha * to.interruptAlpha;
        const alphaMix = alphaHold * (1 - mix);

        if (blend == MixBlend.add) {
            for (let i = 0; i < timelineCount; i++) timelines[i].apply(skeleton, animationLast, animationTime, events, alphaMix, blend, MixDirection.mixOut);
        } else {
            const timelineMode = from.timelineMode;
            const timelineHoldMix = from.timelineHoldMix;

            const firstFrame = from.timelinesRotation.length == 0;

            if (firstFrame) Utils.setArraySize(from.timelinesRotation, timelineCount << 1, null);
            const timelinesRotation = from.timelinesRotation;

            from.totalAlpha = 0;
            for (let i = 0; i < timelineCount; i++) {
                const timeline = timelines[i];
                let direction = MixDirection.mixOut;
                let timelineBlend: MixBlend;
                let alpha = 0;

                switch (timelineMode[i]) {
                    case AnimationState.SUBSEQUENT:
                        if (!attachments && timeline instanceof AttachmentTimeline) continue;
                        if (!drawOrder && timeline instanceof DrawOrderTimeline) continue;
                        timelineBlend = blend;
                        alpha = alphaMix;
                        break;
                    case AnimationState.FIRST:
                        timelineBlend = MixBlend.setup;
                        alpha = alphaMix;
                        break;
                    case AnimationState.HOLD:
                        timelineBlend = MixBlend.setup;
                        alpha = alphaHold;
                        break;
                    default:
                        timelineBlend = MixBlend.setup;
                        const holdMix = timelineHoldMix[i];

                        alpha = alphaHold * Math.max(0, 1 - holdMix.mixTime / holdMix.mixDuration);
                        break;
                }
                from.totalAlpha += alpha;
                if (timeline instanceof RotateTimeline) this.applyRotateTimeline(timeline, skeleton, animationTime, alpha, timelineBlend, timelinesRotation, i << 1, firstFrame);
                else {
                    // This fixes the WebKit 602 specific issue described at http://esotericsoftware.com/forum/iOS-10-disappearing-graphics-10109
                    Utils.webkit602BugfixHelper(alpha, blend);
                    if (timelineBlend == MixBlend.setup) {
                        if (timeline instanceof AttachmentTimeline) {
                            if (attachments) direction = MixDirection.mixOut;
                        } else if (timeline instanceof DrawOrderTimeline) {
                            if (drawOrder) direction = MixDirection.mixOut;
                        }
                    }
                    timeline.apply(skeleton, animationLast, animationTime, events, alpha, timelineBlend, direction);
                }
            }
        }

        if (to.mixDuration > 0) this.queueEvents(from, animationTime);
        this.events.length = 0;
        from.nextAnimationLast = animationTime;
        from.nextTrackLast = from.trackTime;

        return mix;
    }

    applyRotateTimeline(timeline: Timeline, skeleton: Skeleton, time: number, alpha: number, blend: MixBlend, timelinesRotation: Array<number>, i: number, firstFrame: boolean) {
        if (firstFrame) timelinesRotation[i] = 0;

        if (alpha == 1) {
            timeline.apply(skeleton, 0, time, null, 1, blend, MixDirection.mixIn);

            return;
        }

        const rotateTimeline = timeline as RotateTimeline;
        const frames = rotateTimeline.frames;
        const bone = skeleton.bones[rotateTimeline.boneIndex];
        let r1 = 0;
        let r2 = 0;

        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.rotation = bone.data.rotation;
                default:
                    return;
                case MixBlend.first:
                    r1 = bone.rotation;
                    r2 = bone.data.rotation;
            }
        } else {
            r1 = blend == MixBlend.setup ? bone.data.rotation : bone.rotation;
            if (time >= frames[frames.length - RotateTimeline.ENTRIES])
                // Time is after last frame.
                r2 = bone.data.rotation + frames[frames.length + RotateTimeline.PREV_ROTATION];
            else {
                // Interpolate between the previous frame and the current frame.
                const frame = Animation.binarySearch(frames, time, RotateTimeline.ENTRIES);
                const prevRotation = frames[frame + RotateTimeline.PREV_ROTATION];
                const frameTime = frames[frame];
                const percent = rotateTimeline.getCurvePercent((frame >> 1) - 1, 1 - (time - frameTime) / (frames[frame + RotateTimeline.PREV_TIME] - frameTime));

                r2 = frames[frame + RotateTimeline.ROTATION] - prevRotation;
                r2 -= (16384 - ((16384.499999999996 - r2 / 360) | 0)) * 360;
                r2 = prevRotation + r2 * percent + bone.data.rotation;
                r2 -= (16384 - ((16384.499999999996 - r2 / 360) | 0)) * 360;
            }
        }

        // Mix between rotations using the direction of the shortest route on the first frame while detecting crosses.
        let total = 0;
        let diff = r2 - r1;

        diff -= (16384 - ((16384.499999999996 - diff / 360) | 0)) * 360;
        if (diff == 0) {
            total = timelinesRotation[i];
        } else {
            let lastTotal = 0;
            let lastDiff = 0;

            if (firstFrame) {
                lastTotal = 0;
                lastDiff = diff;
            } else {
                lastTotal = timelinesRotation[i]; // Angle and direction of mix, including loops.
                lastDiff = timelinesRotation[i + 1]; // Difference between bones.
            }
            const current = diff > 0;
            let dir = lastTotal >= 0;
            // Detect cross at 0 (not 180).

            if (MathUtils.signum(lastDiff) != MathUtils.signum(diff) && Math.abs(lastDiff) <= 90) {
                // A cross after a 360 rotation is a loop.
                if (Math.abs(lastTotal) > 180) lastTotal += 360 * MathUtils.signum(lastTotal);
                dir = current;
            }
            total = diff + lastTotal - (lastTotal % 360); // Store loops as part of lastTotal.
            if (dir != current) total += 360 * MathUtils.signum(lastTotal);
            timelinesRotation[i] = total;
        }
        timelinesRotation[i + 1] = diff;
        r1 += total * alpha;
        bone.rotation = r1 - (16384 - ((16384.499999999996 - r1 / 360) | 0)) * 360;
    }

    queueEvents(entry: TrackEntry, animationTime: number) {
        const animationStart = entry.animationStart;
        const animationEnd = entry.animationEnd;
        const duration = animationEnd - animationStart;
        const trackLastWrapped = entry.trackLast % duration;

        // Queue events before complete.
        const events = this.events;
        let i = 0;
        const n = events.length;

        for (; i < n; i++) {
            const event = events[i];

            if (event.time < trackLastWrapped) break;
            if (event.time > animationEnd) continue; // Discard events outside animation start/end.
            this.queue.event(entry, event);
        }

        // Queue complete if completed a loop iteration or the animation.
        let complete = false;

        if (entry.loop) complete = duration == 0 || trackLastWrapped > entry.trackTime % duration;
        else complete = animationTime >= animationEnd && entry.animationLast < animationEnd;
        if (complete) this.queue.complete(entry);

        // Queue events after complete.
        for (; i < n; i++) {
            const event = events[i];

            if (event.time < animationStart) continue; // Discard events outside animation start/end.
            this.queue.event(entry, events[i]);
        }
    }

    clearTracks() {
        const oldDrainDisabled = this.queue.drainDisabled;

        this.queue.drainDisabled = true;
        for (let i = 0, n = this.tracks.length; i < n; i++) this.clearTrack(i);
        this.tracks.length = 0;
        this.queue.drainDisabled = oldDrainDisabled;
        this.queue.drain();
    }

    clearTrack(trackIndex: number) {
        if (trackIndex >= this.tracks.length) return;
        const current = this.tracks[trackIndex];

        if (current == null) return;

        this.queue.end(current);

        this.disposeNext(current);

        let entry = current;

        while (true) {
            const from = entry.mixingFrom;

            if (from == null) break;
            this.queue.end(from);
            entry.mixingFrom = null;
            entry.mixingTo = null;
            entry = from;
        }

        this.tracks[current.trackIndex] = null;

        this.queue.drain();
    }

    setCurrent(index: number, current: TrackEntry, interrupt: boolean) {
        const from = this.expandToIndex(index);

        this.tracks[index] = current;

        if (from != null) {
            if (interrupt) this.queue.interrupt(from);
            current.mixingFrom = from;
            from.mixingTo = current;
            current.mixTime = 0;

            // Store the interrupted mix percentage.
            if (from.mixingFrom != null && from.mixDuration > 0) current.interruptAlpha *= Math.min(1, from.mixTime / from.mixDuration);

            from.timelinesRotation.length = 0; // Reset rotation for mixing out, in case entry was mixed in.
        }

        this.queue.start(current);
    }

    setAnimation(trackIndex: number, animationName: string, loop: boolean) {
        const animation = this.data.skeletonData.findAnimation(animationName);

        if (animation == null) throw new Error(`Animation not found: ${animationName}`);

        return this.setAnimationWith(trackIndex, animation, loop);
    }

    setAnimationWith(trackIndex: number, animation: Animation, loop: boolean) {
        if (animation == null) throw new Error('animation cannot be null.');
        let interrupt = true;
        let current = this.expandToIndex(trackIndex);

        if (current != null) {
            if (current.nextTrackLast == -1) {
                // Don't mix from an entry that was never applied.
                this.tracks[trackIndex] = current.mixingFrom;
                this.queue.interrupt(current);
                this.queue.end(current);
                this.disposeNext(current);
                current = current.mixingFrom;
                interrupt = false;
            } else this.disposeNext(current);
        }
        const entry = this.trackEntry(trackIndex, animation, loop, current);

        this.setCurrent(trackIndex, entry, interrupt);
        this.queue.drain();

        return entry;
    }

    addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number) {
        const animation = this.data.skeletonData.findAnimation(animationName);

        if (animation == null) throw new Error(`Animation not found: ${animationName}`);

        return this.addAnimationWith(trackIndex, animation, loop, delay);
    }

    addAnimationWith(trackIndex: number, animation: Animation, loop: boolean, delay: number) {
        if (animation == null) throw new Error('animation cannot be null.');

        let last = this.expandToIndex(trackIndex);

        if (last != null) {
            while (last.next != null) last = last.next;
        }

        const entry = this.trackEntry(trackIndex, animation, loop, last);

        if (last == null) {
            this.setCurrent(trackIndex, entry, true);
            this.queue.drain();
        } else {
            last.next = entry;
            if (delay <= 0) {
                const duration = last.animationEnd - last.animationStart;

                if (duration != 0) {
                    if (last.loop) delay += duration * (1 + ((last.trackTime / duration) | 0));
                    else delay += Math.max(duration, last.trackTime);
                    delay -= this.data.getMix(last.animation, animation);
                } else delay = last.trackTime;
            }
        }

        entry.delay = delay;

        return entry;
    }

    setEmptyAnimation(trackIndex: number, mixDuration: number) {
        const entry = this.setAnimationWith(trackIndex, AnimationState.emptyAnimation, false);

        entry.mixDuration = mixDuration;
        entry.trackEnd = mixDuration;

        return entry;
    }

    addEmptyAnimation(trackIndex: number, mixDuration: number, delay: number) {
        if (delay <= 0) delay -= mixDuration;
        const entry = this.addAnimationWith(trackIndex, AnimationState.emptyAnimation, false, delay);

        entry.mixDuration = mixDuration;
        entry.trackEnd = mixDuration;

        return entry;
    }

    setEmptyAnimations(mixDuration: number) {
        const oldDrainDisabled = this.queue.drainDisabled;

        this.queue.drainDisabled = true;
        for (let i = 0, n = this.tracks.length; i < n; i++) {
            const current = this.tracks[i];

            if (current != null) this.setEmptyAnimation(current.trackIndex, mixDuration);
        }
        this.queue.drainDisabled = oldDrainDisabled;
        this.queue.drain();
    }

    expandToIndex(index: number) {
        if (index < this.tracks.length) return this.tracks[index];
        Utils.ensureArrayCapacity(this.tracks, index - this.tracks.length + 1, null);
        this.tracks.length = index + 1;

        return null;
    }

    trackEntry(trackIndex: number, animation: Animation, loop: boolean, last: TrackEntry) {
        const entry = this.trackEntryPool.obtain();

        entry.trackIndex = trackIndex;
        entry.animation = animation;
        entry.loop = loop;
        entry.holdPrevious = false;

        entry.eventThreshold = 0;
        entry.attachmentThreshold = 0;
        entry.drawOrderThreshold = 0;

        entry.animationStart = 0;
        entry.animationEnd = animation.duration;
        entry.animationLast = -1;
        entry.nextAnimationLast = -1;

        entry.delay = 0;
        entry.trackTime = 0;
        entry.trackLast = -1;
        entry.nextTrackLast = -1;
        entry.trackEnd = Number.MAX_VALUE;
        entry.timeScale = 1;

        entry.alpha = 1;
        entry.interruptAlpha = 1;
        entry.mixTime = 0;
        entry.mixDuration = last == null ? 0 : this.data.getMix(last.animation, animation);

        return entry;
    }

    disposeNext(entry: TrackEntry) {
        let next = entry.next;

        while (next != null) {
            this.queue.dispose(next);
            next = next.next;
        }
        entry.next = null;
    }

    _animationsChanged() {
        this.animationsChanged = false;

        this.propertyIDs.clear();

        for (let i = 0, n = this.tracks.length; i < n; i++) {
            let entry = this.tracks[i];

            if (entry == null) continue;
            while (entry.mixingFrom != null) entry = entry.mixingFrom;

            do {
                if (entry.mixingFrom == null || entry.mixBlend != MixBlend.add) this.setTimelineModes(entry);
                entry = entry.mixingTo;
            } while (entry != null);
        }
    }

    setTimelineModes(entry: TrackEntry) {
        const to = entry.mixingTo;
        const timelines = entry.animation.timelines;
        const timelinesCount = entry.animation.timelines.length;
        const timelineMode = Utils.setArraySize(entry.timelineMode, timelinesCount);

        entry.timelineHoldMix.length = 0;
        const timelineDipMix = Utils.setArraySize(entry.timelineHoldMix, timelinesCount);
        const propertyIDs = this.propertyIDs;

        if (to != null && to.holdPrevious) {
            for (let i = 0; i < timelinesCount; i++) {
                propertyIDs.add(timelines[i].getPropertyId());
                timelineMode[i] = AnimationState.HOLD;
            }

            return;
        }

        // eslint-disable-next-line no-restricted-syntax, no-labels
        outer: for (let i = 0; i < timelinesCount; i++) {
            const id = timelines[i].getPropertyId();

            if (!propertyIDs.add(id)) timelineMode[i] = AnimationState.SUBSEQUENT;
            else if (to == null || !this.hasTimeline(to, id)) timelineMode[i] = AnimationState.FIRST;
            else {
                for (let next = to.mixingTo; next != null; next = next.mixingTo) {
                    if (this.hasTimeline(next, id)) continue;
                    if (entry.mixDuration > 0) {
                        timelineMode[i] = AnimationState.HOLD_MIX;
                        timelineDipMix[i] = next;
                        // eslint-disable-next-line no-labels
                        continue outer;
                    }
                    break;
                }
                timelineMode[i] = AnimationState.HOLD;
            }
        }
    }

    hasTimeline(entry: TrackEntry, id: number): boolean {
        const timelines = entry.animation.timelines;

        for (let i = 0, n = timelines.length; i < n; i++) if (timelines[i].getPropertyId() == id) return true;

        return false;
    }

    getCurrent(trackIndex: number) {
        if (trackIndex >= this.tracks.length) return null;

        return this.tracks[trackIndex];
    }

    addListener(listener: AnimationStateListener) {
        if (listener == null) throw new Error('listener cannot be null.');
        this.listeners.push(listener);
    }

    /** Removes the listener added with {@link #addListener(AnimationStateListener)}. */
    removeListener(listener: AnimationStateListener) {
        const index = this.listeners.indexOf(listener);

        if (index >= 0) this.listeners.splice(index, 1);
    }

    clearListeners() {
        this.listeners.length = 0;
    }

    clearListenerNotifications() {
        this.queue.clear();
    }

    // deprecated stuff
    onComplete: (trackIndex: number, loopCount: number) => any;
    onEvent: (trackIndex: number, event: Event) => any;
    onStart: (trackIndex: number) => any;
    onEnd: (trackIndex: number) => any;

    private static deprecatedWarning1 = false;

    setAnimationByName(trackIndex: number, animationName: string, loop: boolean) {
        if (!AnimationState.deprecatedWarning1) {
            AnimationState.deprecatedWarning1 = true;
            console.warn('Spine Deprecation Warning: AnimationState.setAnimationByName is deprecated, please use setAnimation from now on.');
        }
        this.setAnimation(trackIndex, animationName, loop);
    }

    private static deprecatedWarning2 = false;

    addAnimationByName(trackIndex: number, animationName: string, loop: boolean, delay: number) {
        if (!AnimationState.deprecatedWarning2) {
            AnimationState.deprecatedWarning2 = true;
            console.warn('Spine Deprecation Warning: AnimationState.addAnimationByName is deprecated, please use addAnimation from now on.');
        }
        this.addAnimation(trackIndex, animationName, loop, delay);
    }

    private static deprecatedWarning3 = false;

    hasAnimation(animationName: string): boolean {
        const animation = this.data.skeletonData.findAnimation(animationName);

        return animation !== null;
    }

    hasAnimationByName(animationName: string): boolean {
        if (!AnimationState.deprecatedWarning3) {
            AnimationState.deprecatedWarning3 = true;
            console.warn('Spine Deprecation Warning: AnimationState.hasAnimationByName is deprecated, please use hasAnimation from now on.');
        }

        return this.hasAnimation(animationName);
    }
}

/**
 * @public
 */
export class TrackEntry implements ITrackEntry {
    animation: Animation;
    next: TrackEntry;
    mixingFrom: TrackEntry;
    mixingTo: TrackEntry;
    listener: AnimationStateListener;
    trackIndex: number;
    loop: boolean;
    holdPrevious: boolean;
    eventThreshold: number;
    attachmentThreshold: number;
    drawOrderThreshold: number;
    animationStart: number;
    animationEnd: number;
    animationLast: number;
    nextAnimationLast: number;
    delay: number;
    trackTime: number;
    trackLast: number;
    nextTrackLast: number;
    trackEnd: number;
    timeScale: number;
    alpha: number;
    mixTime: number;
    mixDuration: number;
    interruptAlpha: number;
    totalAlpha: number;
    mixBlend = MixBlend.replace;
    timelineMode = new Array<number>();
    timelineHoldMix = new Array<TrackEntry>();
    timelinesRotation = new Array<number>();

    reset() {
        this.next = null;
        this.mixingFrom = null;
        this.mixingTo = null;
        this.animation = null;
        this.listener = null;
        this.timelineMode.length = 0;
        this.timelineHoldMix.length = 0;
        this.timelinesRotation.length = 0;
    }

    getAnimationTime() {
        if (this.loop) {
            const duration = this.animationEnd - this.animationStart;

            if (duration == 0) return this.animationStart;

            return (this.trackTime % duration) + this.animationStart;
        }

        return Math.min(this.trackTime + this.animationStart, this.animationEnd);
    }

    setAnimationLast(animationLast: number) {
        this.animationLast = animationLast;
        this.nextAnimationLast = animationLast;
    }

    isComplete() {
        return this.trackTime >= this.animationEnd - this.animationStart;
    }

    resetRotationDirections() {
        this.timelinesRotation.length = 0;
    }

    // deprecated stuff
    onComplete: (trackIndex: number, loopCount: number) => any;
    onEvent: (trackIndex: number, event: Event) => any;
    onStart: (trackIndex: number) => any;
    onEnd: (trackIndex: number) => any;

    private static deprecatedWarning1 = false;
    private static deprecatedWarning2 = false;

    get time() {
        if (!TrackEntry.deprecatedWarning1) {
            TrackEntry.deprecatedWarning1 = true;
            console.warn('Spine Deprecation Warning: TrackEntry.time is deprecated, please use trackTime from now on.');
        }

        return this.trackTime;
    }

    set time(value: number) {
        if (!TrackEntry.deprecatedWarning1) {
            TrackEntry.deprecatedWarning1 = true;
            console.warn('Spine Deprecation Warning: TrackEntry.time is deprecated, please use trackTime from now on.');
        }
        this.trackTime = value;
    }

    get endTime() {
        if (!TrackEntry.deprecatedWarning2) {
            TrackEntry.deprecatedWarning2 = true;
            console.warn('Spine Deprecation Warning: TrackEntry.endTime is deprecated, please use trackEnd from now on.');
        }

        return this.trackTime;
    }

    set endTime(value: number) {
        if (!TrackEntry.deprecatedWarning2) {
            TrackEntry.deprecatedWarning2 = true;
            console.warn('Spine Deprecation Warning: TrackEntry.endTime is deprecated, please use trackEnd from now on.');
        }
        this.trackTime = value;
    }

    loopsCount() {
        return Math.floor(this.trackTime / this.trackEnd);
    }
}

/**
 * @public
 */
export class EventQueue {
    objects: Array<any> = [];
    drainDisabled = false;
    animState: AnimationState;

    constructor(animState: AnimationState) {
        this.animState = animState;
    }

    start(entry: TrackEntry) {
        this.objects.push(EventType.start);
        this.objects.push(entry);
        this.animState.animationsChanged = true;
    }

    interrupt(entry: TrackEntry) {
        this.objects.push(EventType.interrupt);
        this.objects.push(entry);
    }

    end(entry: TrackEntry) {
        this.objects.push(EventType.end);
        this.objects.push(entry);
        this.animState.animationsChanged = true;
    }

    dispose(entry: TrackEntry) {
        this.objects.push(EventType.dispose);
        this.objects.push(entry);
    }

    complete(entry: TrackEntry) {
        this.objects.push(EventType.complete);
        this.objects.push(entry);
    }

    event(entry: TrackEntry, event: Event) {
        this.objects.push(EventType.event);
        this.objects.push(entry);
        this.objects.push(event);
    }

    private static deprecatedWarning1 = false;

    deprecateStuff() {
        if (!EventQueue.deprecatedWarning1) {
            EventQueue.deprecatedWarning1 = true;
            console.warn(
                "Spine Deprecation Warning: onComplete, onStart, onEnd, onEvent art deprecated, please use listeners from now on. 'state.addListener({ complete: function(track, event) { } })'"
            );
        }

        return true;
    }

    drain() {
        if (this.drainDisabled) return;
        this.drainDisabled = true;

        const objects = this.objects;
        const listeners = this.animState.listeners;

        for (let i = 0; i < objects.length; i += 2) {
            const type = objects[i] as EventType;
            const entry = objects[i + 1] as TrackEntry;

            switch (type) {
                case EventType.start:
                    if (entry.listener != null && entry.listener.start) entry.listener.start(entry);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].start) listeners[ii].start(entry);
                    // deprecation
                    entry.onStart && this.deprecateStuff() && entry.onStart(entry.trackIndex);
                    this.animState.onStart && this.deprecateStuff() && this.deprecateStuff && this.animState.onStart(entry.trackIndex);
                    break;
                case EventType.interrupt:
                    if (entry.listener != null && entry.listener.interrupt) entry.listener.interrupt(entry);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].interrupt) listeners[ii].interrupt(entry);
                    break;
                case EventType.end:
                    if (entry.listener != null && entry.listener.end) entry.listener.end(entry);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].end) listeners[ii].end(entry);
                    // deprecation
                    entry.onEnd && this.deprecateStuff() && entry.onEnd(entry.trackIndex);
                    this.animState.onEnd && this.deprecateStuff() && this.animState.onEnd(entry.trackIndex);
                // Fall through.
                case EventType.dispose:
                    if (entry.listener != null && entry.listener.dispose) entry.listener.dispose(entry);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].dispose) listeners[ii].dispose(entry);
                    this.animState.trackEntryPool.free(entry);
                    break;
                case EventType.complete:
                    if (entry.listener != null && entry.listener.complete) entry.listener.complete(entry);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].complete) listeners[ii].complete(entry);
                    // deprecation

                    const count = MathUtils.toInt(entry.loopsCount());

                    entry.onComplete && this.deprecateStuff() && entry.onComplete(entry.trackIndex, count);
                    this.animState.onComplete && this.deprecateStuff() && this.animState.onComplete(entry.trackIndex, count);
                    break;
                case EventType.event:
                    const event = objects[i++ + 2] as Event;

                    if (entry.listener != null && entry.listener.event) entry.listener.event(entry, event);
                    for (let ii = 0; ii < listeners.length; ii++) if (listeners[ii].event) listeners[ii].event(entry, event);
                    // deprecation
                    entry.onEvent && this.deprecateStuff() && entry.onEvent(entry.trackIndex, event);
                    this.animState.onEvent && this.deprecateStuff() && this.animState.onEvent(entry.trackIndex, event);
                    break;
            }
        }
        this.clear();

        this.drainDisabled = false;
    }

    clear() {
        this.objects.length = 0;
    }
}

/**
 * @public
 */
export enum EventType {
    start,
    interrupt,
    end,
    dispose,
    complete,
    event,
}

/**
 * @public
 */
export interface AnimationStateListener extends IAnimationStateListener {
    /** Invoked when this entry has been set as the current entry. */
    start?(entry: TrackEntry): void;

    /** Invoked when another entry has replaced this entry as the current entry. This entry may continue being applied for
     * mixing. */
    interrupt?(entry: TrackEntry): void;

    /** Invoked when this entry is no longer the current entry and will never be applied again. */
    end?(entry: TrackEntry): void;

    /** Invoked when this entry will be disposed. This may occur without the entry ever being set as the current entry.
     * References to the entry should not be kept after dispose is called, as it may be destroyed or reused. */
    dispose?(entry: TrackEntry): void;

    /** Invoked every time this entry's animation completes a loop. */
    complete?(entry: TrackEntry): void;

    /** Invoked when this entry's animation triggers an event. */
    event?(entry: TrackEntry, event: Event): void;
}

/**
 * @public
 */
export abstract class AnimationStateAdapter2 implements AnimationStateListener {
    start(entry: TrackEntry) {}

    interrupt(entry: TrackEntry) {}

    end(entry: TrackEntry) {}

    dispose(entry: TrackEntry) {}

    complete(entry: TrackEntry) {}

    event(entry: TrackEntry, event: Event) {}
}
