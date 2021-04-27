import {Attachment, MeshAttachment} from './attachments';
import {BoneData} from "./BoneData";
import {ConstraintData} from "./Constraint";
import {Skeleton} from "./Skeleton";

import type {Map} from '@pixi-spine/base';

/**
 * @public
 */
export class SkinEntry {
    constructor(public slotIndex: number, public name: string, public attachment: Attachment) { }
}

/**
 * @public
 */
export class Skin {
    name: string;
    attachments = new Array<Map<Attachment>>();
    bones = Array<BoneData>();
    constraints = new Array<ConstraintData>();

    constructor (name: string) {
        if (name == null) throw new Error("name cannot be null.");
        this.name = name;
    }

    setAttachment (slotIndex: number, name: string, attachment: Attachment) {
        if (attachment == null) throw new Error("attachment cannot be null.");
        let attachments = this.attachments;
        if (slotIndex >= attachments.length) attachments.length = slotIndex + 1;
        if (!attachments[slotIndex]) attachments[slotIndex] = { };
        attachments[slotIndex][name] = attachment;
    }

    addSkin (skin: Skin) {
        for(let i = 0; i < skin.bones.length; i++) {
            let bone = skin.bones[i];
            let contained = false;
            for (let j = 0; j < this.bones.length; j++) {
                if (this.bones[j] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.bones.push(bone);
        }

        for(let i = 0; i < skin.constraints.length; i++) {
            let constraint = skin.constraints[i];
            let contained = false;
            for (let j = 0; j < this.constraints.length; j++) {
                if (this.constraints[j] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.constraints.push(constraint);
        }

        let attachments = skin.getAttachments();
        for (let i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
        }
    }

    copySkin (skin: Skin) {
        for(let i = 0; i < skin.bones.length; i++) {
            let bone = skin.bones[i];
            let contained = false;
            for (let j = 0; j < this.bones.length; j++) {
                if (this.bones[j] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.bones.push(bone);
        }

        for(let i = 0; i < skin.constraints.length; i++) {
            let constraint = skin.constraints[i];
            let contained = false;
            for (let j = 0; j < this.constraints.length; j++) {
                if (this.constraints[j] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained) this.constraints.push(constraint);
        }

        let attachments = skin.getAttachments();
        for (let i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            if (attachment.attachment == null) continue;
            if (attachment.attachment instanceof MeshAttachment) {
                attachment.attachment = attachment.attachment.newLinkedMesh();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            } else {
                attachment.attachment = attachment.attachment.copy();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            }
        }
    }

    /** @return May be null. */
    getAttachment (slotIndex: number, name: string): Attachment {
        let dictionary = this.attachments[slotIndex];
        return dictionary ? dictionary[name] : null;
    }

    removeAttachment (slotIndex: number, name: string) {
        let dictionary = this.attachments[slotIndex];
        if (dictionary) dictionary[name] = null;
    }

    getAttachments (): Array<SkinEntry> {
        let entries = new Array<SkinEntry>();
        for (var i = 0; i < this.attachments.length; i++) {
            let slotAttachments = this.attachments[i];
            if (slotAttachments) {
                for (let name in slotAttachments) {
                    let attachment = slotAttachments[name];
                    if (attachment) entries.push(new SkinEntry(i, name, attachment));
                }
            }
        }
        return entries;
    }

    getAttachmentsForSlot (slotIndex: number, attachments: Array<SkinEntry>) {
        let slotAttachments = this.attachments[slotIndex];
        if (slotAttachments) {
            for (let name in slotAttachments) {
                let attachment = slotAttachments[name];
                if (attachment) attachments.push(new SkinEntry(slotIndex, name, attachment));
            }
        }
    }

    clear () {
        this.attachments.length = 0;
        this.bones.length = 0;
        this.constraints.length = 0;
    }

    /** Attach each attachment in this skin if the corresponding attachment in the old skin is currently attached. */
    attachAll (skeleton: Skeleton, oldSkin: Skin) {
        let slotIndex = 0;
        for (let i = 0; i < skeleton.slots.length; i++) {
            let slot = skeleton.slots[i];
            let slotAttachment = slot.getAttachment();
            if (slotAttachment && slotIndex < oldSkin.attachments.length) {
                let dictionary = oldSkin.attachments[slotIndex];
                for (let key in dictionary) {
                    let skinAttachment:Attachment = dictionary[key];
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
