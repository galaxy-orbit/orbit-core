export interface ConfigModuleOptions {
    isGlobal?: boolean;
    envFilePath?: string | string[];
    ignoreEnvFile?: boolean;
    ignoreEnvVars?: boolean;
    validate?: (config: Record<string, any>) => Record<string, any>;
    validationSchema?: any;
    validationOptions?: {
        allowUnknown?: boolean;
        abortEarly?: boolean;
    };
    load?: Array<() => Record<string, any> | Promise<Record<string, any>>>;
    expandVariables?: boolean;
    cache?: boolean;
}
export interface ConfigFactory<T = Record<string, any>> {
    (): T | Promise<T>;
}
export interface ConfigNamespace<T = Record<string, any>> {
    KEY: string;
    asProvider(): {
        provide: string;
        useFactory: () => T | Promise<T>;
    };
}
export declare const CONFIG_OPTIONS: unique symbol;
export declare const CONFIGURATION_TOKEN: unique symbol;
export declare const CONFIGURATION_SERVICE_TOKEN: unique symbol;
