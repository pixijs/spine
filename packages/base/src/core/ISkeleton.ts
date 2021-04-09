import {AttachmentType} from './AttachmentType';
import type {Color} from './Utils';
import type {TextureRegion} from './TextureRegion';

import type {Matrix} from '@pixi/math';

export interface IBone {
    data: { name: string };
    matrix: Matrix;
}

export interface IAttachment {
    id: number;
    name: string;
    type: AttachmentType;
}

export interface IVertexAttachment<Slot extends ISlot = ISlot> extends IAttachment {
    computeWorldVerticesOld(slot: Slot, worldVertices: ArrayLike<number>): void;
    computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number, stride: number): void;
    worldVerticesLength: number;
}

export interface IClippingAttachment extends IVertexAttachment {
    endSlot?: ISlotData;
}

export interface IRegionAttachment extends IAttachment {
    region: TextureRegion;
    color: Color;
    x, y, scaleX, scaleY, rotation, width, height: number;
}

export interface IMeshAttachment extends IVertexAttachment {
    region: TextureRegion;
    color: Color;
    regionUVs: Float32Array,
    triangles: number[],
}

export interface ISlotData {
    index: number;
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
    bones: Bone[]
    slots: Slot[]
    drawOrder: Slot[]
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
