/**
 * @public
 */
export interface Updatable {
    update(): void;

    isActive(): boolean;
}
