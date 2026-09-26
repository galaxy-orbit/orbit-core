import 'reflect-metadata';
import type { Type, InjectionToken } from '../interfaces/type.interface';
import type { Provider } from '../interfaces/provider.interface';
import type { DynamicModule } from '../interfaces/module.interface';
import { Container } from '../container/container';
import { type MiddlewareConfiguration } from '../middleware/middleware-consumer';
export interface CompiledModule {
    metatype: Type;
    imports: CompiledModule[];
    controllers: Type[];
    providers: Provider[];
    exports: InjectionToken[];
}
export declare class ModuleScanner {
    private compiledModules;
    private globalProviders;
    scan(rootModule: Type | DynamicModule): Promise<CompiledModule>;
    private scanModule;
    private scanImports;
    private getModuleType;
    private getModuleMetadata;
    private resolveExports;
    private isDynamicModule;
    private isModule;
    getGlobalProviders(): Provider[];
    getAllModules(): CompiledModule[];
}
export declare class ModuleCompiler {
    private container;
    private scanner;
    private compiledModuleTypes;
    private middlewareConfigurations;
    constructor(container: Container, scanner: ModuleScanner);
    compile(rootModule: Type | DynamicModule): Promise<void>;
    getMiddlewareConfigurations(): Map<Type, MiddlewareConfiguration[]>;
    private configureMiddlewares;
    private compileModuleRecursive;
    private collectExportedProviders;
    private getProviderToken;
}
//# sourceMappingURL=module-scanner.d.ts.map