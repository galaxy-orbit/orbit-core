import type { DynamicModule } from '../interfaces/module.interface';
import { type ConfigModuleOptions, type ConfigFactory } from './config.interface';
export declare class ConfigModule {
    static forRoot(options?: ConfigModuleOptions): DynamicModule;
    static forFeature(factory: ConfigFactory): DynamicModule;
    private static createConfigProviders;
    private static loadEnvFile;
    private static parseEnvContent;
    private static loadEnvVars;
    private static expandVariables;
    private static validateWithZod;
}
export declare function registerAs<T extends Record<string, any>>(namespace: string, factory: () => T): (() => T) & {
    KEY: string;
};
