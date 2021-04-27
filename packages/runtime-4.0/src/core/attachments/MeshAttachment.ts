import {Attachment, VertexAttachment} from './Attachment';
import {AttachmentType, Color, IMeshAttachment, TextureRegion, Utils} from '@pixi-spine/base';

/**
 * @public
 */
export class MeshAttachment extends VertexAttachment implements IMeshAttachment {
    type = AttachmentType.Mesh;

    region: TextureRegion;

    /** The name of the texture region for this attachment. */
    path: string;

    /** The UV pair for each vertex, normalized within the texture region. */
    regionUVs: Float32Array;

    /** Triplets of vertex indices which describe the mesh's triangulation. */
    triangles: Array<number>;

    /** The color to tint the mesh. */
    color = new Color(1, 1, 1, 1);

    /** The width of the mesh's image. Available only when nonessential data was exported. */
    width: number;

    /** The height of the mesh's image. Available only when nonessential data was exported. */
    height: number;

    /** The number of entries at the beginning of {@link #vertices} that make up the mesh hull. */
    hullLength: number;

    /** Vertex index pairs describing edges for controling triangulation. Mesh triangles will never cross edges. Only available if
     * nonessential data was exported. Triangulation is not performed at runtime. */
    edges: Array<number>;

    private parentMesh: MeshAttachment;
    tempColor = new Color(0, 0, 0, 0);

    constructor (name: string) {
        super(name);
    }

    /** The parent mesh if this is a linked mesh, else null. A linked mesh shares the {@link #bones}, {@link #vertices},
     * {@link #regionUVs}, {@link #triangles}, {@link #hullLength}, {@link #edges}, {@link #width}, and {@link #height} with the
     * parent mesh, but may have a different {@link #name} or {@link #path} (and therefore a different texture). */
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

    /** Returns a new mesh with the {@link #parentMesh} set to this mesh's parent mesh, if any, else to this mesh. **/
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
