import {Matrix} from '@pixi/math';
import {Updatable} from "./Updatable";
import {BoneData} from "./BoneData";
import {Skeleton} from "./Skeleton";
import {IBone, MathUtils, settings, TransformMode, Vector2} from "@pixi-spine/base";

/**
 * @public
 */
export class Bone implements Updatable, IBone {
    //be careful! Spine b,c is c,b in pixi matrix
    matrix = new Matrix();

    get worldX(): number {
        return this.matrix.tx;
    }

    get worldY(): number {
        return this.matrix.ty;
    }

    data: BoneData;
    skeleton: Skeleton;
    parent: Bone;
    children = new Array<Bone>();
    x = 0;
    y = 0;
    rotation = 0;
    scaleX = 0;
    scaleY = 0;
    shearX = 0;
    shearY = 0;
    ax = 0;
    ay = 0;
    arotation = 0;
    ascaleX = 0;
    ascaleY = 0;
    ashearX = 0;
    ashearY = 0;
    appliedValid = false;

    sorted = false;

    /** @param parent May be null. */
    constructor(data: BoneData, skeleton: Skeleton, parent: Bone) {
        if (data == null) throw new Error("data cannot be null.");
        if (skeleton == null) throw new Error("skeleton cannot be null.");
        this.data = data;
        this.skeleton = skeleton;
        this.parent = parent;
        this.setToSetupPose();
    }

    /** Same as {@link #updateWorldTransform()}. This method exists for Bone to implement {@link Updatable}. */
    update() {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    }

    /** Computes the world transform using the parent bone and this bone's local transform. */
    updateWorldTransform() {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    }

    /** Computes the world transform using the parent bone and the specified local transform. */
    updateWorldTransformWith(x: number, y: number, rotation: number, scaleX: number, scaleY: number, shearX: number, shearY: number) {
        this.ax = x;
        this.ay = y;
        this.arotation = rotation;
        this.ascaleX = scaleX;
        this.ascaleY = scaleY;
        this.ashearX = shearX;
        this.ashearY = shearY;
        this.appliedValid = true;

        let parent = this.parent;
        let m = this.matrix;

        let sx = this.skeleton.scaleX;
        let sy = settings.yDown? -this.skeleton.scaleY : this.skeleton.scaleY;

        if (parent == null) { // Root bone.
            let skeleton = this.skeleton;
            let rotationY = rotation + 90 + shearY;
            m.a = MathUtils.cosDeg(rotation + shearX) * scaleX * sx;
            m.c = MathUtils.cosDeg(rotationY) * scaleY * sx;
            m.b = MathUtils.sinDeg(rotation + shearX) * scaleX * sy;
            m.d = MathUtils.sinDeg(rotationY) * scaleY * sy;
            m.tx = x * sx + skeleton.x;
            m.ty = y * sy + skeleton.y;
            return;
        }

        let pa = parent.matrix.a, pb = parent.matrix.c, pc = parent.matrix.b, pd = parent.matrix.d;
        m.tx = pa * x + pb * y + parent.matrix.tx;
        m.ty = pc * x + pd * y + parent.matrix.ty;
        switch (this.data.transformMode) {
            case TransformMode.Normal: {
                let rotationY = rotation + 90 + shearY;
                let la = MathUtils.cosDeg(rotation + shearX) * scaleX;
                let lb = MathUtils.cosDeg(rotationY) * scaleY;
                let lc = MathUtils.sinDeg(rotation + shearX) * scaleX;
                let ld = MathUtils.sinDeg(rotationY) * scaleY;
                m.a = pa * la + pb * lc;
                m.c = pa * lb + pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
                return;
            }
            case TransformMode.OnlyTranslation: {
                let rotationY = rotation + 90 + shearY;
                m.a = MathUtils.cosDeg(rotation + shearX) * scaleX;
                m.c = MathUtils.cosDeg(rotationY) * scaleY;
                m.b = MathUtils.sinDeg(rotation + shearX) * scaleX;
                m.d = MathUtils.sinDeg(rotationY) * scaleY;
                break;
            }
            case TransformMode.NoRotationOrReflection: {
                let s = pa * pa + pc * pc;
                let prx = 0;
                if (s > 0.0001) {
                    s = Math.abs(pa * pd - pb * pc) / s;
                    pb = pc * s;
                    pd = pa * s;
                    prx = Math.atan2(pc, pa) * MathUtils.radDeg;
                } else {
                    pa = 0;
                    pc = 0;
                    prx = 90 - Math.atan2(pd, pb) * MathUtils.radDeg;
                }
                let rx = rotation + shearX - prx;
                let ry = rotation + shearY - prx + 90;
                let la = MathUtils.cosDeg(rx) * scaleX;
                let lb = MathUtils.cosDeg(ry) * scaleY;
                let lc = MathUtils.sinDeg(rx) * scaleX;
                let ld = MathUtils.sinDeg(ry) * scaleY;
                m.a = pa * la - pb * lc;
                m.c = pa * lb - pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
                break;
            }
            case TransformMode.NoScale:
            case TransformMode.NoScaleOrReflection: {
                let cos = MathUtils.cosDeg(rotation);
                let sin = MathUtils.sinDeg(rotation);
                let za = (pa * cos + pb * sin) / sx;
                let zc = (pc * cos + pd * sin) / sy;
                let s = Math.sqrt(za * za + zc * zc);
                if (s > 0.00001) s = 1 / s;
                za *= s;
                zc *= s;
                s = Math.sqrt(za * za + zc * zc);
                if (
                    this.data.transformMode == TransformMode.NoScale
                    && (pa * pd - pb * pc < 0) != (settings.yDown?
                    (this.skeleton.scaleX < 0 != this.skeleton.scaleY > 0) :
                        (this.skeleton.scaleX < 0 != this.skeleton.scaleY < 0))
                ) s = -s;
                let r = Math.PI / 2 + Math.atan2(zc, za);
                let zb = Math.cos(r) * s;
                let zd = Math.sin(r) * s;
                let la = MathUtils.cosDeg(shearX) * scaleX;
                let lb = MathUtils.cosDeg(90 + shearY) * scaleY;
                let lc = MathUtils.sinDeg(shearX) * scaleX;
                let ld = MathUtils.sinDeg(90 + shearY) * scaleY;
                m.a = za * la + zb * lc;
                m.c = za * lb + zb * ld;
                m.b = zc * la + zd * lc;
                m.d = zc * lb + zd * ld;
                break;
            }
        }
        m.a *= sx;
        m.c *= sx;
        m.b *= sy;
        m.d *= sy;
    }

    setToSetupPose() {
        let data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.shearX = data.shearX;
        this.shearY = data.shearY;
    }

    getWorldRotationX() {
        return Math.atan2(this.matrix.b, this.matrix.a) * MathUtils.radDeg;
    }

    getWorldRotationY() {
        return Math.atan2(this.matrix.d, this.matrix.c) * MathUtils.radDeg;
    }

    getWorldScaleX() {
        let m = this.matrix;
        return Math.sqrt(m.a * m.a + m.c * m.c);
    }

    getWorldScaleY() {
        let m = this.matrix;
        return Math.sqrt(m.b * m.b + m.d * m.d);
    }

    /** Computes the individual applied transform values from the world transform. This can be useful to perform processing using
     * the applied transform after the world transform has been modified directly (eg, by a constraint).
     * <p>
     * Some information is ambiguous in the world transform, such as -1,-1 scale versus 180 rotation. */
    updateAppliedTransform() {
        this.appliedValid = true;
        let parent = this.parent;
        let m = this.matrix;
        if (parent == null) {
            this.ax = m.tx;
            this.ay = m.ty;
            this.arotation = Math.atan2(m.b, m.a) * MathUtils.radDeg;
            this.ascaleX = Math.sqrt(m.a * m.a + m.b * m.b);
            this.ascaleY = Math.sqrt(m.c * m.c + m.d * m.d);
            this.ashearX = 0;
            this.ashearY = Math.atan2(m.a * m.c + m.b * m.d, m.a * m.d - m.b * m.c) * MathUtils.radDeg;
            return;
        }
        let pm = parent.matrix;
        let pid = 1 / (pm.a * pm.d - pm.b * pm.c);
        let dx = m.tx - pm.tx, dy = m.ty - pm.ty;
        this.ax = (dx * pm.d * pid - dy * pm.c * pid);
        this.ay = (dy * pm.a * pid - dx * pm.b * pid);
        let ia = pid * pm.d;
        let id = pid * pm.a;
        let ib = pid * pm.c;
        let ic = pid * pm.b;
        let ra = ia * m.a - ib * m.b;
        let rb = ia * m.c - ib * m.d;
        let rc = id * m.b - ic * m.a;
        let rd = id * m.d - ic * m.c;
        this.ashearX = 0;
        this.ascaleX = Math.sqrt(ra * ra + rc * rc);
        if (this.ascaleX > 0.0001) {
            let det = ra * rd - rb * rc;
            this.ascaleY = det / this.ascaleX;
            this.ashearY = Math.atan2(ra * rb + rc * rd, det) * MathUtils.radDeg;
            this.arotation = Math.atan2(rc, ra) * MathUtils.radDeg;
        } else {
            this.ascaleX = 0;
            this.ascaleY = Math.sqrt(rb * rb + rd * rd);
            this.ashearY = 0;
            this.arotation = 90 - Math.atan2(rd, rb) * MathUtils.radDeg;
        }
    }

    worldToLocal(world: Vector2) {
        let m = this.matrix;
        let a = m.a, b = m.c, c = m.b, d = m.d;
        let invDet = 1 / (a * d - b * c);
        let x = world.x - m.tx, y = world.y - m.ty;
        world.x = (x * d * invDet - y * b * invDet);
        world.y = (y * a * invDet - x * c * invDet);
        return world;
    }

    localToWorld(local: Vector2) {
        let m = this.matrix;
        let x = local.x, y = local.y;
        local.x = x * m.a + y * m.c + m.tx;
        local.y = x * m.b + y * m.d + m.ty;
        return local;
    }

    worldToLocalRotation (worldRotation: number) {
        let sin = MathUtils.sinDeg(worldRotation), cos = MathUtils.cosDeg(worldRotation);
        let mat = this.matrix;
        return Math.atan2(mat.a * sin - mat.b * cos, mat.d * cos - mat.c * sin) * MathUtils.radDeg;
    }

    localToWorldRotation (localRotation: number) {
        let sin = MathUtils.sinDeg(localRotation), cos = MathUtils.cosDeg(localRotation);
        let mat = this.matrix;
        return Math.atan2(cos * mat.b + sin * mat.d, cos * mat.a + sin * mat.c) * MathUtils.radDeg;
    }

    rotateWorld (degrees: number) {
        let mat = this.matrix;
        let a = mat.a, b = mat.c, c = mat.b, d = mat.d;
        let cos = MathUtils.cosDeg(degrees), sin = MathUtils.sinDeg(degrees);
        mat.a = cos * a - sin * c;
        mat.c = cos * b - sin * d;
        mat.b = sin * a + cos * c;
        mat.d = sin * b + cos * d;
        this.appliedValid = false;
    }
}
