import { AttachmentType, Utils } from '@pixi/spine-base';
import type { IAttachment, NumberArrayLike } from '@pixi/spine-base';

import type { Slot } from '../Slot';

/**
 * The base class for all attachments.
 * @public
 */
export abstract class Attachment implements IAttachment {
    name: string;
    type: AttachmentType;

    constructor(name: string) {
        if (!name) throw new Error('name cannot be null.');
        this.name = name;
    }

    abstract copy(): Attachment;
}

/**
 * Base class for an attachment with vertices that are transformed by one or more bones and can be deformed by a slot's
 * {@link Slot#deform}.
 * @public
 */
export abstract class VertexAttachment extends Attachment {
    private static nextID = 0;

    /** The unique ID for this attachment. */
    id = VertexAttachment.nextID++;

    /** The bones which affect the {@link #getVertices()}. The array entries are, for each vertex, the number of bones affecting
     * the vertex followed by that many bone indices, which is the index of the bone in {@link Skeleton#bones}. Will be null
     * if this attachment has no weights. */
    bones: Array<number> | null = null;

    /** The vertex positions in the bone's coordinate system. For a non-weighted attachment, the values are `x,y`
     * entries for each vertex. For a weighted attachment, the values are `x,y,weight` entries for each bone affecting
     * each vertex. */
    vertices: NumberArrayLike = [];

    /** The maximum number of world vertex values that can be output by
     * {@link #computeWorldVertices()} using the `count` parameter. */
    worldVerticesLength = 0;

    /** Timelines for the timeline attachment are also applied to this attachment.
     * May be null if no attachment-specific timelines should be applied. */
    timelineAttachment: Attachment = this;

    constructor(name: string) {
        super(name);
    }

    computeWorldVerticesOld(slot: Slot, worldVertices: ArrayLike<number>) {
        this.computeWorldVertices(slot, 0, this.worldVerticesLength, worldVertices, 0, 2);
    }
    /** Transforms the attachment's local {@link #vertices} to world coordinates. If the slot's {@link Slot#deform} is
     * not empty, it is used to deform the vertices.
     *
     * See [World transforms](http://esotericsoftware.com/spine-runtime-skeletons#World-transforms) in the Spine
     * Runtimes Guide.
     * @param start The index of the first {@link #vertices} value to transform. Each vertex has 2 values, x and y.
     * @param count The number of world vertex values to output. Must be <= {@link #worldVerticesLength} - `start`.
     * @param worldVertices The output world vertices. Must have a length >= `offset` + `count` *
     *           `stride` / 2.
     * @param offset The `worldVertices` index to begin writing values.
     * @param stride The number of `worldVertices` entries between the value pairs written. */
    computeWorldVertices(slot: Slot, start: number, count: number, worldVertices: NumberArrayLike, offset: number, stride: number) {
        count = offset + (count >> 1) * stride;
        const skeleton = slot.bone.skeleton;
        const deformArray = slot.deform;
        let vertices = this.vertices;
        const bones = this.bones;

        if (!bones) {
            if (deformArray.length > 0) vertices = deformArray;
            const mat = slot.bone.matrix;
            const x = mat.tx;
            const y = mat.ty;
            const a = mat.a;
            const b = mat.c;
            const c = mat.b;
            const d = mat.d;

            for (let v = start, w = offset; w < count; v += 2, w += stride) {
                const vx = vertices[v];
                const vy = vertices[v + 1];

                worldVertices[w] = vx * a + vy * b + x;
                worldVertices[w + 1] = vx * c + vy * d + y;
            }

            return;
        }
        let v = 0;
        let skip = 0;

        for (let i = 0; i < start; i += 2) {
            const n = bones[v];

            v += n + 1;
            skip += n;
        }
        const skeletonBones = skeleton.bones;

        if (deformArray.length == 0) {
            for (let w = offset, b = skip * 3; w < count; w += stride) {
                let wx = 0;
                let wy = 0;
                let n = bones[v++];

                n += v;
                for (; v < n; v++, b += 3) {
                    const mat = skeletonBones[bones[v]].matrix;
                    const vx = vertices[b];
                    const vy = vertices[b + 1];
                    const weight = vertices[b + 2];

                    wx += (vx * mat.a + vy * mat.c + mat.tx) * weight;
                    wy += (vx * mat.b + vy * mat.d + mat.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        } else {
            const deform = deformArray;

            for (let w = offset, b = skip * 3, f = skip << 1; w < count; w += stride) {
                let wx = 0;
                let wy = 0;
                let n = bones[v++];

                n += v;
                for (; v < n; v++, b += 3, f += 2) {
                    const mat = skeletonBones[bones[v]].matrix;
                    const vx = vertices[b] + deform[f];
                    const vy = vertices[b + 1] + deform[f + 1];
                    const weight = vertices[b + 2];

                    wx += (vx * mat.a + vy * mat.c + mat.tx) * weight;
                    wy += (vx * mat.b + vy * mat.d + mat.ty) * weight;
                }
                worldVertices[w] = wx;
                worldVertices[w + 1] = wy;
            }
        }
    }

    /** Does not copy id (generated) or name (set on construction). **/
    copyTo(attachment: VertexAttachment) {
        if (this.bones) {
            attachment.bones = new Array<number>(this.bones.length);
            Utils.arrayCopy(this.bones, 0, attachment.bones, 0, this.bones.length);
        } else attachment.bones = null;

        if (this.vertices) {
            attachment.vertices = Utils.newFloatArray(this.vertices.length);
            Utils.arrayCopy(this.vertices, 0, attachment.vertices, 0, this.vertices.length);
        }

        attachment.worldVerticesLength = this.worldVerticesLength;
        attachment.timelineAttachment = this.timelineAttachment;
    }
}
