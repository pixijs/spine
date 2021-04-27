import {ConstraintData} from "./Constraint";
import {BoneData} from "./BoneData";

/**
 * @public
 */
export class IkConstraintData extends ConstraintData {
    bones = new Array<BoneData>();
    target: BoneData;
    bendDirection = 1;
    compress = false;
    stretch = false;
    uniform = false;
    mix = 1;
    softness = 0;

    constructor (name: string) {
        super(name, 0, false);
    }
}
