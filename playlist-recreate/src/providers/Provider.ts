export interface Provider {
    /**
     * Provides a array of queries for the Recreator.
     */
    provideList(): Promise<string[]>;
}