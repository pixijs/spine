import {Updatable} from "./Updatable";

/**
 * @public
 */
export interface Constraint extends Updatable {
    getOrder(): number;
}
