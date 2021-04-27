import {ConstraintData} from "./ConstraintData";
import type {SlotData} from "./SlotData";
import type {BoneData} from "./BoneData";

/** Stores the setup pose for a {@link PathConstraint}.
 *
 * See [Path constraints](http://esotericsoftware.com/spine-path-constraints) in the Spine User Guide.
 * @public
 * */
export class PathConstraintData extends ConstraintData {

    /** The bones that will be modified by this path constraint. */
    bones = new Array<BoneData>();

    /** The slot whose path attachment will be used to constrained the bones. */
    target: SlotData;

    /** The mode for positioning the first bone on the path. */
    positionMode: PositionMode;

    /** The mode for positioning the bones after the first bone on the path. */
    spacingMode: SpacingMode;

    /** The mode for adjusting the rotation of the bones. */
    rotateMode: RotateMode;

    /** An offset added to the constrained bone rotation. */
    offsetRotation: number;

    /** The position along the path. */
    position: number;

    /** The spacing between bones. */
    spacing: number;

    mixRotate = 0;
    mixX = 0;
    mixY = 0;

    constructor (name: string) {
        super(name, 0, false);
    }
}

/** Controls how the first bone is positioned along the path.
 *
 * See [Position mode](http://esotericsoftware.com/spine-path-constraints#Position-mode) in the Spine User Guide.
 * @public
 * */
export enum PositionMode {
    Fixed, Percent
}

/** Controls how bones after the first bone are positioned along the path.
 *
 * [Spacing mode](http://esotericsoftware.com/spine-path-constraints#Spacing-mode) in the Spine User Guide.
 * @public
 * */
export enum SpacingMode {
    Length, Fixed, Percent, Proportional
}

/** Controls how bones are rotated, translated, and scaled to match the path.
 *
 * [Rotate mode](http://esotericsoftware.com/spine-path-constraints#Rotate-mod) in the Spine User Guide.
 * @public
 * */
export enum RotateMode {
    Tangent, Chain, ChainScale
}
