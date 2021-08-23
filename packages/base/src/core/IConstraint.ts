import {IBone, IBoneData, ISlot, ISlotData} from './ISkeleton';

/**
 * @public
 */
export enum PositionMode {
    Fixed, Percent
}

/**
 * @public
 */
export enum RotateMode {
    Tangent, Chain, ChainScale
}

/**
 * @public
 */
export interface IConstraintData {
    name: string;
    order: number;
}

/**
 * @public
 */
export interface IIkConstraint {
    data: IIkConstraintData;
    bones: IBone[];
    target: IBone;
    /** -1 | 0 | 1 */
    bendDirection: number;
    compress: boolean;
    stretch: boolean;

    /** A percentage (0-1) */
    mix: number;
}

/**
 * @public
 */
export interface IIkConstraintData extends IConstraintData {
    bones: IBoneData[];
    target: IBoneData;
    /** -1 | 0 | 1 */
    bendDirection: number;
    compress: boolean;
    stretch: boolean;
    uniform: boolean;

    /** A percentage (0-1) */
    mix: number;
}

/**
 * @public
 */
export interface IPathConstraint {
    data: IPathConstraintData;
    bones: IBone[];
    target: ISlot;
    position: number;
    spacing: number;

    spaces: number[];
    positions: number[];
    world: number[];
    curves: number[];
    lengths: number[];
    segments: number[];
}

/**
 * @public
 */
export interface IPathConstraintData extends IConstraintData {
    bones: IBoneData;
    target: ISlotData;
    positionMode: PositionMode;
    rotateMode: RotateMode;
    offsetRotation: number;
    position: number;
    spacing: number;
}

/**
 * @public
 */
export interface ITransformConstraint {
    data: ITransformConstraintData;
    bones: IBone[];
    target: IBone;
}

/**
 * @public
 */
export interface ITransformConstraintData extends IConstraintData {
    bones: IBoneData[];
    target: IBoneData;
    offsetRotation: number;
    offsetX: number;
    offsetY: number;
    offsetScaleX: number;
    offsetScaleY: number;
    offsetShearY: number;
    relative: boolean;
    local: boolean;
}
