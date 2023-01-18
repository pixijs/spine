import { ConstraintData } from './Constraint';
import type { SlotData } from './SlotData';
import type { BoneData } from './BoneData';
import type { RotateMode, PositionMode } from '@pixi/spine-base';

/**
 * @public
 */
export class PathConstraintData extends ConstraintData {
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
        super(name, 0, false);
    }
}
/**
 * @public
 */
export enum SpacingMode {
    Length,
    Fixed,
    Percent,
}
