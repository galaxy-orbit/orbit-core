import 'reflect-metadata';
import type { Type, InjectionToken } from '../interfaces/type.interface';
import type { Provider } from '../interfaces/provider.interface';
import type { ModuleMetadata, DynamicModule, ModuleImport } from '../interfaces/module.interface';
import { isForwardReference } from '../interfaces/module.interface';
import { METADATA_KEYS } from '../metadata/constants';
import { Container } from '../container/container';
import { 
  MiddlewareConsumerImpl, 
  hasConfigureMethod,
  type MiddlewareConfiguration 
} from '../middleware/middleware-consumer';

export interface CompiledModule {
  metatype: Type;
  imports: CompiledModule[];
  controllers: Type[];
  providers: Provider[];
  exports: InjectionToken[];
}

export class ModuleScanner {
  private compiledModules = new Map<Type, CompiledModule>();
  private globalProviders: Provider[] = [];

  async scan(rootModule: Type | DynamicModule): Promise<CompiledModule> {
    return this.scanModule(rootModule);
  }

  private async scanModule(module: Type | DynamicModule): Promise<CompiledModule> {
    const metatype = this.getModuleType(module);
    
    if (this.compiledModules.has(metatype)) {
      return this.compiledModules.get(metatype)!;
    }

    const metadata = this.getModuleMetadata(module);
    const imports = await this.scanImports(metadata.imports || []);
    
    const compiled: CompiledModule = {
      metatype,
      imports,
      controllers: metadata.controllers || [],
      providers: [...(metadata.providers || [])],
      exports: this.resolveExports(metadata.exports || []),
    };

    if (this.isDynamicModule(module) && module.global) {
      this.globalProviders.push(...compiled.providers);
    }

    this.compiledModules.set(metatype, compiled);
    return compiled;
  }

  private async scanImports(imports: ModuleImport[]): Promise<CompiledModule[]> {
    const result: CompiledModule[] = [];
    
    for (const importItem of imports) {
      const resolved = isForwardReference(importItem) 
        ? (importItem as any).forwardRef() 
        : typeof importItem === 'function' && !this.isModule(importItem)
          ? (importItem as () => Type | DynamicModule)()
          : importItem;
      
      const compiled = await this.scanModule(resolved as Type | DynamicModule);
      result.push(compiled);
    }
    
    return result;
  }

  private getModuleType(module: Type | DynamicModule): Type {
    return this.isDynamicModule(module) ? module.module : module;
  }

  private getModuleMetadata(module: Type | DynamicModule): ModuleMetadata {
    if (this.isDynamicModule(module)) {
      return {
        imports: module.imports,
        controllers: module.controllers,
        providers: module.providers,
        exports: module.exports,
      };
    }

    return {
      imports: Reflect.getMetadata(METADATA_KEYS.MODULE_IMPORTS, module) || [],
      controllers: Reflect.getMetadata(METADATA_KEYS.MODULE_CONTROLLERS, module) || [],
      providers: Reflect.getMetadata(METADATA_KEYS.MODULE_PROVIDERS, module) || [],
      exports: Reflect.getMetadata(METADATA_KEYS.MODULE_EXPORTS, module) || [],
    };
  }

  private resolveExports(exports: (InjectionToken | Provider)[]): InjectionToken[] {
    return exports.map(exp => {
      if (typeof exp === 'function') return exp;
      if (typeof exp === 'string' || typeof exp === 'symbol') return exp;
      if ('provide' in exp) return exp.provide;
      return exp;
    });
  }

  private isDynamicModule(module: any): module is DynamicModule {
    return module && typeof module === 'object' && 'module' in module;
  }

  private isModule(target: any): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.MODULE, target);
  }

  getGlobalProviders(): Provider[] {
    return this.globalProviders;
  }

  getAllModules(): CompiledModule[] {
    return Array.from(this.compiledModules.values());
  }
}

export class ModuleCompiler {
  private compiledModuleTypes = new Set<Type>();
  private middlewareConfigurations = new Map<Type, MiddlewareConfiguration[]>();

  constructor(
    private container: Container,
    private scanner: ModuleScanner
  ) {}

  async compile(rootModule: Type | DynamicModule): Promise<void> {
    const compiled = await this.scanner.scan(rootModule);
    
    const globalProviders = this.scanner.getGlobalProviders();
    this.container.registerMany(globalProviders);
    
    await this.compileModuleRecursive(compiled);
    
    await this.configureMiddlewares();
  }

  getMiddlewareConfigurations(): Map<Type, MiddlewareConfiguration[]> {
    return this.middlewareConfigurations;
  }

  private async configureMiddlewares(): Promise<void> {
    for (const moduleType of this.compiledModuleTypes) {
      try {
        const moduleInstance = await this.container.resolve(moduleType);
        
        if (hasConfigureMethod(moduleInstance)) {
          const consumer = new MiddlewareConsumerImpl();
          await moduleInstance.configure(consumer);
          const configs = consumer.getConfigurations();
          if (configs.length > 0) {
            this.middlewareConfigurations.set(moduleType, configs);
          }
        }
      } catch (e) {
      }
    }
  }

  private async compileModuleRecursive(compiled: CompiledModule): Promise<void> {
    if (this.compiledModuleTypes.has(compiled.metatype)) {
      return;
    }
    this.compiledModuleTypes.add(compiled.metatype);

    if (!this.container.has(compiled.metatype)) {
      this.container.register(compiled.metatype);
    }

    for (const importedModule of compiled.imports) {
      await this.compileModuleRecursive(importedModule);
    }

    const importedProviders = this.collectExportedProviders(compiled.imports);
    for (const provider of importedProviders) {
      if (!this.container.has(this.getProviderToken(provider))) {
        this.container.register(provider);
      }
    }

    for (const provider of compiled.providers) {
      if (!this.container.has(this.getProviderToken(provider))) {
        this.container.register(provider);
      }
    }

    for (const controller of compiled.controllers) {
      if (!this.container.has(controller)) {
        this.container.register(controller);
      }
    }
  }

  private collectExportedProviders(imports: CompiledModule[]): Provider[] {
    const providers: Provider[] = [];
    
    for (const importedModule of imports) {
      for (const provider of importedModule.providers) {
        const token = this.getProviderToken(provider);
        if (importedModule.exports.includes(token)) {
          providers.push(provider);
        }
      }
      
      const nestedExports = this.collectExportedProviders(importedModule.imports);
      for (const nested of nestedExports) {
        const token = this.getProviderToken(nested);
        if (importedModule.exports.includes(token)) {
          providers.push(nested);
        }
      }
    }
    
    return providers;
  }

  private getProviderToken(provider: Provider): InjectionToken {
    if (typeof provider === 'function') return provider;
    return (provider as any).provide;
  }
}
