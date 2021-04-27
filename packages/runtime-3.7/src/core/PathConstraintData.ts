import type {SlotData} from "./SlotData";
import type {BoneData} from "./BoneData";

/**
 * @public
 */
export class PathConstraintData {
    name: string;
    order = 0;
    bones = new Array<BoneData>();
    target: SlotData;
    positionMode: PositionMode;
    spacingMode: SpacingMode;
    rotateMode: RotateMode;
    offsetRotation: number;
    position: number;
    spacing: number;
    rotateMix: number;
    translateMix: number;

    constructor(name: string) {
        this.name = name;
    }
}

/**
 * @public
 */
export enum PositionMode {
    Fixed, Percent
}

/**
 * @public
 */
export enum SpacingMode {
    Length, Fixed, Percent
}

/**
 * @public
 */
export enum RotateMode {
    Tangent, Chain, ChainScale
}
