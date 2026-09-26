import 'reflect-metadata';
import type { InjectionToken } from '../interfaces/type.interface';
import { type Provider } from '../interfaces/provider.interface';
export declare class Container {
    private providers;
    private resolutionStack;
    register<T>(provider: Provider<T>): void;
    registerMany(providers: Provider[]): void;
    has(token: InjectionToken): boolean;
    resolve<T>(token: InjectionToken<T>): Promise<T>;
    get<T>(token: InjectionToken<T>): T | undefined;
    clear(): void;
    getAllInstances(): Promise<any[]>;
    private createInstance;
    private resolveClass;
    private resolveFactory;
    private getScope;
    private isOptionalDependency;
    private getTokenName;
}
