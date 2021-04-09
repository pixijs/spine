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

namespace pixi_spine.core {
    export class MeshAttachment extends VertexAttachment {
        type = AttachmentType.Mesh;

        region: TextureRegion;
        path: string;
        regionUVs: Float32Array; uvs: ArrayLike<number>;
        triangles: Array<number>;
        color = new Color(1, 1, 1, 1);
        width: number;
        height: number;
        hullLength: number;
        edges: Array<number>;
        private parentMesh: MeshAttachment;
        tempColor = new Color(0, 0, 0, 0);

        constructor (name: string) {
            super(name);
        }

        getParentMesh () {
            return this.parentMesh;
        }

        /** @param parentMesh May be null. */
        setParentMesh (parentMesh: MeshAttachment) {
            this.parentMesh = parentMesh;
            if (parentMesh != null) {
                this.bones = parentMesh.bones;
                this.vertices = parentMesh.vertices;
                this.worldVerticesLength = parentMesh.worldVerticesLength;
                this.regionUVs = parentMesh.regionUVs;
                this.triangles = parentMesh.triangles;
                this.hullLength = parentMesh.hullLength;
                this.worldVerticesLength = parentMesh.worldVerticesLength
            }
        }

        copy (): Attachment {
            if (this.parentMesh != null) return this.newLinkedMesh();

            let copy = new MeshAttachment(this.name);
            copy.region = this.region;
            copy.path = this.path;
            copy.color.setFromColor(this.color);

            this.copyTo(copy);
            copy.regionUVs = new Float32Array(this.regionUVs.length);
            Utils.arrayCopy(this.regionUVs, 0, copy.regionUVs, 0, this.regionUVs.length);
            copy.uvs = new Array<number>(this.uvs.length);
            Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, this.uvs.length);
            copy.triangles = new Array<number>(this.triangles.length);
            Utils.arrayCopy(this.triangles, 0, copy.triangles, 0, this.triangles.length);
            copy.hullLength = this.hullLength;

            // Nonessential.
            if (this.edges != null) {
                copy.edges = new Array<number>(this.edges.length);
                Utils.arrayCopy(this.edges, 0, copy.edges, 0, this.edges.length);
            }
            copy.width = this.width;
            copy.height = this.height;

            return copy;
        }

        newLinkedMesh (): MeshAttachment {
            let copy = new MeshAttachment(this.name);
            copy.region = this.region;
            copy.path = this.path;
            copy.color.setFromColor(this.color);
            copy.deformAttachment = this.deformAttachment;
            copy.setParentMesh(this.parentMesh != null ? this.parentMesh : this);
            // copy.updateUVs();
            return copy;
        }
    }
}
