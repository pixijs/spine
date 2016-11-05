/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.5
 *
 * Copyright (c) 2013-2016, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable, and
 * non-transferable license to use, install, execute, and perform the Spine
 * Runtimes software and derivative works solely for personal or internal
 * use. Without the written permission of Esoteric Software (see Section 2 of
 * the Spine Software License Agreement), you may not (a) modify, translate,
 * adapt, or develop new applications using the Spine Runtimes or otherwise
 * create derivative works or improvements of the Spine Runtimes or (b) remove,
 * delete, alter, or obscure any trademarks or any copyright, trademark, patent,
 * or other intellectual property or proprietary rights notices on or in the
 * Software, including any copy thereof. Redistributions in binary or source
 * form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF
 * USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

module PIXI.spine.core {
    export class AnimationState {
        data: AnimationStateData;
        tracks = new Array<TrackEntry>();
        events = new Array<Event>();
        timeScale = 1;

        constructor(data: AnimationStateData = null) {
            if (data == null) throw new Error("data cannot be null.");
            this.data = data;
        }

        update(delta: number) {
            delta *= this.timeScale;
            for (let i = 0; i < this.tracks.length; i++) {
                let current = this.tracks[i];
                if (current == null) continue;

                let next = current.next;
                if (next != null) {
                    let nextTime = current.lastTime - next.delay;
                    if (nextTime >= 0) {
                        let nextDelta = delta * next.timeScale;
                        next.time = nextTime + nextDelta; // For start event to see correct time.
                        current.time += delta * current.timeScale; // For end event to see correct time.
                        this.setCurrent(i, next);
                        next.time -= nextDelta; // Prevent increasing time twice, below.
                        current = next;
                    }
                } else if (!current.loop && current.lastTime >= current.endTime) {
                    // End non-looping animation when it reaches its end time and there is no next entry.
                    this.clearTrack(i);
                    continue;
                }

                current.time += delta * current.timeScale;
                if (current.previous != null) {
                    let previousDelta = delta * current.previous.timeScale;
                    current.previous.time += previousDelta;
                    current.mixTime += previousDelta;
                }
            }
        }

        apply(skeleton: Skeleton) {
            let events = this.events;

            for (let i = 0; i < this.tracks.length; i++) {
                let current = this.tracks[i];
                if (current == null) continue;

                events.length = 0;

                let time = current.time;
                let lastTime = current.lastTime;
                let endTime = current.endTime;
                let loop = current.loop;
                if (!loop && time > endTime) time = endTime;

                let previous = current.previous;
                if (previous == null)
                    current.animation.mix(skeleton, lastTime, time, loop, events, current.mix);
                else {
                    let previousTime = previous.time;
                    if (!previous.loop && previousTime > previous.endTime) previousTime = previous.endTime;
                    previous.animation.apply(skeleton, previousTime, previousTime, previous.loop, null);

                    let alpha = current.mixTime / current.mixDuration * current.mix;
                    if (alpha >= 1) {
                        alpha = 1;
                        current.previous = null;
                    }
                    current.animation.mix(skeleton, lastTime, time, loop, events, alpha);
                }

                for (let ii = 0, nn = events.length; ii < nn; ii++) {
                    let event = events[ii];
                    if (current.onEvent) current.onEvent(i, event);
                    if (this.onEvent) this.onEvent(i, event);
                }

                // Check if completed the animation or a loop iteration.
                if (loop ? (lastTime % endTime > time % endTime) : (lastTime < endTime && time >= endTime)) {
                    let count = MathUtils.toInt(time / endTime);
                    if (current.onComplete) current.onComplete(i, count);
                    if (this.onComplete) this.onComplete(i, count);
                }

                current.lastTime = current.time;
            }
        }

        clearTracks() {
            for (let i = 0, n = this.tracks.length; i < n; i++)
                this.clearTrack(i);
            this.tracks.length = 0;
        }

        clearTrack(trackIndex: number) {
            if (trackIndex >= this.tracks.length) return;
            let current = this.tracks[trackIndex];
            if (current == null) return;

            if (current.onEnd) current.onEnd(trackIndex);
            if (this.onEnd) this.onEnd(trackIndex);

            this.tracks[trackIndex] = null;

            this.freeAll(current);
        }

        freeAll(entry: TrackEntry) {
            while (entry != null) {
                let next = entry.next;
                entry = next;
            }
        }

        expandToIndex(index: number) {
            if (index < this.tracks.length) return this.tracks[index];
            Utils.setArraySize(this.tracks, index - this.tracks.length + 1, null);
            this.tracks.length = index + 1;
            return null;
        }

        setCurrent(index: number, entry: TrackEntry) {
            let current = this.expandToIndex(index);
            if (current != null) {
                let previous = current.previous;
                current.previous = null;

                if (entry.onEnd) entry.onEnd(index);
                if (this.onEnd) this.onEnd(index);

                entry.mixDuration = this.data.getMix(current.animation, entry.animation);
                if (entry.mixDuration > 0) {
                    entry.mixTime = 0;
                    // If a mix is in progress, mix from the closest animation.
                    if (previous != null && current.mixTime / current.mixDuration < 0.5) {
                        entry.previous = previous;
                        previous = current;
                    } else
                        entry.previous = current;
                }
            }

            this.tracks[index] = entry;

            if (entry.onStart) entry.onStart(index);
            if (this.onStart) this.onStart(index);
        }

        /** @see #setAnimation(int, Animation, boolean) */
        setAnimation(trackIndex: number, animationName: string, loop: boolean) {
            let animation = this.data.skeletonData.findAnimation(animationName);
            if (animation == null) throw new Error("Animation not found: " + animationName);
            return this.setAnimationWith(trackIndex, animation, loop);
        }

        /** Set the current animation. Any queued animations are cleared. */
        setAnimationWith(trackIndex: number, animation: Animation, loop: boolean) {
            let current = this.expandToIndex(trackIndex);
            if (current != null) this.freeAll(current.next);

            let entry = new TrackEntry();
            entry.animation = animation;
            entry.loop = loop;
            entry.endTime = animation.duration;
            this.setCurrent(trackIndex, entry);
            return entry;
        }

        /** {@link #addAnimation(int, Animation, boolean, float)} */
        addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number) {
            let animation = this.data.skeletonData.findAnimation(animationName);
            if (animation == null) throw new Error("Animation not found: " + animationName);
            return this.addAnimationWith(trackIndex, animation, loop, delay);
        }

        hasAnimation(animationName: string): boolean {
            let animation = this.data.skeletonData.findAnimation(animationName);
            return animation !== null;
        }

        /** Adds an animation to be played delay seconds after the current or last queued animation.
         * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
        addAnimationWith(trackIndex: number, animation: Animation, loop: boolean, delay: number) {
            let entry = new TrackEntry();
            entry.animation = animation;
            entry.loop = loop;
            entry.endTime = animation.duration;

            let last = this.expandToIndex(trackIndex);
            if (last != null) {
                while (last.next != null)
                    last = last.next;
                last.next = entry;
            } else
                this.tracks[trackIndex] = entry;

            if (delay <= 0) {
                if (last != null)
                    delay += last.endTime - this.data.getMix(last.animation, animation);
                else
                    delay = 0;
            }
            entry.delay = delay;

            return entry;
        }

        /** @return May be null. */
        getCurrent(trackIndex: number) {
            if (trackIndex >= this.tracks.length) return null;
            return this.tracks[trackIndex];
        }

        onComplete: (trackIndex: number, loopCount: number) => any;
        onEvent: (trackIndex: number, event: Event) => any;
        onStart: (trackIndex: number) => any;
        onEnd: (trackIndex: number) => any;

        private static deprecatedWarning1: boolean = false;

        setAnimationByName(trackIndex: number, animationName: string, loop: boolean) {
            if (!AnimationState.deprecatedWarning1) {
                AnimationState.deprecatedWarning1 = true;
                console.warn("Deprecation Warning: AnimationState.setAnimationByName is deprecated, please use setAnimation from now on.");
            }
            this.setAnimation(trackIndex, animationName, loop);
        }

        private static deprecatedWarning2: boolean = false;

        addAnimationByName(trackIndex: number, animationName: string, loop: boolean, delay: number) {
            if (!AnimationState.deprecatedWarning2) {
                AnimationState.deprecatedWarning2 = true;
                console.warn("Deprecation Warning: AnimationState.addAnimationByName is deprecated, please use addAnimation from now on.");
            }
            this.addAnimation(trackIndex, animationName, loop, delay);
        }

        private static deprecatedWarning3: boolean = false;

        hasAnimationByName(animationName: string): boolean {
            if (!AnimationState.deprecatedWarning3) {
                AnimationState.deprecatedWarning3 = true;
                console.warn("Deprecation Warning: AnimationState.hasAnimationByName is deprecated, please use hasAnimation from now on.");
            }
            let animation = this.data.skeletonData.findAnimation(animationName);
            return animation !== null;
        }
    }

    export class TrackEntry {
        next: TrackEntry;
        previous: TrackEntry;
        animation: Animation;
        loop = false;
        delay = 0;
        time = 0;
        lastTime = -1;
        endTime = 0;
        timeScale = 1;
        mixTime = 0;
        mixDuration = 0;
        mix = 1;

        onComplete: (trackIndex: number, loopCount: number) => any;
        onEvent: (trackIndex: number, event: Event) => any;
        onStart: (trackIndex: number) => any;
        onEnd: (trackIndex: number) => any;

        reset() {
            this.next = null;
            this.previous = null;
            this.animation = null;
            this.timeScale = 1;
            this.lastTime = -1; // Trigger events on frame zero.
            this.time = 0;
        }

        /** Returns true if the current time is greater than the end time, regardless of looping. */
        isComplete(): boolean {
            return this.time >= this.endTime;
        }
    }
}
