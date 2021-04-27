/**
 * @public
 */
export class EventData {
    name: string;
    intValue: number;
    floatValue: number;
    stringValue: string;
    audioPath: string;
    volume: number;
    balance: number;

    constructor (name: string) {
        this.name = name;
    }
}
