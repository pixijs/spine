import type { Updatable } from './Updatable';
import type { TransformConstraintData } from './TransformConstraintData';
import type { Bone } from './Bone';
import { MathUtils, Vector2 } from '@pixi-spine/base';
import type { Skeleton } from './Skeleton';

/**
 * @public
 */
export class TransformConstraint implements Updatable {
    data: TransformConstraintData;
    bones: Array<Bone>;
    target: Bone;
    rotateMix = 0;
    translateMix = 0;
    scaleMix = 0;
    shearMix = 0;
    temp = new Vector2();
    active = false;

    constructor(data: TransformConstraintData, skeleton: Skeleton) {
        if (data == null) throw new Error('data cannot be null.');
        if (skeleton == null) throw new Error('skeleton cannot be null.');
        this.data = data;
        this.rotateMix = data.rotateMix;
        this.translateMix = data.translateMix;
        this.scaleMix = data.scaleMix;
        this.shearMix = data.shearMix;
        this.bones = new Array<Bone>();
        for (let i = 0; i < data.bones.length; i++) this.bones.push(skeleton.findBone(data.bones[i].name));
        this.target = skeleton.findBone(data.target.name);
    }

    isActive() {
        return this.active;
    }

    apply() {
        this.update();
    }

    update() {
        if (this.data.local) {
            if (this.data.relative) this.applyRelativeLocal();
            else this.applyAbsoluteLocal();
        } else if (this.data.relative) this.applyRelativeWorld();
        else this.applyAbsoluteWorld();
    }

    applyAbsoluteWorld() {
        const rotateMix = this.rotateMix;
        const translateMix = this.translateMix;
        const scaleMix = this.scaleMix;
        const shearMix = this.shearMix;
        const target = this.target;
        const targetMat = target.matrix;
        const ta = targetMat.a;
        const tb = targetMat.c;
        const tc = targetMat.b;
        const td = targetMat.d;
        const degRadReflect = ta * td - tb * tc > 0 ? MathUtils.degRad : -MathUtils.degRad;
        const offsetRotation = this.data.offsetRotation * degRadReflect;
        const offsetShearY = this.data.offsetShearY * degRadReflect;
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) {
            const bone = bones[i];
            let modified = false;
            const mat = bone.matrix;

            if (rotateMix != 0) {
                const a = mat.a;
                const b = mat.c;
                const c = mat.b;
                const d = mat.d;
                let r = Math.atan2(tc, ta) - Math.atan2(c, a) + offsetRotation;

                if (r > MathUtils.PI) r -= MathUtils.PI2;
                else if (r < -MathUtils.PI) r += MathUtils.PI2;
                r *= rotateMix;
                const cos = Math.cos(r);
                const sin = Math.sin(r);

                mat.a = cos * a - sin * c;
                mat.c = cos * b - sin * d;
                mat.b = sin * a + cos * c;
                mat.d = sin * b + cos * d;
                modified = true;
            }

            if (translateMix != 0) {
                const temp = this.temp;

                target.localToWorld(temp.set(this.data.offsetX, this.data.offsetY));
                mat.tx += (temp.x - mat.tx) * translateMix;
                mat.ty += (temp.y - mat.ty) * translateMix;
                modified = true;
            }

            if (scaleMix > 0) {
                let s = Math.sqrt(mat.a * mat.a + mat.b * mat.b);
                let ts = Math.sqrt(ta * ta + tc * tc);

                if (s > 0.00001) s = (s + (ts - s + this.data.offsetScaleX) * scaleMix) / s;
                mat.a *= s;
                mat.b *= s;
                s = Math.sqrt(mat.c * mat.c + mat.d * mat.d);
                ts = Math.sqrt(tb * tb + td * td);
                if (s > 0.00001) s = (s + (ts - s + this.data.offsetScaleY) * scaleMix) / s;
                mat.c *= s;
                mat.d *= s;
                modified = true;
            }

            if (shearMix > 0) {
                const b = mat.c;
                const d = mat.d;
                const by = Math.atan2(d, b);
                let r = Math.atan2(td, tb) - Math.atan2(tc, ta) - (by - Math.atan2(mat.b, mat.a));

                if (r > MathUtils.PI) r -= MathUtils.PI2;
                else if (r < -MathUtils.PI) r += MathUtils.PI2;
                r = by + (r + offsetShearY) * shearMix;
                const s = Math.sqrt(b * b + d * d);

                mat.c = Math.cos(r) * s;
                mat.d = Math.sin(r) * s;
                modified = true;
            }

            if (modified) bone.appliedValid = false;
        }
    }

    applyRelativeWorld() {
        const rotateMix = this.rotateMix;
        const translateMix = this.translateMix;
        const scaleMix = this.scaleMix;
        const shearMix = this.shearMix;
        const target = this.target;
        const targetMat = target.matrix;
        const ta = targetMat.a;
        const tb = targetMat.c;
        const tc = targetMat.b;
        const td = targetMat.d;
        const degRadReflect = ta * td - tb * tc > 0 ? MathUtils.degRad : -MathUtils.degRad;
        const offsetRotation = this.data.offsetRotation * degRadReflect;
        const offsetShearY = this.data.offsetShearY * degRadReflect;
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) {
            const bone = bones[i];
            let modified = false;
            const mat = bone.matrix;

            if (rotateMix != 0) {
                const a = mat.a;
                const b = mat.c;
                const c = mat.b;
                const d = mat.d;
                let r = Math.atan2(tc, ta) + offsetRotation;

                if (r > MathUtils.PI) r -= MathUtils.PI2;
                else if (r < -MathUtils.PI) r += MathUtils.PI2;
                r *= rotateMix;
                const cos = Math.cos(r);
                const sin = Math.sin(r);

                mat.a = cos * a - sin * c;
                mat.c = cos * b - sin * d;
                mat.b = sin * a + cos * c;
                mat.d = sin * b + cos * d;
                modified = true;
            }

            if (translateMix != 0) {
                const temp = this.temp;

                target.localToWorld(temp.set(this.data.offsetX, this.data.offsetY));
                mat.tx += temp.x * translateMix;
                mat.ty += temp.y * translateMix;
                modified = true;
            }

            if (scaleMix > 0) {
                let s = (Math.sqrt(ta * ta + tc * tc) - 1 + this.data.offsetScaleX) * scaleMix + 1;

                mat.a *= s;
                mat.b *= s;
                s = (Math.sqrt(tb * tb + td * td) - 1 + this.data.offsetScaleY) * scaleMix + 1;
                mat.c *= s;
                mat.d *= s;
                modified = true;
            }

            if (shearMix > 0) {
                let r = Math.atan2(td, tb) - Math.atan2(tc, ta);

                if (r > MathUtils.PI) r -= MathUtils.PI2;
                else if (r < -MathUtils.PI) r += MathUtils.PI2;
                const b = mat.c;
                const d = mat.d;

                r = Math.atan2(d, b) + (r - MathUtils.PI / 2 + offsetShearY) * shearMix;
                const s = Math.sqrt(b * b + d * d);

                mat.c = Math.cos(r) * s;
                mat.d = Math.sin(r) * s;
                modified = true;
            }

            if (modified) bone.appliedValid = false;
        }
    }

    applyAbsoluteLocal() {
        const rotateMix = this.rotateMix;
        const translateMix = this.translateMix;
        const scaleMix = this.scaleMix;
        const shearMix = this.shearMix;
        const target = this.target;

        if (!target.appliedValid) target.updateAppliedTransform();
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) {
            const bone = bones[i];

            if (!bone.appliedValid) bone.updateAppliedTransform();

            let rotation = bone.arotation;

            if (rotateMix != 0) {
                let r = target.arotation - rotation + this.data.offsetRotation;

                r -= (16384 - ((16384.499999999996 - r / 360) | 0)) * 360;
                rotation += r * rotateMix;
            }

            let x = bone.ax;
            let y = bone.ay;

            if (translateMix != 0) {
                x += (target.ax - x + this.data.offsetX) * translateMix;
                y += (target.ay - y + this.data.offsetY) * translateMix;
            }

            let scaleX = bone.ascaleX;
            let scaleY = bone.ascaleY;

            if (scaleMix > 0) {
                if (scaleX > 0.00001) scaleX = (scaleX + (target.ascaleX - scaleX + this.data.offsetScaleX) * scaleMix) / scaleX;
                if (scaleY > 0.00001) scaleY = (scaleY + (target.ascaleY - scaleY + this.data.offsetScaleY) * scaleMix) / scaleY;
            }

            const shearY = bone.ashearY;

            if (shearMix > 0) {
                let r = target.ashearY - shearY + this.data.offsetShearY;

                r -= (16384 - ((16384.499999999996 - r / 360) | 0)) * 360;
                bone.shearY += r * shearMix;
            }

            bone.updateWorldTransformWith(x, y, rotation, scaleX, scaleY, bone.ashearX, shearY);
        }
    }

    applyRelativeLocal() {
        const rotateMix = this.rotateMix;
        const translateMix = this.translateMix;
        const scaleMix = this.scaleMix;
        const shearMix = this.shearMix;
        const target = this.target;

        if (!target.appliedValid) target.updateAppliedTransform();
        const bones = this.bones;

        for (let i = 0, n = bones.length; i < n; i++) {
            const bone = bones[i];

            if (!bone.appliedValid) bone.updateAppliedTransform();

            let rotation = bone.arotation;

            if (rotateMix != 0) rotation += (target.arotation + this.data.offsetRotation) * rotateMix;

            let x = bone.ax;
            let y = bone.ay;

            if (translateMix != 0) {
                x += (target.ax + this.data.offsetX) * translateMix;
                y += (target.ay + this.data.offsetY) * translateMix;
            }

            let scaleX = bone.ascaleX;
            let scaleY = bone.ascaleY;

            if (scaleMix > 0) {
                if (scaleX > 0.00001) scaleX *= (target.ascaleX - 1 + this.data.offsetScaleX) * scaleMix + 1;
                if (scaleY > 0.00001) scaleY *= (target.ascaleY - 1 + this.data.offsetScaleY) * scaleMix + 1;
            }

            let shearY = bone.ashearY;

            if (shearMix > 0) shearY += (target.ashearY + this.data.offsetShearY) * shearMix;

            bone.updateWorldTransformWith(x, y, rotation, scaleX, scaleY, bone.ashearX, shearY);
        }
    }
}
