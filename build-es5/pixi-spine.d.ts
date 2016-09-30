declare module "core/BoneData" {
    export class BoneData {
        index: number;
        name: string;
        parent: BoneData;
        length: number;
        x: number;
        y: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        shearX: number;
        shearY: number;
        inheritRotation: boolean;
        inheritScale: boolean;
        constructor(index: number, name: string, parent: BoneData);
    }
}
declare module "core/Updatable" {
    export interface Updatable {
        update(): void;
    }
}
declare module "core/Bone" {
    import { Updatable } from "core/Updatable";
    import { BoneData } from "core/BoneData";
    import { Skeleton } from "core/Skeleton";
    import { Vector2 } from "core/Utils";
    export class Bone implements Updatable {
        static yDown: boolean;
        matrix: PIXI.Matrix;
        worldX: number;
        worldY: number;
        data: BoneData;
        skeleton: Skeleton;
        parent: Bone;
        children: Bone[];
        x: number;
        y: number;
        rotation: number;
        scaleX: number;
        scaleY: number;
        shearX: number;
        shearY: number;
        appliedRotation: number;
        worldSignX: number;
        worldSignY: number;
        sorted: boolean;
        constructor(data: BoneData, skeleton: Skeleton, parent: Bone);
        update(): void;
        updateWorldTransform(): void;
        updateWorldTransformWith(x: number, y: number, rotation: number, scaleX: number, scaleY: number, shearX: number, shearY: number): void;
        setToSetupPose(): void;
        getWorldRotationX(): number;
        getWorldRotationY(): number;
        getWorldScaleX(): number;
        getWorldScaleY(): number;
        worldToLocalRotationX(): number;
        worldToLocalRotationY(): number;
        rotateWorld(degrees: number): void;
        updateLocalTransform(): void;
        worldToLocal(world: Vector2): Vector2;
        localToWorld(local: Vector2): Vector2;
    }
}
declare module "core/IkConstraintData" {
    import { BoneData } from "core/BoneData";
    export class IkConstraintData {
        name: string;
        bones: BoneData[];
        target: BoneData;
        bendDirection: number;
        mix: number;
        constructor(name: string);
    }
}
declare module "core/IkConstraint" {
    import { Updatable } from "core/Updatable";
    import { IkConstraintData } from "core/IkConstraintData";
    import { Bone } from "core/Bone";
    import { Skeleton } from "core/Skeleton";
    export class IkConstraint implements Updatable {
        data: IkConstraintData;
        bones: Array<Bone>;
        target: Bone;
        mix: number;
        bendDirection: number;
        level: number;
        constructor(data: IkConstraintData, skeleton: Skeleton);
        apply(): void;
        update(): void;
        apply1(bone: Bone, targetX: number, targetY: number, alpha: number): void;
        apply2(parent: Bone, child: Bone, targetX: number, targetY: number, bendDir: number, alpha: number): void;
    }
}
declare module "core/TransformConstraintData" {
    import { BoneData } from "core/BoneData";
    export class TransformConstraintData {
        name: string;
        bones: BoneData[];
        target: BoneData;
        rotateMix: number;
        translateMix: number;
        scaleMix: number;
        shearMix: number;
        offsetRotation: number;
        offsetX: number;
        offsetY: number;
        offsetScaleX: number;
        offsetScaleY: number;
        offsetShearY: number;
        constructor(name: string);
    }
}
declare module "core/TransformConstraint" {
    import { Updatable } from "core/Updatable";
    import { TransformConstraintData } from "core/TransformConstraintData";
    import { Bone } from "core/Bone";
    import { Vector2 } from "core/Utils";
    import { Skeleton } from "core/Skeleton";
    export class TransformConstraint implements Updatable {
        data: TransformConstraintData;
        bones: Array<Bone>;
        target: Bone;
        rotateMix: number;
        translateMix: number;
        scaleMix: number;
        shearMix: number;
        temp: Vector2;
        constructor(data: TransformConstraintData, skeleton: Skeleton);
        apply(): void;
        update(): void;
    }
}
declare module "core/PathConstraintData" {
    import { BoneData } from "core/BoneData";
    import { SlotData } from "core/SlotData";
    export class PathConstraintData {
        name: string;
        bones: BoneData[];
        target: SlotData;
        positionMode: PositionMode;
        spacingMode: SpacingMode;
        rotateMode: RotateMode;
        offsetRotation: number;
        position: number;
        spacing: number;
        rotateMix: number;
        translateMix: number;
        constructor(name: string);
    }
    export enum PositionMode {
        Fixed = 0,
        Percent = 1,
    }
    export enum SpacingMode {
        Length = 0,
        Fixed = 1,
        Percent = 2,
    }
    export enum RotateMode {
        Tangent = 0,
        Chain = 1,
        ChainScale = 2,
    }
}
declare module "core/PathConstraint" {
    import { Updatable } from "core/Updatable";
    import { PathConstraintData } from "core/PathConstraintData";
    import { Bone } from "core/Bone";
    import { Slot } from "core/Slot";
    import { Skeleton } from "core/Skeleton";
    import { PathAttachment } from "core/attachments/index";
    export class PathConstraint implements Updatable {
        static NONE: number;
        static BEFORE: number;
        static AFTER: number;
        data: PathConstraintData;
        bones: Array<Bone>;
        target: Slot;
        position: number;
        spacing: number;
        rotateMix: number;
        translateMix: number;
        spaces: number[];
        positions: number[];
        world: number[];
        curves: number[];
        lengths: number[];
        segments: number[];
        constructor(data: PathConstraintData, skeleton: Skeleton);
        apply(): void;
        update(): void;
        computeWorldPositions(path: PathAttachment, spacesCount: number, tangents: boolean, percentPosition: boolean, percentSpacing: boolean): number[];
        addBeforePosition(p: number, temp: Array<number>, i: number, out: Array<number>, o: number): void;
        addAfterPosition(p: number, temp: Array<number>, i: number, out: Array<number>, o: number): void;
        addCurvePosition(p: number, x1: number, y1: number, cx1: number, cy1: number, cx2: number, cy2: number, x2: number, y2: number, out: Array<number>, o: number, tangents: boolean): void;
    }
}
declare module "core/Skin" {
    import { Attachment } from "core/attachments/index";
    import { Skeleton } from "core/Skeleton";
    import { Map } from "core/Utils";
    export class Skin {
        name: string;
        attachments: Map<Attachment>[];
        constructor(name: string);
        addAttachment(slotIndex: number, name: string, attachment: Attachment): void;
        getAttachment(slotIndex: number, name: string): Attachment;
        attachAll(skeleton: Skeleton, oldSkin: Skin): void;
    }
}
declare module "core/EventData" {
    export class EventData {
        name: string;
        intValue: number;
        floatValue: number;
        stringValue: string;
        constructor(name: string);
    }
}
declare module "core/Event" {
    import { EventData } from "core/EventData";
    export class Event {
        data: EventData;
        intValue: number;
        floatValue: number;
        stringValue: string;
        time: number;
        constructor(time: number, data: EventData);
    }
}
declare module "core/Animation" {
    import { Event } from "core/Event";
    import { Skeleton } from "core/Skeleton";
    import { VertexAttachment } from "core/attachments/index";
    export class Animation {
        name: string;
        timelines: Array<Timeline>;
        duration: number;
        constructor(name: string, timelines: Array<Timeline>, duration: number);
        apply(skeleton: Skeleton, lastTime: number, time: number, loop: boolean, events: Array<Event>): void;
        mix(skeleton: Skeleton, lastTime: number, time: number, loop: boolean, events: Array<Event>, alpha: number): void;
        static binarySearch(values: ArrayLike<number>, target: number, step?: number): number;
        static linearSearch(values: ArrayLike<number>, target: number, step: number): number;
    }
    export interface Timeline {
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export abstract class CurveTimeline implements Timeline {
        static LINEAR: number;
        static STEPPED: number;
        static BEZIER: number;
        static BEZIER_SIZE: number;
        private curves;
        constructor(frameCount: number);
        getFrameCount(): number;
        setLinear(frameIndex: number): void;
        setStepped(frameIndex: number): void;
        getCurveType(frameIndex: number): number;
        setCurve(frameIndex: number, cx1: number, cy1: number, cx2: number, cy2: number): void;
        getCurvePercent(frameIndex: number, percent: number): number;
        abstract apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class RotateTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_ROTATION: number;
        static ROTATION: number;
        boneIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, degrees: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class TranslateTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_X: number;
        static PREV_Y: number;
        static X: number;
        static Y: number;
        boneIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, x: number, y: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class ScaleTimeline extends TranslateTimeline {
        constructor(frameCount: number);
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class ShearTimeline extends TranslateTimeline {
        constructor(frameCount: number);
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class ColorTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_R: number;
        static PREV_G: number;
        static PREV_B: number;
        static PREV_A: number;
        static R: number;
        static G: number;
        static B: number;
        static A: number;
        slotIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, r: number, g: number, b: number, a: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class AttachmentTimeline implements Timeline {
        slotIndex: number;
        frames: ArrayLike<number>;
        attachmentNames: Array<string>;
        constructor(frameCount: number);
        getFrameCount(): number;
        setFrame(frameIndex: number, time: number, attachmentName: string): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number): void;
    }
    export class EventTimeline implements Timeline {
        frames: ArrayLike<number>;
        events: Array<Event>;
        constructor(frameCount: number);
        getFrameCount(): number;
        setFrame(frameIndex: number, event: Event): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class DrawOrderTimeline implements Timeline {
        frames: ArrayLike<number>;
        drawOrders: Array<Array<number>>;
        constructor(frameCount: number);
        getFrameCount(): number;
        setFrame(frameIndex: number, time: number, drawOrder: Array<number>): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class DeformTimeline extends CurveTimeline {
        frames: ArrayLike<number>;
        frameVertices: Array<ArrayLike<number>>;
        slotIndex: number;
        attachment: VertexAttachment;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, vertices: ArrayLike<number>): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class IkConstraintTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_MIX: number;
        static PREV_BEND_DIRECTION: number;
        static MIX: number;
        static BEND_DIRECTION: number;
        ikConstraintIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, mix: number, bendDirection: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class TransformConstraintTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_ROTATE: number;
        static PREV_TRANSLATE: number;
        static PREV_SCALE: number;
        static PREV_SHEAR: number;
        static ROTATE: number;
        static TRANSLATE: number;
        static SCALE: number;
        static SHEAR: number;
        transformConstraintIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, rotateMix: number, translateMix: number, scaleMix: number, shearMix: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class PathConstraintPositionTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_VALUE: number;
        static VALUE: number;
        pathConstraintIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, value: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class PathConstraintSpacingTimeline extends PathConstraintPositionTimeline {
        constructor(frameCount: number);
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
    export class PathConstraintMixTimeline extends CurveTimeline {
        static ENTRIES: number;
        static PREV_TIME: number;
        static PREV_ROTATE: number;
        static PREV_TRANSLATE: number;
        static ROTATE: number;
        static TRANSLATE: number;
        pathConstraintIndex: number;
        frames: ArrayLike<number>;
        constructor(frameCount: number);
        setFrame(frameIndex: number, time: number, rotateMix: number, translateMix: number): void;
        apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number): void;
    }
}
declare module "core/SkeletonData" {
    import { BoneData } from "core/BoneData";
    import { SlotData } from "core/SlotData";
    import { Skin } from "core/Skin";
    import { EventData } from "core/EventData";
    import { Animation } from "core/Animation";
    import { IkConstraintData } from "core/IkConstraintData";
    import { TransformConstraintData } from "core/TransformConstraintData";
    import { PathConstraintData } from "core/PathConstraintData";
    export class SkeletonData {
        name: string;
        bones: BoneData[];
        slots: SlotData[];
        skins: Skin[];
        defaultSkin: Skin;
        events: EventData[];
        animations: Animation[];
        ikConstraints: IkConstraintData[];
        transformConstraints: TransformConstraintData[];
        pathConstraints: PathConstraintData[];
        width: number;
        height: number;
        version: string;
        hash: string;
        imagesPath: string;
        findBone(boneName: string): BoneData;
        findBoneIndex(boneName: string): number;
        findSlot(slotName: string): SlotData;
        findSlotIndex(slotName: string): number;
        findSkin(skinName: string): Skin;
        findEvent(eventDataName: string): EventData;
        findAnimation(animationName: string): Animation;
        findIkConstraint(constraintName: string): IkConstraintData;
        findTransformConstraint(constraintName: string): TransformConstraintData;
        findPathConstraint(constraintName: string): PathConstraintData;
        findPathConstraintIndex(pathConstraintName: string): number;
    }
}
declare module "core/Skeleton" {
    import { Slot } from "core/Slot";
    import { Bone } from "core/Bone";
    import { IkConstraint } from "core/IkConstraint";
    import { TransformConstraint } from "core/TransformConstraint";
    import { PathConstraint } from "core/PathConstraint";
    import { Color, Vector2 } from "core/Utils";
    import { Skin } from "core/Skin";
    import { SkeletonData } from "core/SkeletonData";
    import { Updatable } from "core/Updatable";
    import { Attachment } from "core/attachments/index";
    export class Skeleton {
        data: SkeletonData;
        bones: Array<Bone>;
        slots: Array<Slot>;
        drawOrder: Array<Slot>;
        ikConstraints: Array<IkConstraint>;
        ikConstraintsSorted: Array<IkConstraint>;
        transformConstraints: Array<TransformConstraint>;
        pathConstraints: Array<PathConstraint>;
        _updateCache: Updatable[];
        skin: Skin;
        color: Color;
        time: number;
        flipX: boolean;
        flipY: boolean;
        x: number;
        y: number;
        constructor(data: SkeletonData);
        updateCache(): void;
        sortPathConstraintAttachment(skin: Skin, slotIndex: number, slotBone: Bone): void;
        sortPathConstraintAttachmentWith(attachment: Attachment, slotBone: Bone): void;
        sortBone(bone: Bone): void;
        sortReset(bones: Array<Bone>): void;
        updateWorldTransform(): void;
        setToSetupPose(): void;
        setBonesToSetupPose(): void;
        setSlotsToSetupPose(): void;
        getRootBone(): Bone;
        findBone(boneName: string): Bone;
        findBoneIndex(boneName: string): number;
        findSlot(slotName: string): Slot;
        findSlotIndex(slotName: string): number;
        setSkinByName(skinName: string): void;
        setSkin(newSkin: Skin): void;
        getAttachmentByName(slotName: string, attachmentName: string): Attachment;
        getAttachment(slotIndex: number, attachmentName: string): Attachment;
        setAttachment(slotName: string, attachmentName: string): void;
        findIkConstraint(constraintName: string): IkConstraint;
        findTransformConstraint(constraintName: string): TransformConstraint;
        findPathConstraint(constraintName: string): PathConstraint;
        getBounds(offset: Vector2, size: Vector2): void;
        update(delta: number): void;
    }
}
declare module "core/Utils" {
    import { Skeleton } from "core/Skeleton";
    export interface Map<T> {
        [key: string]: T;
    }
    export interface Disposable {
        dispose(): void;
    }
    export class Color {
        r: number;
        g: number;
        b: number;
        a: number;
        static WHITE: Color;
        static RED: Color;
        static GREEN: Color;
        static BLUE: Color;
        static MAGENTA: Color;
        constructor(r?: number, g?: number, b?: number, a?: number);
        set(r: number, g: number, b: number, a: number): this;
        setFromColor(c: Color): this;
        setFromString(hex: string): this;
        add(r: number, g: number, b: number, a: number): this;
        clamp(): this;
    }
    export class MathUtils {
        static PI: number;
        static PI2: number;
        static radiansToDegrees: number;
        static radDeg: number;
        static degreesToRadians: number;
        static degRad: number;
        static clamp(value: number, min: number, max: number): number;
        static cosDeg(degrees: number): number;
        static sinDeg(degrees: number): number;
        static signum(value: number): number;
        static toInt(x: number): number;
        static cbrt(x: number): number;
    }
    export class Utils {
        static SUPPORTS_TYPED_ARRAYS: boolean;
        static arrayCopy<T>(source: ArrayLike<T>, sourceStart: number, dest: ArrayLike<T>, destStart: number, numElements: number): void;
        static setArraySize<T>(array: Array<T>, size: number, value?: any): Array<T>;
        static newArray<T>(size: number, defaultValue: T): Array<T>;
        static newFloatArray(size: number): ArrayLike<number>;
        static toFloatArray(array: Array<number>): Float32Array | number[];
    }
    export class DebugUtils {
        static logBones(skeleton: Skeleton): void;
    }
    export class Pool<T> {
        private items;
        private instantiator;
        constructor(instantiator: () => T);
        obtain(): T;
        free(item: T): void;
        freeAll(items: ArrayLike<T>): void;
        clear(): void;
    }
    export class Vector2 {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        set(x: number, y: number): Vector2;
        length(): number;
        normalize(): this;
    }
    export class TimeKeeper {
        maxDelta: number;
        framesPerSecond: number;
        delta: number;
        totalTime: number;
        private lastTime;
        private frameCount;
        private frameTime;
        update(): void;
    }
}
declare module "core/BlendMode" {
    export enum BlendMode {
        Normal = 0,
        Additive = 1,
        Multiply = 2,
        Screen = 3,
    }
}
declare module "core/SlotData" {
    import { BoneData } from "core/BoneData";
    import { Color } from "core/Utils";
    export class SlotData {
        index: number;
        name: string;
        boneData: BoneData;
        color: Color;
        attachmentName: string;
        blendMode: number;
        constructor(index: number, name: string, boneData: BoneData);
    }
}
declare module "core/Texture" {
    export abstract class Texture {
        protected _image: HTMLImageElement;
        constructor(image: HTMLImageElement);
        getImage(): HTMLImageElement;
        abstract setFilters(minFilter: TextureFilter, magFilter: TextureFilter): void;
        abstract setWraps(uWrap: TextureWrap, vWrap: TextureWrap): void;
        abstract dispose(): void;
        static filterFromString(text: string): TextureFilter;
        static wrapFromString(text: string): TextureWrap;
    }
    export enum TextureFilter {
        Nearest = 9728,
        Linear = 9729,
        MipMap = 9987,
        MipMapNearestNearest = 9984,
        MipMapLinearNearest = 9985,
        MipMapNearestLinear = 9986,
        MipMapLinearLinear = 9987,
    }
    export enum TextureWrap {
        MirroredRepeat = 33648,
        ClampToEdge = 33071,
        Repeat = 10497,
    }
    export class TextureRegion {
        texture: PIXI.Texture;
        size: PIXI.Rectangle;
        width: number;
        height: number;
        u: number;
        v: number;
        u2: number;
        v2: number;
        offsetX: number;
        offsetY: number;
        pixiOffsetY: number;
        spineOffsetY: number;
        originalWidth: number;
        originalHeight: number;
        x: number;
        y: number;
        rotate: boolean;
    }
}
declare module "core/Slot" {
    import { Attachment } from "core/attachments/index";
    import { SlotData } from "core/SlotData";
    import { Bone } from "core/Bone";
    import { Color } from "core/Utils";
    import { TextureRegion } from "core/Texture";
    export class Slot {
        currentMesh: any;
        currentSprite: any;
        meshes: any;
        currentMeshName: String;
        sprites: any;
        currentSpriteName: String;
        blendMode: number;
        tempRegion: TextureRegion;
        tempAttachment: Attachment;
        data: SlotData;
        bone: Bone;
        color: Color;
        attachment: Attachment;
        private attachmentTime;
        attachmentVertices: number[];
        constructor(data: SlotData, bone: Bone);
        getAttachment(): Attachment;
        setAttachment(attachment: Attachment): void;
        setAttachmentTime(time: number): void;
        getAttachmentTime(): number;
        setToSetupPose(): void;
    }
}
declare module "core/attachments/Attachment" {
    import { Slot } from "core/Slot";
    export abstract class Attachment {
        name: string;
        constructor(name: string);
    }
    export abstract class VertexAttachment extends Attachment {
        bones: Array<number>;
        vertices: ArrayLike<number>;
        worldVerticesLength: number;
        constructor(name: string);
        computeWorldVertices(slot: Slot, worldVertices: ArrayLike<number>): void;
        computeWorldVerticesWith(slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number): void;
        applyDeform(sourceAttachment: VertexAttachment): boolean;
    }
}
declare module "core/attachments/RegionAttachment" {
    import { Attachment } from "core/attachments/Attachment";
    import { Color } from "core/Utils";
    import { TextureRegion } from "core/Texture";
    import { Slot } from "core/Slot";
    export class RegionAttachment extends Attachment {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
        width: number;
        height: number;
        color: Color;
        path: string;
        region: TextureRegion;
        constructor(name: string);
        updateWorldVertices(slot: Slot, premultipliedAlpha: boolean): ArrayLike<number>;
    }
}
declare module "core/attachments/MeshAttachment" {
    import { VertexAttachment } from "core/attachments/Attachment";
    import { TextureRegion } from "core/Texture";
    import { Color } from "core/Utils";
    import { Slot } from "core/Slot";
    export class MeshAttachment extends VertexAttachment {
        region: TextureRegion;
        path: string;
        regionUVs: ArrayLike<number>;
        triangles: Array<number>;
        color: Color;
        hullLength: number;
        private parentMesh;
        inheritDeform: boolean;
        tempColor: Color;
        constructor(name: string);
        updateWorldVertices(slot: Slot, premultipliedAlpha: boolean): ArrayLike<number>;
        updateUVs(region: TextureRegion, uvs: ArrayLike<number>): ArrayLike<number>;
        applyDeform(sourceAttachment: VertexAttachment): boolean;
        getParentMesh(): MeshAttachment;
        setParentMesh(parentMesh: MeshAttachment): void;
    }
}
declare module "core/attachments/BoundingBoxAttachment" {
    import { VertexAttachment } from "core/attachments/Attachment";
    import { Color } from "core/Utils";
    export class BoundingBoxAttachment extends VertexAttachment {
        color: Color;
        constructor(name: string);
    }
}
declare module "core/attachments/PathAttachment" {
    import { VertexAttachment } from "core/attachments/Attachment";
    import { Color } from "core/Utils";
    export class PathAttachment extends VertexAttachment {
        lengths: Array<number>;
        closed: boolean;
        constantSpeed: boolean;
        color: Color;
        constructor(name: string);
    }
}
declare module "core/attachments/AttachmentLoader" {
    import { Skin } from "core/Skin";
    import { RegionAttachment } from "core/attachments/RegionAttachment";
    import { MeshAttachment } from "core/attachments/MeshAttachment";
    import { BoundingBoxAttachment } from "core/attachments/BoundingBoxAttachment";
    import { PathAttachment } from "core/attachments/PathAttachment";
    export interface AttachmentLoader {
        newRegionAttachment(skin: Skin, name: string, path: string): RegionAttachment;
        newMeshAttachment(skin: Skin, name: string, path: string): MeshAttachment;
        newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment;
        newPathAttachment(skin: Skin, name: string): PathAttachment;
    }
}
declare module "core/attachments/AttachmentType" {
    export enum AttachmentType {
        Region = 0,
        BoundingBox = 1,
        Mesh = 2,
        LinkedMesh = 3,
        Path = 4,
    }
}
declare module "core/attachments/index" {
    export { Attachment, VertexAttachment } from "core/attachments/Attachment";
    export { AttachmentLoader } from "core/attachments/AttachmentLoader";
    export { AttachmentType } from "core/attachments/AttachmentType";
    export { BoundingBoxAttachment } from "core/attachments/BoundingBoxAttachment";
    export { MeshAttachment } from "core/attachments/MeshAttachment";
    export { PathAttachment } from "core/attachments/PathAttachment";
    export { RegionAttachment } from "core/attachments/RegionAttachment";
}
declare module "core/AnimationStateData" {
    import { Animation } from "core/Animation";
    import { SkeletonData } from "core/SkeletonData";
    import { Map } from "core/Utils";
    export class AnimationStateData {
        skeletonData: SkeletonData;
        animationToMixTime: Map<number>;
        defaultMix: number;
        constructor(skeletonData: SkeletonData);
        setMix(fromName: string, toName: string, duration: number): void;
        setMixWith(from: Animation, to: Animation, duration: number): void;
        getMix(from: Animation, to: Animation): number;
    }
}
declare module "core/AnimationState" {
    import { Skeleton } from "core/Skeleton";
    import { Animation } from "core/Animation";
    import { AnimationStateData } from "core/AnimationStateData";
    import { Event } from "core/Event";
    export class AnimationState {
        data: AnimationStateData;
        tracks: TrackEntry[];
        events: Event[];
        timeScale: number;
        constructor(data?: AnimationStateData);
        update(delta: number): void;
        apply(skeleton: Skeleton): void;
        clearTracks(): void;
        clearTrack(trackIndex: number): void;
        freeAll(entry: TrackEntry): void;
        expandToIndex(index: number): TrackEntry;
        setCurrent(index: number, entry: TrackEntry): void;
        setAnimation(trackIndex: number, animationName: string, loop: boolean): TrackEntry;
        setAnimationWith(trackIndex: number, animation: Animation, loop: boolean): TrackEntry;
        addAnimation(trackIndex: number, animationName: string, loop: boolean, delay: number): TrackEntry;
        hasAnimation(animationName: string): boolean;
        addAnimationWith(trackIndex: number, animation: Animation, loop: boolean, delay: number): TrackEntry;
        getCurrent(trackIndex: number): TrackEntry;
        onComplete: (trackIndex: number, loopCount: number) => any;
        onEvent: (trackIndex: number, event: Event) => any;
        onStart: (trackIndex: number) => any;
        onEnd: (trackIndex: number) => any;
        private static deprecatedWarning1;
        setAnimationByName(trackIndex: number, animationName: string, loop: boolean): void;
        private static deprecatedWarning2;
        addAnimationByName(trackIndex: number, animationName: string, loop: boolean, delay: number): void;
        private static deprecatedWarning3;
        hasAnimationByName(animationName: string): boolean;
    }
    export class TrackEntry {
        next: TrackEntry;
        previous: TrackEntry;
        animation: Animation;
        loop: boolean;
        delay: number;
        time: number;
        lastTime: number;
        endTime: number;
        timeScale: number;
        mixTime: number;
        mixDuration: number;
        mix: number;
        onComplete: (trackIndex: number, loopCount: number) => any;
        onEvent: (trackIndex: number, event: Event) => any;
        onStart: (trackIndex: number) => any;
        onEnd: (trackIndex: number) => any;
        reset(): void;
        isComplete(): boolean;
    }
}
declare module "core/SkeletonBounds" {
    import { Skeleton } from "core/Skeleton";
    import { BoundingBoxAttachment } from "core/attachments/index";
    export class SkeletonBounds {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        boundingBoxes: BoundingBoxAttachment[];
        polygons: ArrayLike<number>[];
        private polygonPool;
        update(skeleton: Skeleton, updateAabb: boolean): void;
        aabbCompute(): void;
        aabbContainsPoint(x: number, y: number): boolean;
        aabbIntersectsSegment(x1: number, y1: number, x2: number, y2: number): boolean;
        aabbIntersectsSkeleton(bounds: SkeletonBounds): boolean;
        containsPoint(x: number, y: number): BoundingBoxAttachment;
        containsPointPolygon(polygon: ArrayLike<number>, x: number, y: number): boolean;
        intersectsSegment(x1: number, y1: number, x2: number, y2: number): BoundingBoxAttachment;
        intersectsSegmentPolygon(polygon: ArrayLike<number>, x1: number, y1: number, x2: number, y2: number): boolean;
        getPolygon(boundingBox: BoundingBoxAttachment): ArrayLike<number>;
        getWidth(): number;
        getHeight(): number;
    }
}
declare module "core/SkeletonJson" {
    import { SkeletonData } from "core/SkeletonData";
    import { PositionMode, SpacingMode, RotateMode } from "core/PathConstraintData";
    import { Skin } from "core/Skin";
    import { Attachment, AttachmentLoader, VertexAttachment } from "core/attachments/index";
    import { CurveTimeline } from "core/Animation";
    export class SkeletonJson {
        attachmentLoader: AttachmentLoader;
        scale: number;
        private linkedMeshes;
        constructor(attachmentLoader: AttachmentLoader);
        readSkeletonData(json: string | any): SkeletonData;
        readAttachment(map: any, skin: Skin, slotIndex: number, name: string): Attachment;
        readVertices(map: any, attachment: VertexAttachment, verticesLength: number): void;
        readAnimation(map: any, name: string, skeletonData: SkeletonData): void;
        readCurve(map: any, timeline: CurveTimeline, frameIndex: number): void;
        getValue(map: any, prop: string, defaultValue: any): any;
        static blendModeFromString(str: string): number;
        static positionModeFromString(str: string): PositionMode;
        static spacingModeFromString(str: string): SpacingMode;
        static rotateModeFromString(str: string): RotateMode;
    }
}
declare module "core/TextureAtlas" {
    import { Disposable, Map } from "core/Utils";
    import { TextureWrap, TextureRegion, TextureFilter } from "core/Texture";
    export class TextureAtlas implements Disposable {
        pages: TextureAtlasPage[];
        regions: TextureAtlasRegion[];
        constructor(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: PIXI.BaseTexture) => any) => any, callback: (obj: TextureAtlas) => any);
        addTexture(name: string, texture: PIXI.Texture): TextureAtlasRegion;
        addTextureHash(textures: Map<PIXI.Texture>, stripExtension: boolean): void;
        addSpineAtlas(atlasText: string, textureLoader: (path: string, loaderFunction: (tex: PIXI.BaseTexture) => any) => any, callback: (obj: TextureAtlas) => any): void;
        private load(atlasText, textureLoader, callback);
        findRegion(name: string): TextureAtlasRegion;
        dispose(): void;
    }
    export class TextureAtlasPage {
        name: string;
        minFilter: TextureFilter;
        magFilter: TextureFilter;
        uWrap: TextureWrap;
        vWrap: TextureWrap;
        baseTexture: PIXI.BaseTexture;
        width: number;
        height: number;
        setFilters(): void;
    }
    export class TextureAtlasRegion extends TextureRegion {
        page: TextureAtlasPage;
        name: string;
        index: number;
    }
}
declare module "core/TextureAtlasAttachmentLoader" {
    import { Skin } from "core/Skin";
    import { AttachmentLoader, BoundingBoxAttachment, MeshAttachment, PathAttachment, RegionAttachment } from "core/attachments/index";
    import { TextureAtlas } from "core/TextureAtlas";
    export class TextureAtlasAttachmentLoader implements AttachmentLoader {
        atlas: TextureAtlas;
        constructor(atlas: TextureAtlas);
        newRegionAttachment(skin: Skin, name: string, path: string): RegionAttachment;
        newMeshAttachment(skin: Skin, name: string, path: string): MeshAttachment;
        newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment;
        newPathAttachment(skin: Skin, name: string): PathAttachment;
    }
}
declare module "core/index" {
    export * from "core/attachments/index";
    export { Timeline, ColorTimeline, AttachmentTimeline, RotateTimeline, TranslateTimeline, ScaleTimeline, ShearTimeline, IkConstraintTimeline, TransformConstraintTimeline, PathConstraintPositionTimeline, PathConstraintSpacingTimeline, PathConstraintMixTimeline, DeformTimeline, DrawOrderTimeline, EventTimeline, Animation, CurveTimeline } from "core/Animation";
    export { AnimationState } from "core/AnimationState";
    export { AnimationStateData } from "core/AnimationStateData";
    export { BlendMode } from "core/BlendMode";
    export { Bone } from "core/Bone";
    export { BoneData } from "core/BoneData";
    export { Event } from "core/Event";
    export { EventData } from "core/EventData";
    export { IkConstraint } from "core/IkConstraint";
    export { IkConstraintData } from "core/IkConstraintData";
    export { PathConstraint } from "core/PathConstraint";
    export { PathConstraintData, SpacingMode, RotateMode, PositionMode } from "core/PathConstraintData";
    export { Skeleton } from "core/Skeleton";
    export { SkeletonBounds } from "core/SkeletonBounds";
    export { SkeletonData } from "core/SkeletonData";
    export { SkeletonJson } from "core/SkeletonJson";
    export { Skin } from "core/Skin";
    export { Slot } from "core/Slot";
    export { SlotData } from "core/SlotData";
    export { Texture, TextureWrap, TextureRegion, TextureFilter } from "core/Texture";
    export { TextureAtlas, TextureAtlasRegion } from "core/TextureAtlas";
    export { TextureAtlasAttachmentLoader } from "core/TextureAtlasAttachmentLoader";
    export { TransformConstraint } from "core/TransformConstraint";
    export { TransformConstraintData } from "core/TransformConstraintData";
    export { Updatable } from "core/Updatable";
    export { Disposable, Map, Utils, Pool, MathUtils, Color, Vector2 } from "core/Utils";
}
declare module "loaders" {
    export function atlasParser(): (resource: PIXI.loaders.Resource, next: () => any) => any;
    export function imageLoaderAdapter(loader: any, namePrefix: any, baseUrl: any, imageOptions: any): (line: String, callback: (baseTexture: PIXI.BaseTexture) => any) => void;
    export function syncImageLoaderAdapter(baseUrl: any, crossOrigin: any): (line: any, callback: any) => void;
}
declare module "Spine" {
    import * as spine from "core/index";
    export class SpineSprite extends PIXI.Sprite {
        region: spine.TextureRegion;
        constructor(tex: PIXI.Texture);
    }
    export class SpineMesh extends PIXI.mesh.Mesh {
        region: spine.TextureRegion;
        constructor(texture: PIXI.Texture, vertices?: ArrayLike<number>, uvs?: ArrayLike<number>, indices?: ArrayLike<number>, drawMode?: number);
    }
    export class Spine extends PIXI.Container {
        static globalAutoUpdate: boolean;
        tintRgb: ArrayLike<number>;
        spineData: spine.SkeletonData;
        skeleton: spine.Skeleton;
        stateData: spine.AnimationStateData;
        state: spine.AnimationState;
        slotContainers: Array<PIXI.Container>;
        constructor(spineData: spine.SkeletonData);
        autoUpdate: boolean;
        tint: number;
        update(dt: number): void;
        private setSpriteRegion(attachment, sprite, region);
        private setMeshRegion(attachment, mesh, region);
        protected lastTime: number;
        autoUpdateTransform(): void;
        createSprite(slot: spine.Slot, attachment: spine.RegionAttachment): SpineSprite;
        createMesh(slot: spine.Slot, attachment: spine.MeshAttachment): SpineMesh;
        hackTextureBySlotIndex(slotIndex: number, texture?: PIXI.Texture, size?: PIXI.Rectangle): boolean;
        hackTextureBySlotName: (slotName: String, texture?: PIXI.Texture, size?: PIXI.Rectangle) => any;
    }
}
declare module "index" {
    import * as core from "core/index";
    import * as loaders from "loaders";
    export { core, loaders };
    export { Spine, SpineMesh, SpineSprite } from "Spine";
}
