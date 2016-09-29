import {Updatable} from "./Updatable";
import {BoneData} from "./BoneData";
import {Skeleton} from "./Skeleton";
import {MathUtils, Vector2} from "./Utils";
/******************************************************************************
 * Spine Runtimes Software License
 * Version 2.5
 *
 * Copyright (c) 2013-2016, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable, and
 * non-transferable license to use, install, execute, and perform the Spine
 * Runtimes software and derivative works solely for personal or internal
 * use. Without the written permission of Esoteric Software (see Section 2 of
 * the Spine Software License Agreement), you may not (a) modify, translate,
 * adapt, or develop new applications using the Spine Runtimes or otherwise
 * create derivative works or improvements of the Spine Runtimes or (b) remove,
 * delete, alter, or obscure any trademarks or any copyright, trademark, patent,
 * or other intellectual property or proprietary rights notices on or in the
 * Software, including any copy thereof. Redistributions in binary or source
 * form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF
 * USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

export class Bone implements Updatable {
    static yDown: boolean = false;
    //be careful! Spine b,c is c,b in pixi matrix
    matrix = new PIXI.Matrix();

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
    x = 0; y = 0; rotation = 0; scaleX = 0; scaleY = 0; shearX = 0; shearY = 0;
    appliedRotation = 0;

    worldSignX = 0; worldSignY = 0;

    sorted = false;

    /** @param parent May be null. */
    constructor (data: BoneData, skeleton: Skeleton, parent: Bone) {
        if (data == null) throw new Error("data cannot be null.");
        if (skeleton == null) throw new Error("skeleton cannot be null.");
        this.data = data;
        this.skeleton = skeleton;
        this.parent = parent;
        this.setToSetupPose();
    }

    /** Same as {@link #updateWorldTransform()}. This method exists for Bone to implement {@link Updatable}. */
    update () {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    }

    /** Computes the world transform using the parent bone and this bone's local transform. */
    updateWorldTransform () {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    }

    /** Computes the world transform using the parent bone and the specified local transform. */
    updateWorldTransformWith (x: number, y: number, rotation: number, scaleX: number, scaleY: number, shearX: number, shearY: number) {
        this.appliedRotation = rotation;

        let rotationY = rotation + 90 + shearY;
        let la = MathUtils.cosDeg(rotation + shearX) * scaleX, lb = MathUtils.cosDeg(rotationY) * scaleY;
        let lc = MathUtils.sinDeg(rotation + shearX) * scaleX, ld = MathUtils.sinDeg(rotationY) * scaleY;

        let parent = this.parent;
        let m = this.matrix;
        if (parent == null) { // Root bone.
            let skeleton = this.skeleton;
            if (skeleton.flipX) {
                x = -x;
                la = -la;
                lb = -lb;
            }
            if (skeleton.flipY !== Bone.yDown) {
                y = -y;
                lc = -lc;
                ld = -ld;
            }
            m.a = la;
            m.c = lb;
            m.b = lc;
            m.d = ld;
            m.tx = x;
            m.ty = y;
            this.worldSignX = MathUtils.signum(scaleX);
            this.worldSignY = MathUtils.signum(scaleY);
            return;
        }

        let pa = parent.matrix.a, pb = parent.matrix.c, pc = parent.matrix.b, pd = parent.matrix.d;
        m.tx = pa * x + pb * y + parent.matrix.tx;
        m.ty = pc * x + pd * y + parent.matrix.ty;
        this.worldSignX = parent.worldSignX * MathUtils.signum(scaleX);
        this.worldSignY = parent.worldSignY * MathUtils.signum(scaleY);

        if (this.data.inheritRotation && this.data.inheritScale) {
            m.a = pa * la + pb * lc;
            m.c = pa * lb + pb * ld;
            m.b = pc * la + pd * lc;
            m.d = pc * lb + pd * ld;
        } else {
            if (this.data.inheritRotation) { // No scale inheritance.
                pa = 1;
                pb = 0;
                pc = 0;
                pd = 1;
                do {
                    let cos = MathUtils.cosDeg(parent.appliedRotation), sin = MathUtils.sinDeg(parent.appliedRotation);
                    let temp = pa * cos + pb * sin;
                    pb = pb * cos - pa * sin;
                    pa = temp;
                    temp = pc * cos + pd * sin;
                    pd = pd * cos - pc * sin;
                    pc = temp;

                    if (!parent.data.inheritRotation) break;
                    parent = parent.parent;
                } while (parent != null);
                m.a = pa * la + pb * lc;
                m.c = pa * lb + pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
            } else if (this.data.inheritScale) { // No rotation inheritance.
                pa = 1;
                pb = 0;
                pc = 0;
                pd = 1;
                do {
                    let cos = MathUtils.cosDeg(parent.appliedRotation), sin = MathUtils.sinDeg(parent.appliedRotation);
                    let psx = parent.scaleX, psy = parent.scaleY;
                    let za = cos * psx, zb = sin * psy, zc = sin * psx, zd = cos * psy;
                    let temp = pa * za + pb * zc;
                    pb = pb * zd - pa * zb;
                    pa = temp;
                    temp = pc * za + pd * zc;
                    pd = pd * zd - pc * zb;
                    pc = temp;

                    if (psx >= 0) sin = -sin;
                    temp = pa * cos + pb * sin;
                    pb = pb * cos - pa * sin;
                    pa = temp;
                    temp = pc * cos + pd * sin;
                    pd = pd * cos - pc * sin;
                    pc = temp;

                    if (!parent.data.inheritScale) break;
                    parent = parent.parent;
                } while (parent != null);
                m.a = pa * la + pb * lc;
                m.c = pa * lb + pb * ld;
                m.b = pc * la + pd * lc;
                m.d = pc * lb + pd * ld;
            } else {
                m.a = la;
                m.c = lb;
                m.b = lc;
                m.d = ld;
            }
            if (this.skeleton.flipX) {
                m.a = -m.a;
                m.c = -m.c;
            }
            if (this.skeleton.flipY !== Bone.yDown) {
                m.b = -m.b;
                m.d = -m.d;
            }
        }
    }

    setToSetupPose () {
        let data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.shearX = data.shearX;
        this.shearY = data.shearY;
    }

    getWorldRotationX () {
        return Math.atan2(this.matrix.b, this.matrix.a) * MathUtils.radDeg;
    }

    getWorldRotationY () {
        return Math.atan2(this.matrix.d, this.matrix.c) * MathUtils.radDeg;
    }

    getWorldScaleX () {
        return Math.sqrt(this.matrix.a * this.matrix.a + this.matrix.b * this.matrix.b) * this.worldSignX;
    }

    getWorldScaleY () {
        return Math.sqrt(this.matrix.c * this.matrix.c + this.matrix.d * this.matrix.d) * this.worldSignY;
    }

    worldToLocalRotationX () {
        let parent = this.parent;
        if (parent == null) return this.rotation;
        let pm = parent.matrix;
        let pa = pm.a, pb = pm.c, pc = pm.b, pd = pm.d, a = this.matrix.a, c = this.matrix.b;
        return Math.atan2(pa * c - pc * a, pd * a - pb * c) * MathUtils.radDeg;
    }

    worldToLocalRotationY () {
        let parent = this.parent;
        if (parent == null) return this.rotation;
        let pm = parent.matrix;
        let pa = pm.a, pb = pm.b, pc = pm.c, pd = pm.d, b = this.matrix.c, d = this.matrix.d;
        return Math.atan2(pa * d - pc * b, pd * b - pb * d) * MathUtils.radDeg;
    }

    rotateWorld (degrees: number) {
        let m = this.matrix;
        let a = this.matrix.a, b = m.c, c = m.b, d = m.d;
        let cos = MathUtils.cosDeg(degrees), sin = MathUtils.sinDeg(degrees);
        m.a = cos * a - sin * c;
        m.c = cos * b - sin * d;
        m.b = sin * a + cos * c;
        m.d = sin * b + cos * d;
    }

    /** Computes the local transform from the world transform. This can be useful to perform processing on the local transform
     * after the world transform has been modified directly (eg, by a constraint).
     * <p>
     * Some redundant information is lost by the world transform, such as -1,-1 scale versus 180 rotation. The computed local
     * transform values may differ from the original values but are functionally the same. */
    updateLocalTransform () {
        let parent = this.parent;
        let m = this.matrix;
        if (parent == null) {
            this.x = m.tx;
            this.y = m.ty;
            this.rotation = Math.atan2(m.b, m.a) * MathUtils.radDeg;
            this.scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
            this.scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
            let det = m.a * m.d - m.b * m.c;
            this.shearX = 0;
            this.shearY = Math.atan2(m.a * m.c + m.b * m.d, det) * MathUtils.radDeg;
            return;
        }
        let pm = parent.matrix;
        let pa = pm.a, pb = pm.c, pc = pm.b, pd = pm.d;
        let pid = 1 / (pa * pd - pb * pc);
        let dx = m.tx - pm.tx, dy = m.ty - pm.ty;
        this.x = (dx * pd * pid - dy * pb * pid);
        this.y = (dy * pa * pid - dx * pc * pid);
        let ia = pid * pd;
        let id = pid * pa;
        let ib = pid * pb;
        let ic = pid * pc;
        let ra = ia * m.a - ib * m.b;
        let rb = ia * m.c - ib * m.d;
        let rc = id * m.b - ic * m.a;
        let rd = id * m.d - ic * m.c;
        this.shearX = 0;
        this.scaleX = Math.sqrt(ra * ra + rc * rc);
        if (this.scaleX > 0.0001) {
            let det = ra * rd - rb * rc;
            this.scaleY = det / this.scaleX;
            this.shearY = Math.atan2(ra * rb + rc * rd, det) * MathUtils.radDeg;
            this.rotation = Math.atan2(rc, ra) * MathUtils.radDeg;
        } else {
            this.scaleX = 0;
            this.scaleY = Math.sqrt(rb * rb + rd * rd);
            this.shearY = 0;
            this.rotation = 90 - Math.atan2(rd, rb) * MathUtils.radDeg;
        }
        this.appliedRotation = this.rotation;
    }

    worldToLocal (world: Vector2) {
        let m = this.matrix;
        let a = m.a, b = m.c, c = m.b, d = m.d;
        let invDet = 1 / (a * d - b * c);
        let x = world.x - m.tx, y = world.y - m.ty;
        world.x = (x * d * invDet - y * b * invDet);
        world.y = (y * a * invDet - x * c * invDet);
        return world;
    }

    localToWorld (local: Vector2) {
        let m = this.matrix;
        let x = local.x, y = local.y;
        local.x = x * m.a + y * m.c + m.tx;
        local.y = x * m.b + y * m.d + m.ty;
        return local;
    }
}
