
// These enums were moved from PathConstraintData.ts of spine 3.7, 3.8 and 4.0

/** Controls how the first bone is positioned along the path.
 *
 * See [Position mode](http://esotericsoftware.com/spine-path-constraints#Position-mode) in the Spine User Guide.
 * @public
 * */
export enum PositionMode {
    Fixed, Percent
}

/** Controls how bones are rotated, translated, and scaled to match the path.
 *
 * [Rotate mode](http://esotericsoftware.com/spine-path-constraints#Rotate-mod) in the Spine User Guide.
 * @public
 * */
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
}

/**
 * @public
 */
export interface ITransformConstraintData extends IConstraintData {
    offsetRotation: number;
    offsetX: number;
    offsetY: number;
    offsetScaleX: number;
    offsetScaleY: number;
    offsetShearY: number;
    relative: boolean;
    local: boolean;
}
