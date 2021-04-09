export class Spine {
    createSkeleton() {
        this.skeleton = new core.Skeleton(spineData);
        this.skeleton.updateWorldTransform();
        this.stateData = new core.AnimationStateData(spineData);
        this.state = new core.AnimationState(this.stateData);
    }
}
