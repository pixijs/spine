import {Attachment, VertexAttachment} from "./Attachment";
import {AttachmentType, Color, Utils} from "@pixi-spine/base";

/**
 * @public
 */
export class PathAttachment extends VertexAttachment {
    type = AttachmentType.Path;
    lengths: Array<number>;
    closed = false; constantSpeed = false;
    color = new Color(1, 1, 1, 1);

    constructor (name: string) {
        super(name);
    }

    copy (): Attachment {
        let copy = new PathAttachment(this.name);
        this.copyTo(copy);
        copy.lengths = new Array<number>(this.lengths.length);
        Utils.arrayCopy(this.lengths, 0, copy.lengths, 0, this.lengths.length);
        copy.closed = closed;
        copy.constantSpeed = this.constantSpeed;
        copy.color.setFromColor(this.color);
        return copy;
    }
}
