import {SkeletonData} from "./SkeletonData";
import {IAnimation, IAnimationStateData, Map} from '@pixi-spine/base';
import type { Animation } from "./Animation";

/**
 * @public
 */
export class AnimationStateData implements IAnimationStateData<SkeletonData, Animation> {
    skeletonData: SkeletonData;
    animationToMixTime: Map<number> = {};
    defaultMix = 0;

    constructor(skeletonData: SkeletonData) {
        if (skeletonData == null) throw new Error("skeletonData cannot be null.");
        this.skeletonData = skeletonData;
    }

    setMix(fromName: string, toName: string, duration: number) {
        let from = this.skeletonData.findAnimation(fromName);
        if (from == null) throw new Error("Animation not found: " + fromName);
        let to = this.skeletonData.findAnimation(toName);
        if (to == null) throw new Error("Animation not found: " + toName);
        this.setMixWith(from, to, duration);
    }

    private static deprecatedWarning1: boolean = false;

    setMixByName(fromName: string, toName: string, duration: number) {
        if (!AnimationStateData.deprecatedWarning1) {
            AnimationStateData.deprecatedWarning1 = true;
            console.warn("Deprecation Warning: AnimationStateData.setMixByName is deprecated, please use setMix from now on.");
        }
        this.setMix(fromName, toName, duration);
    }

    setMixWith(from: IAnimation, to: IAnimation, duration: number) {
        if (from == null) throw new Error("from cannot be null.");
        if (to == null) throw new Error("to cannot be null.");
        let key = from.name + "." + to.name;
        this.animationToMixTime[key] = duration;
    }

    getMix(from: IAnimation, to: IAnimation) {
        let key = from.name + "." + to.name;
        let value = this.animationToMixTime[key];
        return value === undefined ? this.defaultMix : value;
    }
}
