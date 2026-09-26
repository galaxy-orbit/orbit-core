export declare class ConfigService<K = Record<string, any>> {
    private readonly config;
    private readonly internalConfig;
    private readonly cache;
    private isCacheEnabled;
    constructor(config?: Record<string, any>);
    private loadFromEnv;
    private loadFromConfig;
    private flattenObject;
    get<T = any>(propertyPath: string): T | undefined;
    get<T = any>(propertyPath: string, defaultValue: T): T;
    getOrThrow<T = any>(propertyPath: string): T;
    private getNestedValue;
    set(propertyPath: string, value: any): void;
    setEnableCache(enabled: boolean): void;
}
