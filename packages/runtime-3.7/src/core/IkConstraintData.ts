import type { BoneData } from './BoneData';

/**
 * @public
 */
export class IkConstraintData {
    name: string;
    order = 0;
    bones = new Array<BoneData>();
    target: BoneData;
    bendDirection = 1;
    compress = false;
    stretch = false;
    uniform = false;
    mix = 1;

    constructor(name: string) {
        this.name = name;
    }
}
