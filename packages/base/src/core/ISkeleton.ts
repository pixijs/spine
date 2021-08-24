import {AttachmentType} from './AttachmentType';
import {IAnimation} from "./IAnimation";
import {IIkConstraintData, IPathConstraintData, ITransformConstraintData} from './IConstraint';
import type {Color, Vector2, Map} from './Utils';
import type {TextureRegion} from './TextureRegion';

import type {Matrix} from '@pixi/math';
import {BLEND_MODES} from '@pixi/constants';

/**
 * @public
 */
 export enum TransformMode {
    Normal,
    OnlyTranslation,
    NoRotationOrReflection,
    NoScale,
    NoScaleOrReflection
}

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
export interface ISkin {
    name: string;
    attachments: Array<Map<IAttachment>>;

    setAttachment (slotIndex: number, name: string, attachment: IAttachment): void;
    getAttachment (slotIndex: number, name: string): IAttachment | null;
    // attachAll (skeleton: ISkeleton, oldSkin: ISkin): void;
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
    name: string;
    boneData: IBoneData;
    color: Color;
    darkColor: Color;
    attachmentName: string;
    blendMode: BLEND_MODES;
}

/**
 * @public
 */
export interface IBoneData {
    index: number;
    name: string;
    parent: IBoneData;
    length: number;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    shearX: number;
    shearY: number;
    transformMode: TransformMode;
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
export interface ISkeleton<Bone extends IBone = IBone, Slot extends ISlot = ISlot, Skin extends ISkin = ISkin> {
    bones: Bone[]
    slots: Slot[]
    drawOrder: Slot[]
    skin: Skin;
    data: ISkeletonData;
    updateWorldTransform (): void;
    setToSetupPose (): void;
    findSlotIndex (slotName: string): number;
    getAttachmentByName (slotName: string, attachmentName: string): IAttachment;

    setBonesToSetupPose (): void;
    setSlotsToSetupPose (): void;
    findBone (boneName: string): Bone;
    findSlot (slotName: string): Slot;
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
    ikConstraints: IIkConstraintData[];
    transformConstraints: ITransformConstraintData[];
    pathConstraints: IPathConstraintData[];
    bones: IBoneData[];
    slots: ISlotData[];
    skins: ISkin[];
    defaultSkin: ISkin;
    events: IEventData[];
    animations: IAnimation[];
    version: string;
    hash: string;
    width: number;
    height: number;

    findBone(boneName: string): IBone | null;
    findBoneIndex(boneName: string): number;
    findSlot(slotName: string): ISlot | null;
    findSlotIndex (slotName: string): number;
    findSkin (skinName: string): ISkin | null;

    findIkConstraint (constraintName: string): IIkConstraintData | null;
    findTransformConstraint (constraintName: string): ITransformConstraintData | null;
    findPathConstraint (constraintName: string): IPathConstraintData | null;
    findEvent (eventDataName: string): IEventData | null;
    findAnimation (animationName: string): IAnimation | null;
}

/**
 * @public
 */
export interface ITrackEntry {
    trackIndex: number;
    loop: boolean;
    animationEnd: number;
    listener: IAnimationStateListener;

    delay: number; trackTime: number; trackLast: number; nextTrackLast: number; trackEnd: number; timeScale: number;
    alpha: number; mixTime: number; mixDuration: number; interruptAlpha: number; totalAlpha: number;
}

/**
 * @public
 */
export interface IAnimationState {
    data: IAnimationStateData;
    tracks: ITrackEntry[];
    listeners: IAnimationStateListener[];
    timeScale: number;

    update(dt: number): void;
    apply(skeleton: ISkeleton): boolean;

    setAnimation (trackIndex: number, animationName: string, loop: boolean): ITrackEntry;
    addAnimation (trackIndex: number, animationName: string, loop: boolean, delay: number): ITrackEntry;
    addEmptyAnimation (trackIndex: number, mixDuration: number, delay: number): ITrackEntry;
    setEmptyAnimation (trackIndex: number, mixDuration: number): ITrackEntry;
    setEmptyAnimations (mixDuration: number): void;
    hasAnimation(animationName: string): boolean;
    addListener (listener: IAnimationStateListener): void;
    removeListener (listener: IAnimationStateListener): void;
    clearListeners (): void;
    clearTracks (): void;
    clearTrack (index: number): void;
}

/**
 * @public
 */
export interface IAnimationStateData {
    skeletonData: ISkeletonData;
    animationToMixTime: Map<number>;
    defaultMix: number;
    setMix (fromName: string, toName: string, duration: number): void;
    setMixWith (from: Animation, to: Animation, duration: number): void;
    getMix (from: Animation, to: Animation): number;
}

/**
 * @public
 */
export interface IEventData {
    name: string;
}

/**
 * @public
 */
export interface IEvent {
    time: number;
    data: IEventData;
}

/**
 * @public
 */
export interface IAnimationStateListener {
    start? (entry: ITrackEntry): void;
    interrupt? (entry: ITrackEntry): void;
    end? (entry: ITrackEntry): void;
    dispose? (entry: ITrackEntry): void;
    complete? (entry: ITrackEntry): void;
    event? (entry: ITrackEntry, event: IEvent): void;
}
