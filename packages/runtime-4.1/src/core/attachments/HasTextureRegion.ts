import { Color, TextureRegion } from '@pixi-spine/base';
import { Sequence } from "./Sequence"

/**
 * @public
 */
export interface HasTextureRegion {
	/** The name used to find the {@link #region()}. */
	path: string;

	/** The region used to draw the attachment. After setting the region or if the region's properties are changed,
	 * {@link #updateRegion()} must be called. */
	region: TextureRegion | null;

	/** Updates any values the attachment calculates using the {@link #getRegion()}. Must be called after setting the
	 * {@link #getRegion()} or if the region's properties are changed. */
	// updateRegion (): void;

	/** The color to tint the attachment. */
	color: Color;

	sequence: Sequence | null;
}
