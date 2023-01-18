import { SpineBase } from '@pixi-spine/base';
import { Skeleton } from './core/Skeleton';
import type { SkeletonData } from './core/SkeletonData';
import { AnimationState } from './core/AnimationState';
import { AnimationStateData } from './core/AnimationStateData';

/**
 * @public
 */
export class Spine extends SpineBase<Skeleton, SkeletonData, AnimationState, AnimationStateData> {
    createSkeleton(spineData: SkeletonData) {
        this.skeleton = new Skeleton(spineData);
        this.skeleton.updateWorldTransform();
        this.stateData = new AnimationStateData(spineData);
        this.state = new AnimationState(this.stateData);
    }
}
