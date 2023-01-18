import { VertexAttachment } from './Attachment';
import { AttachmentType, Color } from '@pixi-spine/base';

/**
 * @public
 */
export class BoundingBoxAttachment extends VertexAttachment {
    type = AttachmentType.BoundingBox;
    color = new Color(1, 1, 1, 1);

    constructor(name: string) {
        super(name);
    }
}
