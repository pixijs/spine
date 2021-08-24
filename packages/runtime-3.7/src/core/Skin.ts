import {Attachment} from './attachments';
import {Skeleton} from "./Skeleton";

import type {Map, ISkin} from '@pixi-spine/base';

/**
 * @public
 */
export class Skin implements ISkin {
    name: string;
    attachments = new Array<Map<Attachment>>();

    constructor(name: string) {
        if (name == null) throw new Error("name cannot be null.");
        this.name = name;
    }

    addAttachment(slotIndex: number, name: string, attachment: Attachment) {
        if (attachment == null) throw new Error("attachment cannot be null.");
        let attachments = this.attachments;
        if (slotIndex >= attachments.length) attachments.length = slotIndex + 1;
        if (!attachments[slotIndex]) attachments[slotIndex] = {};
        attachments[slotIndex][name] = attachment;
    }

    /** @return May be null. */
    getAttachment(slotIndex: number, name: string): Attachment {
        let dictionary = this.attachments[slotIndex];
        return dictionary ? dictionary[name] : null;
    }

    /** Attach each attachment in this skin if the corresponding attachment in the old skin is currently attached. */
    attachAll(skeleton: Skeleton, oldSkin: Skin) {
        let slotIndex = 0;
        for (let i = 0; i < skeleton.slots.length; i++) {
            let slot = skeleton.slots[i];
            let slotAttachment = slot.getAttachment();
            if (slotAttachment && slotIndex < oldSkin.attachments.length) {
                let dictionary = oldSkin.attachments[slotIndex];
                for (let key in dictionary) {
                    let skinAttachment: Attachment = dictionary[key];
                    if (slotAttachment == skinAttachment) {
                        let attachment = this.getAttachment(slotIndex, key);
                        if (attachment != null) slot.setAttachment(attachment);
                        break;
                    }
                }
            }
            slotIndex++;
        }
    }
}
