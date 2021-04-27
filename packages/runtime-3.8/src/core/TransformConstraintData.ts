import {BoneData} from './BoneData';
import {ConstraintData} from './Constraint';

/**
 * @public
 */
export class TransformConstraintData extends ConstraintData {
    bones = new Array<BoneData>();
    target: BoneData;
    rotateMix = 0; translateMix = 0; scaleMix = 0; shearMix = 0;
    offsetRotation = 0; offsetX = 0; offsetY = 0; offsetScaleX = 0; offsetScaleY = 0; offsetShearY = 0;
    relative = false;
    local = false;

    constructor (name: string) {
        super(name, 0, false);
    }
}
