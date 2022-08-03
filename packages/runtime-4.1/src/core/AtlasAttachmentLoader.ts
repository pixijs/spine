
import {
    AttachmentLoader, RegionAttachment, MeshAttachment, BoundingBoxAttachment,
    PathAttachment, PointAttachment, ClippingAttachment, Sequence
} from './attachments';
import type {TextureAtlas} from "@pixi-spine/base";
import type {Skin} from "./Skin";

/**
 * @public
 */
export class AtlasAttachmentLoader implements AttachmentLoader {
    atlas: TextureAtlas;

    constructor (atlas: TextureAtlas) {
        this.atlas = atlas;
    }

    loadSequence (name: string, basePath: string, sequence: Sequence) {
        let regions = sequence.regions;
        for (let i = 0, n = regions.length; i < n; i++) {
            let path = sequence.getPath(basePath, i);
            let region = this.atlas.findRegion(path);
            if (region == null) throw new Error("Region not found in atlas: " + path + " (sequence: " + name + ")");
            regions[i] = region;
            regions[i].renderObject = regions[i];
        }
    }

    newRegionAttachment (skin: Skin, name: string, path: string, sequence: Sequence): RegionAttachment {
        let attachment = new RegionAttachment(name, path);
        if (sequence != null) {
            this.loadSequence(name, path, sequence);
        } else {
            let region = this.atlas.findRegion(path);
            if (!region) throw new Error("Region not found in atlas: " + path + " (region attachment: " + name + ")");
            region.renderObject = region;
            attachment.region = region;
        }
        return attachment;
    }

    newMeshAttachment (skin: Skin, name: string, path: string, sequence: Sequence): MeshAttachment {
        let attachment = new MeshAttachment(name, path);
        if (sequence != null) {
            this.loadSequence(name, path, sequence);
        } else {
            let region = this.atlas.findRegion(path);
            if (!region) throw new Error("Region not found in atlas: " + path + " (mesh attachment: " + name + ")");
            region.renderObject = region;
            attachment.region = region;
        }
        return attachment;
    }

    newBoundingBoxAttachment (skin: Skin, name: string): BoundingBoxAttachment {
        return new BoundingBoxAttachment(name);
    }

    newPathAttachment (skin: Skin, name: string): PathAttachment {
        return new PathAttachment(name);
    }

    newPointAttachment (skin: Skin, name: string): PointAttachment {
        return new PointAttachment(name);
    }

    newClippingAttachment (skin: Skin, name: string): ClippingAttachment {
        return new ClippingAttachment(name);
    }
}
