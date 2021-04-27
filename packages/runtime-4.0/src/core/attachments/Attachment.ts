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
