import { Attachment, VertexAttachment } from './Attachment';
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

    copy(): Attachment {
        const copy = new BoundingBoxAttachment(this.name);

        this.copyTo(copy);
        copy.color.setFromColor(this.color);

        return copy;
    }
}
