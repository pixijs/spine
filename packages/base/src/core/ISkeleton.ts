import type {Matrix} from '@pixi/math';
import type {Color} from './Utils';
import type {TextureRegion} from './TextureRegion';

export interface IBone {
    data: { name: string };
    matrix: Matrix;
}

export interface IAttachment {
    id: number;
    name: number;
}

export interface ISlot {
    getAttachment(): IAttachment;
    currentMesh?: any;
    currentSprite?: any;
    currentGraphics?: any;
    clippingContainer?: any;
    meshes?: any;
    currentSpriteName?: string;
    currentMeshId?: number;
    color?: Color;
    darkColor?: Color;
    hackRegion?: TextureRegion;
    hackAttachment?: IAttachment;
}

export interface ISkeleton<Bone extends IBone = IBone, Slot extends ISlot = ISlot> {
    bones: Array<Bone>
    slots: Array<Slot>
    updateWorldTransform(): void;
    setToSetupPose(): void;
}

export interface ISkeletonData {

}

export interface IAnimationState {

}

export interface IAnimationStateData {

}
