export interface OnModuleInit {
    onModuleInit(): Promise<void> | void;
}
export interface OnModuleDestroy {
    onModuleDestroy(): Promise<void> | void;
}
export interface OnApplicationBootstrap {
    onApplicationBootstrap(): Promise<void> | void;
}
export interface OnApplicationShutdown {
    onApplicationShutdown(signal?: string): Promise<void> | void;
}
export interface BeforeApplicationShutdown {
    beforeApplicationShutdown(signal?: string): Promise<void> | void;
}
export declare function hasOnModuleInit(instance: any): instance is OnModuleInit;
export declare function hasOnModuleDestroy(instance: any): instance is OnModuleDestroy;
export declare function hasOnApplicationBootstrap(instance: any): instance is OnApplicationBootstrap;
export declare function hasOnApplicationShutdown(instance: any): instance is OnApplicationShutdown;
export declare function hasBeforeApplicationShutdown(instance: any): instance is BeforeApplicationShutdown;
