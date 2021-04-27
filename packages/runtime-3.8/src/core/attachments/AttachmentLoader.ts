
import {Skin} from '../Skin';
import type {RegionAttachment} from './RegionAttachment';
import type {MeshAttachment} from './MeshAttachment';
import type {BoundingBoxAttachment} from './BoundingBoxAttachment';
import type {PathAttachment} from './PathAttachment';
import type {PointAttachment} from './PointAttachment';
import type {ClippingAttachment} from './ClippingAttachment';

/**
 * @public
 */
export interface AttachmentLoader {
    /** @return May be null to not load an attachment. */
    newRegionAttachment (skin: Skin, name: string, path: string): RegionAttachment;

    /** @return May be null to not load an attachment. */
    newMeshAttachment (skin: Skin, name: string, path: string): MeshAttachment;

    /** @return May be null to not load an attachment. */
    newBoundingBoxAttachment (skin: Skin, name: string): BoundingBoxAttachment;

    /** @return May be null to not load an attachment */
    newPathAttachment(skin: Skin, name: string): PathAttachment;

    /** @return May be null to not load an attachment */
    newPointAttachment(skin: Skin, name: string): PointAttachment;

    /** @return May be null to not load an attachment */
    newClippingAttachment(skin: Skin, name: string): ClippingAttachment;
}
