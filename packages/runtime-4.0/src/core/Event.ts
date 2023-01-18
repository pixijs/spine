import type { EventData } from './EventData';
import type { IEvent } from '@pixi/spine-base';

/** Stores the current pose values for an {@link Event}.
 *
 * See Timeline {@link Timeline#apply()},
 * AnimationStateListener {@link AnimationStateListener#event()}, and
 * [Events](http://esotericsoftware.com/spine-events) in the Spine User Guide.
 * @public
 * */
export class Event implements IEvent {
    data: EventData;
    intValue: number;
    floatValue: number;
    stringValue: string;
    time: number;
    volume: number;
    balance: number;

    constructor(time: number, data: EventData) {
        if (data == null) throw new Error('data cannot be null.');
        this.time = time;
        this.data = data;
    }
}
