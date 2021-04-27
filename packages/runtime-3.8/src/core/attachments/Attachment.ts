import {AttachmentType, Utils} from '@pixi-spine/base';
import type {IAttachment, ArrayLike} from '@pixi-spine/base';

import type {Slot} from '../Slot';

/**
 * @public
 */
export abstract class Attachment implements IAttachment {
    name: string;
    type: AttachmentType;

    constructor(name: string) {
        if (name == null) throw new Error("name cannot be null.");
        this.name = name;
    }

    abstract copy (): Attachment;
}

/**
 * @public
 */
export abstract class VertexAttachment extends Attachment {
    private static nextID = 0;

    id = (VertexAttachment.nextID++ & 65535) << 11;
    bones: Array<number>;
    vertices: ArrayLike<number>;
    worldVerticesLength = 0;
    deformAttachment: VertexAttachment = this;

    constructor(name: string) {
        super(name);
    }

    computeWorldVerticesOld(slot: Slot, worldVertices: ArrayLike<number>) {
        this.computeWorldVertices(slot, 0, this.worldVerticesLength, worldVertices, 0, 2);
    }

    /** Transforms local vertices to world coordinates.
     * @param start The index of the first local vertex value to transform. Each vertex has 2 values, x and y.
     * @param count The number of world vertex values to output. Must be <= {@link #getWorldVerticesLength()} - start.
     * @param worldVertices The output world vertices. Must have a length >= offset + count.
     * @param offset The worldVertices index to begin writing values. */
    computeWorldVertices (slot: Slot, start: number, count: number, worldVertices: ArrayLike<number>, offset: number, stride: number) {
        count = offset + (count >> 1) * stride;
        let skeleton = slot.bone.skeleton;
        let deformArray = slot.deform;
        let vertices = this.vertices;
        let bones = this.bones;
        if (bones == null) {
            if (deformArray.length > 0) vertices = deformArray;
            let mat = slot.bone.matrix;
            let x = mat.tx;
            let y = mat.ty;
            let a = mat.a, b = mat.c, c = mat.b, d = mat.d;
            for (let v = start, w = offset; w < count; v += 2, w += stride) {
                let vx = vertices[v], vy = vertices[v + 1];
                worldVertices[w] = vx * a + vy * b + x;
                worldVertices[w + 1] = vx * c + vy * d + y;
            }
            return;
        }
        let v = 0, skip = 0;
        for (let i = 0; i < start; i += 2) {
            let n = bones[v];
            v += n + 1;
            skip += n;
        }
        let skeletonBones = skeleton.bones;
        if (deformArray.length == 0) {
            for (let w = offset, b = skip * 3; w < count; w += stride) {
                let wx = 0, wy = 0;
                let n = bones[v++];
                n += v;
                for (; v < n; v++, b += 3) {
                    let mat = skeletonBones[bones[v]].matrix;
                    let vx = vertices[b], vy = vertices[b + 1], weight = vertices[b + 2];
                    wx += (vx * mat.a + vy * mat.c + mat.tx) * weight;
                    wy += (vx * mat.b + vy * mat.d + mat.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        } else {
            let deform = deformArray;
            for (let w = offset, b = skip * 3, f = skip << 1; w < count; w += stride) {
                let wx = 0, wy = 0;
                let n = bones[v++];
                n += v;
                for (; v < n; v++, b += 3, f += 2) {
                    let mat = skeletonBones[bones[v]].matrix;
                    let vx = vertices[b] + deform[f], vy = vertices[b + 1] + deform[f + 1], weight = vertices[b + 2];
                    wx += (vx * mat.a + vy * mat.c + mat.tx) * weight;
                    wy += (vx * mat.b + vy * mat.d + mat.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        }
    }

    copyTo (attachment: VertexAttachment) {
        if (this.bones != null) {
            attachment.bones = new Array<number>(this.bones.length);
            Utils.arrayCopy(this.bones, 0, attachment.bones, 0, this.bones.length);
        } else
            attachment.bones = null;

        if (this.vertices != null) {
            attachment.vertices = Utils.newFloatArray(this.vertices.length);
            Utils.arrayCopy(this.vertices, 0, attachment.vertices, 0, this.vertices.length);
        } else
            attachment.vertices = null;

        attachment.worldVerticesLength = this.worldVerticesLength;
        attachment.deformAttachment = this.deformAttachment;
    }
}
