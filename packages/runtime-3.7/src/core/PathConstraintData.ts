import type {SlotData} from "./SlotData";
import type {BoneData} from "./BoneData";
import { RotateMode, PositionMode, IPathConstraintData } from "@pixi-spine/base";

/**
 * @public
 */
export class PathConstraintData implements IPathConstraintData {
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
export enum SpacingMode {
    Length, Fixed, Percent
}
