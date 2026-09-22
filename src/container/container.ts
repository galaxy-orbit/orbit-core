import 'reflect-metadata';
import type { Type, InjectionToken } from '../interfaces/type.interface';
import {
  type Provider,
  type ClassProvider,
  type ValueProvider,
  type FactoryProvider,
  Scope,
  isClassProvider,
  isValueProvider,
  isFactoryProvider,
  isExistingProvider,
  getProviderToken,
} from '../interfaces/provider.interface';
import { Reflector } from '../metadata/reflection';
import { METADATA_KEYS } from '../metadata/constants';

interface InstanceWrapper<T = any> {
  instance?: T;
  provider: Provider<T>;
  scope: Scope;
  isResolved: boolean;
}

export class Container {
  private providers = new Map<InjectionToken, InstanceWrapper>();
  private resolutionStack = new Set<InjectionToken>();

  register<T>(provider: Provider<T>): void {
    const token = getProviderToken(provider);
    const scope = this.getScope(provider);

    this.providers.set(token, {
      provider,
      scope,
      isResolved: false,
    });
  }

  registerMany(providers: Provider[]): void {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  has(token: InjectionToken): boolean {
    return this.providers.has(token);
  }

  async resolve<T>(token: InjectionToken<T>): Promise<T> {
    const wrapper = this.providers.get(token);

    if (!wrapper) {
      if (typeof token === 'function' && Reflector.isInjectable(token)) {
        this.register(token as Type<T>);
        return this.resolve(token);
      }
      throw new Error(
        `No provider found for ${this.getTokenName(token)}. ` +
        `Make sure it is registered and decorated with @Injectable().`
      );
    }

    if (wrapper.scope === Scope.DEFAULT && wrapper.isResolved && wrapper.instance !== undefined) {
      return wrapper.instance;
    }

    if (this.resolutionStack.has(token)) {
      const chain = Array.from(this.resolutionStack).map(t => this.getTokenName(t)).join(' -> ');
      throw new Error(`Circular dependency detected: ${chain} -> ${this.getTokenName(token)}`);
    }

    this.resolutionStack.add(token);

    try {
      const instance = await this.createInstance<T>(wrapper);

      if (wrapper.scope === Scope.DEFAULT) {
        wrapper.instance = instance;
        wrapper.isResolved = true;
      }

      return instance;
    } finally {
      this.resolutionStack.delete(token);
    }
  }

  get<T>(token: InjectionToken<T>): T | undefined {
    const wrapper = this.providers.get(token);
    return wrapper?.instance;
  }

  clear(): void {
    this.providers.clear();
    this.resolutionStack.clear();
  }

  async getAllInstances(): Promise<any[]> {
    const instances: any[] = [];
    for (const [token, wrapper] of this.providers) {
      if (wrapper.isResolved && wrapper.instance !== undefined) {
        instances.push(wrapper.instance);
      } else if (wrapper.scope === Scope.DEFAULT) {
        try {
          const instance = await this.resolve(token);
          instances.push(instance);
        } catch {
        }
      }
    }
    return instances;
  }

  private async createInstance<T>(wrapper: InstanceWrapper<T>): Promise<T> {
    const { provider } = wrapper;

    if (isValueProvider(provider)) {
      return provider.useValue;
    }

    if (isFactoryProvider(provider)) {
      return this.resolveFactory(provider);
    }

    if (isExistingProvider(provider)) {
      return this.resolve(provider.useExisting);
    }

    if (isClassProvider(provider)) {
      return this.resolveClass(provider.useClass);
    }

    if (typeof provider === 'function') {
      return this.resolveClass(provider);
    }

    throw new Error(`Invalid provider: ${JSON.stringify(provider)}`);
  }

  private async resolveClass<T>(target: Type<T>): Promise<T> {
    const paramTypes = Reflector.getConstructorParams(target);
    const dependencies: any[] = [];

    for (let i = 0; i < paramTypes.length; i++) {
      const injectedToken = Reflector.getInjectionToken(target, i);
      const token = injectedToken || paramTypes[i];

      if (!token || token === Object) {
        const isOptional = this.isOptionalDependency(target, i);
        if (isOptional) {
          dependencies.push(undefined);
          continue;
        }
        throw new Error(
          `Cannot resolve dependency at index ${i} of ${target.name}. ` +
          `Consider using @Inject() decorator or check your TypeScript configuration.`
        );
      }

      const isOptional = this.isOptionalDependency(target, i);
      
      try {
        dependencies.push(await this.resolve(token));
      } catch (error) {
        if (isOptional) {
          dependencies.push(undefined);
        } else {
          throw error;
        }
      }
    }

    return new target(...dependencies);
  }

  private async resolveFactory<T>(provider: FactoryProvider<T>): Promise<T> {
    const inject = provider.inject || [];
    const dependencies: any[] = [];

    for (const token of inject) {
      dependencies.push(await this.resolve(token));
    }

    return provider.useFactory(...dependencies);
  }

  private getScope(provider: Provider): Scope {
    if (typeof provider === 'function') {
      return Reflector.getMetadata<Scope>(METADATA_KEYS.SCOPE, provider) || Scope.DEFAULT;
    }
    if (isClassProvider(provider) || isFactoryProvider(provider)) {
      return provider.scope || Scope.DEFAULT;
    }
    return Scope.DEFAULT;
  }

  private isOptionalDependency(target: Type, index: number): boolean {
    const optionalParams = Reflector.getMetadata<number[]>(METADATA_KEYS.OPTIONAL, target) || [];
    return optionalParams.includes(index);
  }

  private getTokenName(token: InjectionToken): string {
    if (typeof token === 'string') return token;
    if (typeof token === 'symbol') return token.toString();
    if (typeof token === 'function') return token.name || 'Anonymous';
    return String(token);
  }
}
