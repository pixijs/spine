import { AttachmentLoader, RegionAttachment, MeshAttachment, BoundingBoxAttachment, PathAttachment, PointAttachment, ClippingAttachment } from './attachments';
import type { TextureAtlas } from '@pixi-spine/base';
import type { Skin } from './Skin';

/**
 * @public
 */
export class AtlasAttachmentLoader implements AttachmentLoader {
    atlas: TextureAtlas;

    constructor(atlas: TextureAtlas) {
        this.atlas = atlas;
    }

    /** @return May be null to not load an attachment. */
    // @ts-ignore
    newRegionAttachment(skin: Skin, name: string, path: string): RegionAttachment {
        const region = this.atlas.findRegion(path);

        if (region == null) throw new Error(`Region not found in atlas: ${path} (region attachment: ${name})`);
        const attachment = new RegionAttachment(name);

        attachment.region = region;

        return attachment;
    }

    /** @return May be null to not load an attachment. */
    // @ts-ignore
    newMeshAttachment(skin: Skin, name: string, path: string): MeshAttachment {
        const region = this.atlas.findRegion(path);

        if (region == null) throw new Error(`Region not found in atlas: ${path} (mesh attachment: ${name})`);
        const attachment = new MeshAttachment(name);

        attachment.region = region;

        return attachment;
    }

    /** @return May be null to not load an attachment. */
    // @ts-ignore
    newBoundingBoxAttachment(skin: Skin, name: string): BoundingBoxAttachment {
        return new BoundingBoxAttachment(name);
    }

    /** @return May be null to not load an attachment */
    // @ts-ignore
    newPathAttachment(skin: Skin, name: string): PathAttachment {
        return new PathAttachment(name);
    }

    // @ts-ignore
    newPointAttachment(skin: Skin, name: string): PointAttachment {
        return new PointAttachment(name);
    }

    // @ts-ignore
    newClippingAttachment(skin: Skin, name: string): ClippingAttachment {
        return new ClippingAttachment(name);
    }
}
