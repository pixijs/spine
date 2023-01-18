import { VertexAttachment } from './Attachment';
import { AttachmentType, Color, MathUtils, Vector2 } from '@pixi/spine-base';
import type { Bone } from '../Bone';

/**
 * @public
 */
export class PointAttachment extends VertexAttachment {
    type = AttachmentType.Point;
    x: number;
    y: number;
    rotation: number;
    color = new Color(0.38, 0.94, 0, 1);

    constructor(name: string) {
        super(name);
    }

    computeWorldPosition(bone: Bone, point: Vector2) {
        const mat = bone.matrix;

        point.x = this.x * mat.a + this.y * mat.c + bone.worldX;
        point.y = this.x * mat.b + this.y * mat.d + bone.worldY;

        return point;
    }

    computeWorldRotation(bone: Bone) {
        const mat = bone.matrix;
        const cos = MathUtils.cosDeg(this.rotation);
        const sin = MathUtils.sinDeg(this.rotation);
        const x = cos * mat.a + sin * mat.c;
        const y = cos * mat.b + sin * mat.d;

        return Math.atan2(y, x) * MathUtils.radDeg;
    }
}
