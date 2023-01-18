import type { ISkeletonData } from '@pixi/spine-base';
import type { Animation } from './Animation';
import type { BoneData } from './BoneData';
import type { SlotData } from './SlotData';
import type { Skin } from './Skin';
import type { EventData } from './EventData';
import type { IkConstraintData } from './IkConstraintData';
import type { TransformConstraintData } from './TransformConstraintData';
import type { PathConstraintData } from './PathConstraintData';

/**
 * @public
 */
export class SkeletonData implements ISkeletonData<BoneData, SlotData, Skin, Animation, EventData, IkConstraintData, TransformConstraintData, PathConstraintData> {
    name: string;
    bones = new Array<BoneData>(); // Ordered parents first.
    slots = new Array<SlotData>(); // Setup pose draw order.
    skins = new Array<Skin>();
    defaultSkin: Skin;
    events = new Array<EventData>();
    animations = new Array<Animation>();
    ikConstraints = new Array<IkConstraintData>();
    transformConstraints = new Array<TransformConstraintData>();
    pathConstraints = new Array<PathConstraintData>();
    x: number;
    y: number;
    width: number;
    height: number;
    version: string;
    hash: string;

    // Nonessential
    fps = 0;
    imagesPath: string;
    audioPath: string;

    findBone(boneName: string) {
        if (boneName == null) throw new Error('boneName cannot be null.');
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) {
            const bone = bones[i];

            if (bone.name == boneName) return bone;
        }

        return null;
    }

    findBoneIndex(boneName: string) {
        if (boneName == null) throw new Error('boneName cannot be null.');
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) if (bones[i].name == boneName) return i;

        return -1;
    }

    findSlot(slotName: string) {
        if (slotName == null) throw new Error('slotName cannot be null.');
        const slots = this.slots;

        for (let i = 0, n = slots.length; i < n; i++) {
            const slot = slots[i];

            if (slot.name == slotName) return slot;
        }

        return null;
    }

    findSlotIndex(slotName: string) {
        if (slotName == null) throw new Error('slotName cannot be null.');
        const slots = this.slots;

        for (let i = 0, n = slots.length; i < n; i++) if (slots[i].name == slotName) return i;

        return -1;
    }

    findSkin(skinName: string) {
        if (skinName == null) throw new Error('skinName cannot be null.');
        const skins = this.skins;

        for (let i = 0, n = skins.length; i < n; i++) {
            const skin = skins[i];

            if (skin.name == skinName) return skin;
        }

        return null;
    }

    findEvent(eventDataName: string) {
        if (eventDataName == null) throw new Error('eventDataName cannot be null.');
        const events = this.events;

        for (let i = 0, n = events.length; i < n; i++) {
            const event = events[i];

            if (event.name == eventDataName) return event;
        }

        return null;
    }

    findAnimation(animationName: string) {
        if (animationName == null) throw new Error('animationName cannot be null.');
        const animations = this.animations;

        for (let i = 0, n = animations.length; i < n; i++) {
            const animation = animations[i];

            if (animation.name == animationName) return animation;
        }

        return null;
    }

    findIkConstraint(constraintName: string) {
        if (constraintName == null) throw new Error('constraintName cannot be null.');
        const ikConstraints = this.ikConstraints;

        for (let i = 0, n = ikConstraints.length; i < n; i++) {
            const constraint = ikConstraints[i];

            if (constraint.name == constraintName) return constraint;
        }

        return null;
    }

    findTransformConstraint(constraintName: string) {
        if (constraintName == null) throw new Error('constraintName cannot be null.');
        const transformConstraints = this.transformConstraints;

        for (let i = 0, n = transformConstraints.length; i < n; i++) {
            const constraint = transformConstraints[i];

            if (constraint.name == constraintName) return constraint;
        }

        return null;
    }

    findPathConstraint(constraintName: string) {
        if (constraintName == null) throw new Error('constraintName cannot be null.');
        const pathConstraints = this.pathConstraints;

        for (let i = 0, n = pathConstraints.length; i < n; i++) {
            const constraint = pathConstraints[i];

            if (constraint.name == constraintName) return constraint;
        }

        return null;
    }

    findPathConstraintIndex(pathConstraintName: string) {
        if (pathConstraintName == null) throw new Error('pathConstraintName cannot be null.');
        const pathConstraints = this.pathConstraints;

        for (let i = 0, n = pathConstraints.length; i < n; i++) if (pathConstraints[i].name == pathConstraintName) return i;

        return -1;
    }
}
