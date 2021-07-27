import {EventData} from "./EventData";
import {IEvent} from "@pixi-spine/base";

/**
 * @public
 */
export class Event implements IEvent {
    data: EventData;
    intValue: number;
    floatValue: number;
    stringValue: string;
    time: number;
    volume: number;
    balance: number;


    constructor(time: number, data: EventData) {
        if (data == null) throw new Error("data cannot be null.");
        this.time = time;
        this.data = data;
    }
}
