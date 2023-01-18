import { VertexAttachment } from './Attachment';
import { AttachmentType, Color, IMeshAttachment, TextureRegion } from '@pixi/spine-base';

/**
 * @public
 */
export class MeshAttachment extends VertexAttachment implements IMeshAttachment {
    type = AttachmentType.Mesh;

    region: TextureRegion;
    path: string;
    regionUVs: Float32Array;
    uvs: ArrayLike<number>;
    triangles: Array<number>;
    color = new Color(1, 1, 1, 1);
    hullLength: number;
    private parentMesh: MeshAttachment;
    inheritDeform = false;
    tempColor = new Color(0, 0, 0, 0);

    constructor(name: string) {
        super(name);
    }

    applyDeform(sourceAttachment: VertexAttachment): boolean {
        return this == sourceAttachment || (this.inheritDeform && this.parentMesh == sourceAttachment);
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

    // computeWorldVerticesWith(slot, 0, this.worldVerticesLength, worldVertices, 0);
}
