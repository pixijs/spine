import {AttachmentType} from './AttachmentType';
import type {Color, Vector2} from './Utils';
import type {TextureRegion} from './TextureRegion';

import type {Matrix} from '@pixi/math';

/**
 * @public
 */
export interface IBone {
    data: { name: string };
    matrix: Matrix;
}

/**
 * @public
 */
export interface IAttachment {
    name: string;
    type: AttachmentType;
}

/**
 * @public
 */
export interface IVertexAttachment<Slot extends ISlot = ISlot> extends IAttachment {
    id: number;
    computeWorldVerticesOld(slot: Slot, worldVertices: ArrayLike<number>): void;
    computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number, stride: number): void;
    worldVerticesLength: number;
}

/**
 * @public
 */
export interface IClippingAttachment extends IVertexAttachment {
    endSlot?: ISlotData;
}

/**
 * @public
 */
export interface IRegionAttachment extends IAttachment {
    region: TextureRegion;
    color: Color;
    x, y, scaleX, scaleY, rotation, width, height: number;
}

/**
 * @public
 */
export interface IMeshAttachment extends IVertexAttachment {
    region: TextureRegion;
    color: Color;
    regionUVs: Float32Array,
    triangles: number[],
}

/**
 * @public
 */
export interface ISlotData {
    index: number;
}

/**
 * @public
 */
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

/**
 * @public
 */
export interface ISkeleton<Bone extends IBone = IBone, Slot extends ISlot = ISlot> {
    bones: Bone[]
    slots: Slot[]
    drawOrder: Slot[]
    updateWorldTransform (): void;
    setToSetupPose (): void;
    findSlotIndex (slotName: string): number;
    getAttachmentByName (slotName: string, attachmentName: string): IAttachment;

    setBonesToSetupPose (): void;
    setSlotsToSetupPose (): void;
    findBoneIndex (boneName: string): number;
    findSlotIndex (slotName: string): number;
    setSkinByName (skinName: string): void;
    setAttachment (slotName: string, attachmentName: string): void;
    getBounds (offset: Vector2, size: Vector2, temp: Array<number>): void;
}

/**
 * @public
 */
export interface ISkeletonParser {
    scale: number;
}

/**
 * @public
 */
export interface ISkeletonData {
    name: string;
    version: string;
    hash: string;
}

/**
 * @public
 */
export interface ITrackEntry {
    trackIndex: number;
    loop: boolean;

    delay: number; trackTime: number; trackLast: number; nextTrackLast: number; trackEnd: number; timeScale: number;
    alpha: number; mixTime: number; mixDuration: number; interruptAlpha: number; totalAlpha: number;
}

/**
 * @public
 */
export interface IAnimationState {
    update(dt: number): void;
    apply(skeleton: ISkeleton): boolean;

    setAnimation (trackIndex: number, animationName: string, loop: boolean): ITrackEntry;
    addAnimation (trackIndex: number, animationName: string, loop: boolean, delay: number): ITrackEntry;
    addEmptyAnimation (trackIndex: number, mixDuration: number, delay: number): ITrackEntry;
    setEmptyAnimations (mixDuration: number): void;
    hasAnimation(animationName: string): boolean;
    addListener (listener: IAnimationStateListener);
    removeListener (listener: IAnimationStateListener);
}

/**
 * @public
 */
export interface IAnimationStateData {
    defaultMix: number;
    setMix (fromName: string, toName: string, duration: number): void;
}

export interface IEventData {
    name: string;
}
export interface IEvent {
    time: number;
    data: IEventData;
}
export interface IAnimationStateListener {
    start? (entry: ITrackEntry): void;
    interrupt? (entry: ITrackEntry): void;
    end? (entry: ITrackEntry): void;
    dispose? (entry: ITrackEntry): void;
    complete? (entry: ITrackEntry): void;
    event? (entry: ITrackEntry, event: IEvent): void;
}
