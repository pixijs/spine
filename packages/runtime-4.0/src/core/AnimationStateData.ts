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
import {SkeletonData} from "./SkeletonData";
import {IAnimationStateData, Map} from '@pixi-spine/base';
import type {Animation} from './Animation';

/** Stores mix (crossfade) durations to be applied when {@link AnimationState} animations are changed.
 * @public
 * */
export class AnimationStateData implements IAnimationStateData {
    /** The SkeletonData to look up animations when they are specified by name. */
    skeletonData: SkeletonData;

    animationToMixTime: Map<number> = { };

    /** The mix duration to use when no mix duration has been defined between two animations. */
    defaultMix = 0;

    constructor (skeletonData: SkeletonData) {
        if (skeletonData == null) throw new Error("skeletonData cannot be null.");
        this.skeletonData = skeletonData;
    }

    /** Sets a mix duration by animation name.
     *
     * See {@link #setMixWith()}. */
    setMix (fromName: string, toName: string, duration: number) {
        let from = this.skeletonData.findAnimation(fromName);
        if (from == null) throw new Error("Animation not found: " + fromName);
        let to = this.skeletonData.findAnimation(toName);
        if (to == null) throw new Error("Animation not found: " + toName);
        this.setMixWith(from, to, duration);
    }

    /** Sets the mix duration when changing from the specified animation to the other.
     *
     * See {@link TrackEntry#mixDuration}. */
    setMixWith (from: Animation, to: Animation, duration: number) {
        if (from == null) throw new Error("from cannot be null.");
        if (to == null) throw new Error("to cannot be null.");
        let key = from.name + "." + to.name;
        this.animationToMixTime[key] = duration;
    }

    /** Returns the mix duration to use when changing from the specified animation to the other, or the {@link #defaultMix} if
     * no mix duration has been set. */
    getMix (from: Animation, to: Animation) {
        let key = from.name + "." + to.name;
        let value = this.animationToMixTime[key];
        return value === undefined ? this.defaultMix : value;
    }
}
