import { Attachment, VertexAttachment } from './Attachment';
import { AttachmentType, Color, IMeshAttachment, TextureRegion, Utils } from '@pixi/spine-base';

/**
 * @public
 */
export class MeshAttachment extends VertexAttachment implements IMeshAttachment {
    type = AttachmentType.Mesh;

    region: TextureRegion;
    path: string;
    regionUVs: Float32Array;
    triangles: Array<number>;
    color = new Color(1, 1, 1, 1);
    width: number;
    height: number;
    hullLength: number;
    edges: Array<number>;
    private parentMesh: MeshAttachment;
    tempColor = new Color(0, 0, 0, 0);

    constructor(name: string) {
        super(name);
    }

    getParentMesh() {
        return this.parentMesh;
    }

    /** @param parentMesh May be null. */
    setParentMesh(parentMesh: MeshAttachment) {
        this.parentMesh = parentMesh;
        if (parentMesh != null) {
            this.bones = parentMesh.bones;
            this.vertices = parentMesh.vertices;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
        }
    }

    copy(): Attachment {
        if (this.parentMesh != null) return this.newLinkedMesh();

        const copy = new MeshAttachment(this.name);

        copy.region = this.region;
        copy.path = this.path;
        copy.color.setFromColor(this.color);

        this.copyTo(copy);
        copy.regionUVs = new Float32Array(this.regionUVs.length);
        Utils.arrayCopy(this.regionUVs, 0, copy.regionUVs, 0, this.regionUVs.length);
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

    newLinkedMesh(): MeshAttachment {
        const copy = new MeshAttachment(this.name);

        copy.region = this.region;
        copy.path = this.path;
        copy.color.setFromColor(this.color);
        copy.deformAttachment = this.deformAttachment;
        copy.setParentMesh(this.parentMesh != null ? this.parentMesh : this);
        // copy.updateUVs();

        return copy;
    }
}
