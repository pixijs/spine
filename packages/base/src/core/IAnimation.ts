// Those enums were moved from Animation.ts of spine 3.8 and 4.0

/** Controls how a timeline value is mixed with the setup pose value or current pose value when a timeline's `alpha`
 * < 1.
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
 * @public
 * */
export enum MixBlend {
    /** Transitions from the setup value to the timeline value (the current value is not used). Before the first key, the setup
     * value is set. */
    setup,
    /** Transitions from the current value to the timeline value. Before the first key, transitions from the current value to
     * the setup value. Timelines which perform instant transitions, such as DrawOrderTimeline or
     * AttachmentTimeline, use the setup value before the first key.
     *
     * `first` is intended for the first animations applied, not for animations layered on top of those. */
    first,
    /** Transitions from the current value to the timeline value. No change is made before the first key (the current value is
     * kept until the first key).
     *
     * `replace` is intended for animations layered on top of others, not for the first animations applied. */
    replace,
    /** Transitions from the current value to the current value plus the timeline value. No change is made before the first key
     * (the current value is kept until the first key).
     *
     * `add` is intended for animations layered on top of others, not for the first animations applied. Properties
     * keyed by additive animations must be set manually or by another animation before applying the additive animations, else
     * the property values will increase continually. */
    add
}

/** Indicates whether a timeline's `alpha` is mixing out over time toward 0 (the setup or current pose value) or
 * mixing in toward 1 (the timeline's value).
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
 * @public
 * */
export enum MixDirection {
    mixIn, mixOut
}

/**
 * @public
 */
export interface IAnimation {
    name: string;
    timelines: ITimeline[];
    duration: number;

    // apply (skeleton: ISkeleton, lastTime: number, time: number, loop: boolean, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
}

/**
 * @public
 */
export interface ITimeline {
    // apply (skeleton: ISkeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, blend: MixBlend, direction: MixDirection): void;
}
