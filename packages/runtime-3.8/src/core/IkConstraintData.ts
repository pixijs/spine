import { ConstraintData } from './Constraint';
import type { BoneData } from './BoneData';
import type { IIkConstraintData } from '@pixi/spine-base';

/**
 * @public
 */
export class IkConstraintData extends ConstraintData implements IIkConstraintData {
    bones = new Array<BoneData>();
    target: BoneData;
    bendDirection = 1;
    compress = false;
    stretch = false;
    uniform = false;
    mix = 1;
    softness = 0;

    constructor(name: string) {
        super(name, 0, false);
    }
}
