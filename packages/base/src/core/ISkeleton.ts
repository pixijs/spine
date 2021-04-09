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

export interface ISlotData {

}

export interface ISlot {
    getAttachment(): IAttachment;
    data: ISlotData;
    color: Color;
    darkColor: Color;
    blendMode: number;
    bone: IBone;

    sprites?: any;
    currentSprite?: any;
    currentSpriteName?: string;

    meshes?: any;
    currentMesh?: any;
    currentMeshName?: string;
    currentMeshId?: number;

    currentGraphics?: any;
    clippingContainer?: any;

    hackRegion?: TextureRegion;
    hackAttachment?: IAttachment;
}

export interface ISkeleton<Bone extends IBone = IBone, Slot extends ISlot = ISlot> {
    bones: Array<Bone>
    slots: Array<Slot>
    updateWorldTransform(): void;
    setToSetupPose(): void;
    findSlotIndex(slotName: string): number;
    getAttachmentByName (slotName: string, attachmentName: string): IAttachment;
}

export interface ISkeletonData {

}

export interface IAnimationState {
    update(dt: number): void;
    apply(skeleton: ISkeleton): void;
}

export interface IAnimationStateData {

}
