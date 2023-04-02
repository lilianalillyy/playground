export interface Provider {
    provideList(): Promise<string[]>;
}