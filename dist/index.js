// @bun
var __legacyDecorateClassTS = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1;i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __legacyDecorateParamTS = (index, decorator) => (target, key) => decorator(target, key, index);
var __legacyMetadataTS = (k, v) => {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
    return Reflect.metadata(k, v);
};
var __require = import.meta.require;

// src/index.ts
import"reflect-metadata";

// src/container/container.ts
import"reflect-metadata";

// src/interfaces/provider.interface.ts
var Scope;
((Scope2) => {
  Scope2["DEFAULT"] = "DEFAULT";
  Scope2["REQUEST"] = "REQUEST";
  Scope2["TRANSIENT"] = "TRANSIENT";
})(Scope ||= {});
function isClassProvider(provider) {
  return provider.useClass !== undefined;
}
function isValueProvider(provider) {
  return provider.useValue !== undefined;
}
function isFactoryProvider(provider) {
  return provider.useFactory !== undefined;
}
function isExistingProvider(provider) {
  return provider.useExisting !== undefined;
}
function getProviderToken(provider) {
  if (typeof provider === "function") {
    return provider;
  }
  return provider.provide;
}

// src/metadata/reflection.ts
import"reflect-metadata";

// src/metadata/constants.ts
var METADATA_KEYS = {
  INJECTABLE: "orbit:injectable",
  CONTROLLER: "orbit:controller",
  MODULE: "orbit:module",
  ROUTE_PATH: "orbit:route:path",
  ROUTE_METHOD: "orbit:route:method",
  PARAM_TYPES: "design:paramtypes",
  RETURN_TYPE: "design:returntype",
  ROUTE_PARAMS: "orbit:route:params",
  INJECT_TOKEN: "orbit:inject:token",
  SCOPE: "orbit:scope",
  OPTIONAL: "orbit:optional",
  MODULE_IMPORTS: "orbit:module:imports",
  MODULE_CONTROLLERS: "orbit:module:controllers",
  MODULE_PROVIDERS: "orbit:module:providers",
  MODULE_EXPORTS: "orbit:module:exports",
  GUARDS: "orbit:guards",
  PIPES: "orbit:pipes",
  INTERCEPTORS: "orbit:interceptors",
  EXCEPTION_FILTERS: "orbit:exception-filters"
};

// src/metadata/reflection.ts
class Reflector {
  static getMetadata(key, target) {
    return Reflect.getMetadata(key, target);
  }
  static getOwnMetadata(key, target) {
    return Reflect.getOwnMetadata(key, target);
  }
  static defineMetadata(key, value, target) {
    Reflect.defineMetadata(key, value, target);
  }
  static hasMetadata(key, target) {
    return Reflect.hasMetadata(key, target);
  }
  static getConstructorParams(target) {
    return Reflect.getMetadata(METADATA_KEYS.PARAM_TYPES, target) || [];
  }
  static isInjectable(target) {
    return Reflect.hasMetadata(METADATA_KEYS.INJECTABLE, target);
  }
  static isController(target) {
    return Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, target);
  }
  static isModule(target) {
    return Reflect.hasMetadata(METADATA_KEYS.MODULE, target);
  }
  static getControllerPath(target) {
    return Reflect.getMetadata(METADATA_KEYS.CONTROLLER, target) || "";
  }
  static getInjectionToken(target, index) {
    const tokens = Reflect.getMetadata(METADATA_KEYS.INJECT_TOKEN, target) || {};
    return tokens[index];
  }
  static getAllMethodMetadata(key, target) {
    const result = new Map;
    const prototype = target.prototype || target;
    const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor" && typeof prototype[name] === "function");
    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(key, prototype, methodName);
      if (metadata !== undefined) {
        result.set(methodName, metadata);
      }
    }
    return result;
  }
}

// src/container/container.ts
class Container {
  providers = new Map;
  resolutionStack = new Set;
  register(provider) {
    const token = getProviderToken(provider);
    const scope = this.getScope(provider);
    this.providers.set(token, {
      provider,
      scope,
      isResolved: false
    });
  }
  registerMany(providers) {
    for (const provider of providers) {
      this.register(provider);
    }
  }
  has(token) {
    return this.providers.has(token);
  }
  async resolve(token) {
    const wrapper = this.providers.get(token);
    if (!wrapper) {
      if (typeof token === "function" && Reflector.isInjectable(token)) {
        this.register(token);
        return this.resolve(token);
      }
      throw new Error(`No provider found for ${this.getTokenName(token)}. ` + `Make sure it is registered and decorated with @Injectable().`);
    }
    if (wrapper.scope === "DEFAULT" /* DEFAULT */ && wrapper.isResolved && wrapper.instance !== undefined) {
      return wrapper.instance;
    }
    if (this.resolutionStack.has(token)) {
      const chain = Array.from(this.resolutionStack).map((t) => this.getTokenName(t)).join(" -> ");
      throw new Error(`Circular dependency detected: ${chain} -> ${this.getTokenName(token)}`);
    }
    this.resolutionStack.add(token);
    try {
      const instance = await this.createInstance(wrapper);
      if (wrapper.scope === "DEFAULT" /* DEFAULT */) {
        wrapper.instance = instance;
        wrapper.isResolved = true;
      }
      return instance;
    } finally {
      this.resolutionStack.delete(token);
    }
  }
  get(token) {
    const wrapper = this.providers.get(token);
    return wrapper?.instance;
  }
  clear() {
    this.providers.clear();
    this.resolutionStack.clear();
  }
  async getAllInstances() {
    const instances = [];
    for (const [token, wrapper] of this.providers) {
      if (wrapper.isResolved && wrapper.instance !== undefined) {
        instances.push(wrapper.instance);
      } else if (wrapper.scope === "DEFAULT" /* DEFAULT */) {
        try {
          const instance = await this.resolve(token);
          instances.push(instance);
        } catch {}
      }
    }
    return instances;
  }
  async createInstance(wrapper) {
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
    if (typeof provider === "function") {
      return this.resolveClass(provider);
    }
    throw new Error(`Invalid provider: ${JSON.stringify(provider)}`);
  }
  async resolveClass(target) {
    const paramTypes = Reflector.getConstructorParams(target);
    const dependencies = [];
    for (let i = 0;i < paramTypes.length; i++) {
      const injectedToken = Reflector.getInjectionToken(target, i);
      const token = injectedToken || paramTypes[i];
      if (!token || token === Object) {
        const isOptional2 = this.isOptionalDependency(target, i);
        if (isOptional2) {
          dependencies.push(undefined);
          continue;
        }
        throw new Error(`Cannot resolve dependency at index ${i} of ${target.name}. ` + `Consider using @Inject() decorator or check your TypeScript configuration.`);
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
  async resolveFactory(provider) {
    const inject = provider.inject || [];
    const dependencies = [];
    for (const token of inject) {
      dependencies.push(await this.resolve(token));
    }
    return provider.useFactory(...dependencies);
  }
  getScope(provider) {
    if (typeof provider === "function") {
      return Reflector.getMetadata(METADATA_KEYS.SCOPE, provider) || "DEFAULT" /* DEFAULT */;
    }
    if (isClassProvider(provider) || isFactoryProvider(provider)) {
      return provider.scope || "DEFAULT" /* DEFAULT */;
    }
    return "DEFAULT" /* DEFAULT */;
  }
  isOptionalDependency(target, index) {
    const optionalParams = Reflector.getMetadata(METADATA_KEYS.OPTIONAL, target) || [];
    return optionalParams.includes(index);
  }
  getTokenName(token) {
    if (typeof token === "string")
      return token;
    if (typeof token === "symbol")
      return token.toString();
    if (typeof token === "function")
      return token.name || "Anonymous";
    return String(token);
  }
}
// src/decorators/injectable.decorator.ts
import"reflect-metadata";
function Injectable(options = {}) {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
    if (options.scope) {
      Reflect.defineMetadata(METADATA_KEYS.SCOPE, options.scope, target);
    }
  };
}
// src/decorators/inject.decorator.ts
import"reflect-metadata";
function Inject(token) {
  return (target, propertyKey, parameterIndex) => {
    const existingTokens = Reflect.getMetadata(METADATA_KEYS.INJECT_TOKEN, target) || {};
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(METADATA_KEYS.INJECT_TOKEN, existingTokens, target);
  };
}
function Optional() {
  return (target, propertyKey, parameterIndex) => {
    const existingOptional = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, target) || [];
    existingOptional.push(parameterIndex);
    Reflect.defineMetadata(METADATA_KEYS.OPTIONAL, existingOptional, target);
  };
}
// src/decorators/module.decorator.ts
import"reflect-metadata";
function Module(metadata) {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEYS.MODULE, true, target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_IMPORTS, metadata.imports || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_CONTROLLERS, metadata.controllers || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_PROVIDERS, metadata.providers || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_EXPORTS, metadata.exports || [], target);
  };
}
// src/decorators/controller.decorator.ts
import"reflect-metadata";
function Controller(prefix = "") {
  return (target) => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, prefix, target);
  };
}
// src/decorators/http-methods.decorator.ts
import"reflect-metadata";
function createRouteDecorator(method) {
  return (path = "") => {
    return (target, propertyKey, descriptor) => {
      Reflect.defineMetadata(METADATA_KEYS.ROUTE_PATH, path, target, propertyKey);
      Reflect.defineMetadata(METADATA_KEYS.ROUTE_METHOD, method, target, propertyKey);
      return descriptor;
    };
  };
}
var Get = createRouteDecorator("GET");
var Post = createRouteDecorator("POST");
var Put = createRouteDecorator("PUT");
var Patch = createRouteDecorator("PATCH");
var Delete = createRouteDecorator("DELETE");
var Head = createRouteDecorator("HEAD");
var Options = createRouteDecorator("OPTIONS");
var All = createRouteDecorator("ALL");
// src/interfaces/module.interface.ts
function forwardRef(fn) {
  return { forwardRef: fn };
}
function isForwardReference(ref) {
  return ref && typeof ref === "object" && "forwardRef" in ref;
}
// src/module/module-scanner.ts
import"reflect-metadata";

// src/middleware/middleware-consumer.ts
class MiddlewareConfigProxyImpl {
  consumer;
  middlewares;
  excludePatterns = [];
  constructor(consumer, middlewares) {
    this.consumer = consumer;
    this.middlewares = middlewares;
  }
  exclude(...routes) {
    this.excludePatterns.push(...this.normalizeRoutes(routes));
    return this;
  }
  forRoutes(...routes) {
    const config = {
      middlewares: this.middlewares,
      forRoutes: this.normalizeRoutes(routes),
      excludeRoutes: this.excludePatterns
    };
    this.consumer.addConfiguration(config);
    return this.consumer;
  }
  normalizeRoutes(routes) {
    const result = [];
    for (const route of routes) {
      if (typeof route === "string") {
        result.push({ path: route });
      } else if (typeof route === "function") {
        const controllerPath = Reflect.getMetadata("orbit:controller:path", route) || "";
        result.push({ path: controllerPath });
      } else if (Array.isArray(route)) {
        result.push(...this.normalizeRoutes(route));
      } else {
        result.push(route);
      }
    }
    return result;
  }
}

class MiddlewareConsumerImpl {
  configurations = [];
  apply(...middlewares) {
    return new MiddlewareConfigProxyImpl(this, middlewares);
  }
  addConfiguration(config) {
    this.configurations.push(config);
  }
  getConfigurations() {
    return this.configurations;
  }
}
function hasConfigureMethod(module3) {
  return module3 && typeof module3.configure === "function";
}

// src/module/module-scanner.ts
class ModuleScanner {
  compiledModules = new Map;
  globalProviders = [];
  async scan(rootModule) {
    return this.scanModule(rootModule);
  }
  async scanModule(module3) {
    const metatype = this.getModuleType(module3);
    if (this.compiledModules.has(metatype)) {
      return this.compiledModules.get(metatype);
    }
    const metadata = this.getModuleMetadata(module3);
    const imports = await this.scanImports(metadata.imports || []);
    const compiled = {
      metatype,
      imports,
      controllers: metadata.controllers || [],
      providers: [...metadata.providers || []],
      exports: this.resolveExports(metadata.exports || [])
    };
    if (this.isDynamicModule(module3) && module3.global) {
      this.globalProviders.push(...compiled.providers);
    }
    this.compiledModules.set(metatype, compiled);
    return compiled;
  }
  async scanImports(imports) {
    const result = [];
    for (const importItem of imports) {
      const resolved = isForwardReference(importItem) ? importItem.forwardRef() : typeof importItem === "function" && !this.isModule(importItem) ? importItem() : importItem;
      const compiled = await this.scanModule(resolved);
      result.push(compiled);
    }
    return result;
  }
  getModuleType(module3) {
    return this.isDynamicModule(module3) ? module3.module : module3;
  }
  getModuleMetadata(module3) {
    if (this.isDynamicModule(module3)) {
      return {
        imports: module3.imports,
        controllers: module3.controllers,
        providers: module3.providers,
        exports: module3.exports
      };
    }
    return {
      imports: Reflect.getMetadata(METADATA_KEYS.MODULE_IMPORTS, module3) || [],
      controllers: Reflect.getMetadata(METADATA_KEYS.MODULE_CONTROLLERS, module3) || [],
      providers: Reflect.getMetadata(METADATA_KEYS.MODULE_PROVIDERS, module3) || [],
      exports: Reflect.getMetadata(METADATA_KEYS.MODULE_EXPORTS, module3) || []
    };
  }
  resolveExports(exports) {
    return exports.map((exp) => {
      if (typeof exp === "function")
        return exp;
      if (typeof exp === "string" || typeof exp === "symbol")
        return exp;
      if ("provide" in exp)
        return exp.provide;
      return exp;
    });
  }
  isDynamicModule(module3) {
    return module3 && typeof module3 === "object" && "module" in module3;
  }
  isModule(target) {
    return Reflect.hasMetadata(METADATA_KEYS.MODULE, target);
  }
  getGlobalProviders() {
    return this.globalProviders;
  }
  getAllModules() {
    return Array.from(this.compiledModules.values());
  }
}

class ModuleCompiler {
  container;
  scanner;
  compiledModuleTypes = new Set;
  middlewareConfigurations = new Map;
  constructor(container2, scanner) {
    this.container = container2;
    this.scanner = scanner;
  }
  async compile(rootModule) {
    const compiled = await this.scanner.scan(rootModule);
    const globalProviders = this.scanner.getGlobalProviders();
    this.container.registerMany(globalProviders);
    await this.compileModuleRecursive(compiled);
    await this.configureMiddlewares();
  }
  getMiddlewareConfigurations() {
    return this.middlewareConfigurations;
  }
  async configureMiddlewares() {
    for (const moduleType of this.compiledModuleTypes) {
      try {
        const moduleInstance = await this.container.resolve(moduleType);
        if (hasConfigureMethod(moduleInstance)) {
          const consumer = new MiddlewareConsumerImpl;
          await moduleInstance.configure(consumer);
          const configs = consumer.getConfigurations();
          if (configs.length > 0) {
            this.middlewareConfigurations.set(moduleType, configs);
          }
        }
      } catch (e) {}
    }
  }
  async compileModuleRecursive(compiled) {
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
    for (const provider2 of importedProviders) {
      if (!this.container.has(this.getProviderToken(provider2))) {
        this.container.register(provider2);
      }
    }
    for (const provider2 of compiled.providers) {
      if (!this.container.has(this.getProviderToken(provider2))) {
        this.container.register(provider2);
      }
    }
    for (const controller2 of compiled.controllers) {
      if (!this.container.has(controller2)) {
        this.container.register(controller2);
      }
    }
  }
  collectExportedProviders(imports) {
    const providers = [];
    for (const importedModule of imports) {
      for (const provider2 of importedModule.providers) {
        const token = this.getProviderToken(provider2);
        if (importedModule.exports.includes(token)) {
          providers.push(provider2);
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
  getProviderToken(provider2) {
    if (typeof provider2 === "function")
      return provider2;
    return provider2.provide;
  }
}
// src/router/route-explorer.ts
import"reflect-metadata";

// src/application/orbit-factory.ts
import"reflect-metadata";
import { applySecureHeaderRecord, buildSecureHeaders } from "@galaxy-stack/orbit-common";

// src/middleware/cors.middleware.ts
var DEFAULT_CORS_OPTIONS = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

class CorsMiddleware {
  options;
  constructor(options = {}) {
    this.options = { ...DEFAULT_CORS_OPTIONS, ...options };
  }
  async use(request, next) {
    const origin = request.headers.get("origin");
    const corsHeaders = this.buildCorsHeaders(origin);
    if (request.method === "OPTIONS") {
      if (this.options.preflightContinue) {
        const response2 = await next();
        return this.appendHeaders(response2, corsHeaders);
      }
      return new Response(null, {
        status: this.options.optionsSuccessStatus || 204,
        headers: corsHeaders
      });
    }
    const response = await next();
    return this.appendHeaders(response, corsHeaders);
  }
  buildCorsHeaders(origin) {
    const headers = new Headers;
    const allowedOrigin = this.getAllowedOrigin(origin);
    if (allowedOrigin) {
      headers.set("Access-Control-Allow-Origin", allowedOrigin);
    }
    if (this.options.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    if (this.options.exposedHeaders) {
      const exposed = Array.isArray(this.options.exposedHeaders) ? this.options.exposedHeaders.join(",") : this.options.exposedHeaders;
      headers.set("Access-Control-Expose-Headers", exposed);
    }
    const methods = Array.isArray(this.options.methods) ? this.options.methods.join(",") : this.options.methods || "GET,HEAD,PUT,PATCH,POST,DELETE";
    headers.set("Access-Control-Allow-Methods", methods);
    const allowedHeaders = Array.isArray(this.options.allowedHeaders) ? this.options.allowedHeaders.join(",") : this.options.allowedHeaders || "*";
    headers.set("Access-Control-Allow-Headers", allowedHeaders);
    if (this.options.maxAge !== undefined) {
      headers.set("Access-Control-Max-Age", String(this.options.maxAge));
    }
    return headers;
  }
  getAllowedOrigin(requestOrigin) {
    const { origin } = this.options;
    if (origin === true || origin === "*") {
      return "*";
    }
    if (origin === false) {
      return null;
    }
    if (typeof origin === "string") {
      return origin;
    }
    if (Array.isArray(origin) && requestOrigin) {
      if (origin.includes(requestOrigin)) {
        return requestOrigin;
      }
      return null;
    }
    if (typeof origin === "function" && requestOrigin) {
      if (origin(requestOrigin)) {
        return requestOrigin;
      }
      return null;
    }
    return "*";
  }
  appendHeaders(response, corsHeaders) {
    const newHeaders = new Headers(response.headers);
    corsHeaders.forEach((value, key) => {
      newHeaders.set(key, value);
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
}
function cors(options) {
  return new CorsMiddleware(options);
}

// src/middleware/static.middleware.ts
import { join, extname, resolve } from "path";
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".wasm": "application/wasm"
};
var DEFAULT_OPTIONS = {
  root: "public",
  prefix: "",
  index: ["index.html", "index.htm"],
  dotFiles: "ignore",
  maxAge: 0,
  immutable: false,
  etag: true,
  lastModified: true
};

class StaticMiddleware {
  options;
  rootPath;
  cache;
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      cacheMaxSize: 100,
      cacheTtl: 60000,
      cacheDebug: false,
      ...options
    };
    this.rootPath = resolve(this.options.root);
    this.cache = {
      entries: new Map,
      maxSize: this.options.cacheMaxSize,
      ttl: this.options.cacheTtl
    };
  }
  getCachedFile(filePath) {
    const cached = this.cache.entries.get(filePath);
    if (!cached)
      return null;
    const now = Date.now();
    if (now - cached.cachedAt > this.cache.ttl) {
      this.cache.entries.delete(filePath);
      return null;
    }
    this.cache.entries.delete(filePath);
    this.cache.entries.set(filePath, cached);
    return cached;
  }
  async validateCachedFile(filePath, cached) {
    try {
      const file = Bun.file(filePath);
      const stats = await file.stat();
      if (!stats)
        return false;
      const mtimeMs = stats.mtime?.getTime() || 0;
      const cachedMtimeMs = cached.mtime?.getTime() || 0;
      return stats.size === cached.size && mtimeMs === cachedMtimeMs;
    } catch {
      return false;
    }
  }
  setCachedFile(filePath, cached) {
    if (this.cache.entries.size >= this.cache.maxSize) {
      const oldestKey = this.cache.entries.keys().next().value;
      if (oldestKey)
        this.cache.entries.delete(oldestKey);
    }
    this.cache.entries.set(filePath, cached);
  }
  clearCache() {
    this.cache.entries.clear();
  }
  async use(request, next) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return next();
    }
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (this.options.prefix && !pathname.startsWith(this.options.prefix)) {
      return next();
    }
    if (this.options.prefix) {
      pathname = pathname.slice(this.options.prefix.length) || "/";
    }
    if (this.containsDotSegment(pathname)) {
      return next();
    }
    const filename = pathname.split("/").pop() || "";
    if (filename.startsWith(".")) {
      if (this.options.dotFiles === "deny") {
        return new Response("Forbidden", { status: 403 });
      }
      if (this.options.dotFiles === "ignore") {
        return next();
      }
    }
    let filePath = join(this.rootPath, pathname);
    try {
      const cached = this.getCachedFile(filePath);
      if (cached && await this.validateCachedFile(filePath, cached)) {
        const headers2 = new Headers;
        headers2.set("Content-Type", cached.contentType);
        headers2.set("Content-Length", String(cached.size));
        if (this.options.cacheDebug) {
          headers2.set("X-Cache", "HIT");
        }
        if (this.options.lastModified && cached.mtime) {
          headers2.set("Last-Modified", cached.mtime.toUTCString());
        }
        if (this.options.etag) {
          headers2.set("ETag", cached.etag);
          const ifNoneMatch = request.headers.get("if-none-match");
          if (ifNoneMatch === cached.etag) {
            return new Response(null, { status: 304, headers: headers2 });
          }
        }
        if (this.options.maxAge !== undefined) {
          let cacheControl = `max-age=${this.options.maxAge}`;
          if (this.options.immutable)
            cacheControl += ", immutable";
          headers2.set("Cache-Control", cacheControl);
        }
        if (request.method === "HEAD") {
          return new Response(null, { status: 200, headers: headers2 });
        }
        return new Response(cached.file, { status: 200, headers: headers2 });
      } else if (cached) {
        this.cache.entries.delete(filePath);
      }
      const file = Bun.file(filePath);
      let stat = await file.exists();
      if (!stat) {
        if (this.options.index) {
          for (const indexFile of this.options.index) {
            const indexPath = join(filePath, indexFile);
            const indexBunFile = Bun.file(indexPath);
            if (await indexBunFile.exists()) {
              filePath = indexPath;
              stat = true;
              break;
            }
          }
        }
      }
      if (!stat) {
        return next();
      }
      const bunFile = Bun.file(filePath);
      const fileStats = await bunFile.stat();
      if (!fileStats || fileStats.isDirectory()) {
        return next();
      }
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const etag = `"${fileStats.size.toString(16)}-${fileStats.mtime?.getTime().toString(16)}"`;
      this.setCachedFile(filePath, {
        file: bunFile,
        size: fileStats.size,
        mtime: fileStats.mtime || null,
        etag,
        contentType,
        cachedAt: Date.now()
      });
      const headers = new Headers;
      headers.set("Content-Type", contentType);
      headers.set("Content-Length", String(fileStats.size));
      if (this.options.cacheDebug) {
        headers.set("X-Cache", "MISS");
      }
      if (this.options.lastModified && fileStats.mtime) {
        headers.set("Last-Modified", fileStats.mtime.toUTCString());
      }
      if (this.options.etag) {
        headers.set("ETag", etag);
        const ifNoneMatch = request.headers.get("if-none-match");
        if (ifNoneMatch === etag) {
          return new Response(null, { status: 304, headers });
        }
      }
      if (this.options.maxAge !== undefined) {
        let cacheControl = `max-age=${this.options.maxAge}`;
        if (this.options.immutable) {
          cacheControl += ", immutable";
        }
        headers.set("Cache-Control", cacheControl);
      }
      if (request.method === "HEAD") {
        return new Response(null, { status: 200, headers });
      }
      return new Response(bunFile, { status: 200, headers });
    } catch (error) {
      return next();
    }
  }
  containsDotSegment(pathname) {
    const segments = pathname.split("/");
    return segments.some((segment) => segment === ".." || segment === ".");
  }
}
function serveStatic(options) {
  return new StaticMiddleware(options);
}

// src/lifecycle/lifecycle.interface.ts
function hasOnModuleInit(instance) {
  return instance && typeof instance.onModuleInit === "function";
}
function hasOnModuleDestroy(instance) {
  return instance && typeof instance.onModuleDestroy === "function";
}
function hasOnApplicationBootstrap(instance) {
  return instance && typeof instance.onApplicationBootstrap === "function";
}
function hasOnApplicationShutdown(instance) {
  return instance && typeof instance.onApplicationShutdown === "function";
}
function hasBeforeApplicationShutdown(instance) {
  return instance && typeof instance.beforeApplicationShutdown === "function";
}

// src/application/orbit-factory.ts
class OrbitApplication {
  container;
  options;
  server = null;
  routes = [];
  staticRouteIndex = new Map;
  compiledRoutes = [];
  logger = null;
  middlewares = [];
  moduleMiddlewareConfigs = new Map;
  isShuttingDown = false;
  shutdownCallbacks = [];
  port = 0;
  constructor(container2, options = {}) {
    this.container = container2;
    this.options = options;
    this.logger = options.logger === false ? null : options.logger === true ? console : options.logger || console;
    if (options.cors) {
      const corsOptions = options.cors === true ? {} : options.cors;
      this.use(new CorsMiddleware(corsOptions));
    }
    this.secureHeaderOptions = options.security === false ? null : typeof options.security === "object" ? options.security : {};
    this.secureHeadersRecord = this.secureHeaderOptions === null ? null : buildSecureHeaders(this.secureHeaderOptions);
  }
  secureHeaderOptions;
  secureHeadersRecord;
  setRoutes(routes) {
    this.routes = routes;
    this.buildRouteIndex(routes);
  }
  buildRouteIndex(routes) {
    this.staticRouteIndex.clear();
    this.compiledRoutes = [];
    for (const route of routes) {
      const hasParams = route.path.includes(":") || route.path.includes("*");
      this.compiledRoutes.push({
        route,
        segments: route.path.split("/").filter(Boolean),
        hasWildcard: route.path.endsWith("*")
      });
      if (!hasParams && route.method !== "ALL") {
        let byMethod = this.staticRouteIndex.get(route.path);
        if (!byMethod) {
          byMethod = new Map;
          this.staticRouteIndex.set(route.path, byMethod);
        }
        byMethod.set(route.method, route);
      }
    }
  }
  getRoutes() {
    return this.routes;
  }
  modules = [];
  setModules(modules) {
    this.modules = modules;
  }
  setMiddlewareConfigurations(configs) {
    this.moduleMiddlewareConfigs = configs;
    for (const [, moduleConfigs] of configs) {
      for (const config of moduleConfigs) {
        for (const middleware of config.middlewares) {
          const fn = this.resolveMiddleware(middleware);
          const wrappedFn = async (request, next) => {
            const url = new URL(request.url);
            const pathname = url.pathname;
            const method = request.method.toUpperCase();
            if (!this.matchRouteInfo(pathname, method, config.forRoutes, config.excludeRoutes)) {
              return next();
            }
            return fn(request, next);
          };
          this.middlewares.push(wrappedFn);
        }
      }
    }
  }
  matchRouteInfo(pathname, method, forRoutes, excludeRoutes) {
    for (const exclude of excludeRoutes) {
      if (this.matchSingleRouteInfo(pathname, method, exclude)) {
        return false;
      }
    }
    for (const route of forRoutes) {
      if (this.matchSingleRouteInfo(pathname, method, route)) {
        return true;
      }
    }
    return false;
  }
  matchSingleRouteInfo(pathname, method, route) {
    if (route.method) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      const upperMethods = methods.map((m) => m.toUpperCase());
      if (!upperMethods.includes(method) && !upperMethods.includes("ALL")) {
        return false;
      }
    }
    return this.matchMiddlewarePath(route.path, pathname);
  }
  use(middleware, options) {
    const middlewareFn = this.resolveMiddleware(middleware);
    if (options?.forRoutes || options?.exclude) {
      const wrappedFn = async (request, next) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        if (options.exclude) {
          for (const pattern of options.exclude) {
            if (this.matchMiddlewarePath(pattern, pathname)) {
              return next();
            }
          }
        }
        if (options.forRoutes) {
          let matched = false;
          for (const pattern of options.forRoutes) {
            if (this.matchMiddlewarePath(pattern, pathname)) {
              matched = true;
              break;
            }
          }
          if (!matched) {
            return next();
          }
        }
        return middlewareFn(request, next);
      };
      this.middlewares.push(wrappedFn);
    } else {
      this.middlewares.push(middlewareFn);
    }
    return this;
  }
  matchMiddlewarePath(pattern, pathname) {
    if (pattern === "*")
      return true;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === pattern || pathname.startsWith(pattern + "/");
  }
  enableCors(options) {
    this.use(new CorsMiddleware(options));
    return this;
  }
  useStaticAssets(options) {
    this.use(new StaticMiddleware(options));
    return this;
  }
  async listen(port) {
    const listenPort = port ?? this.options.port ?? 3000;
    const hostname = this.options.hostname || "0.0.0.0";
    const requestHandler = new RequestHandler(this.container);
    await this.callLifecycleHook("onModuleInit");
    await this.callLifecycleHook("onApplicationBootstrap");
    this.server = Bun.serve({
      port: listenPort,
      hostname,
      fetch: async (request) => {
        return this.handleRequest(request, requestHandler);
      }
    });
    this.port = listenPort === 0 && this.server?.port ? this.server.port : listenPort;
    this.setupGracefulShutdown();
    this.log(`\uD83C\uDF0C Orbit application running at http://${hostname}:${listenPort}`);
    this.logRoutes();
  }
  async close(signal) {
    if (this.isShuttingDown)
      return;
    this.isShuttingDown = true;
    this.log(`Shutting down application${signal ? ` (${signal})` : ""}...`);
    await this.callLifecycleHook("beforeApplicationShutdown", signal);
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    await this.callLifecycleHook("onApplicationShutdown", signal);
    await this.callLifecycleHook("onModuleDestroy");
    for (const callback of this.shutdownCallbacks) {
      await callback(signal);
    }
    this.log("Application closed");
  }
  enableShutdownHooks() {
    return this;
  }
  onShutdown(callback) {
    this.shutdownCallbacks.push(callback);
    return this;
  }
  getContainer() {
    return this.container;
  }
  getServer() {
    return this.server;
  }
  setupGracefulShutdown() {
    const signals = ["SIGTERM", "SIGINT", "SIGHUP"];
    for (const signal of signals) {
      process.on(signal, async () => {
        await this.close(signal);
        process.exit(0);
      });
    }
    process.on("uncaughtException", async (error) => {
      console.error("Uncaught Exception:", error);
      await this.close("uncaughtException");
      process.exit(1);
    });
    process.on("unhandledRejection", async (reason) => {
      console.error("Unhandled Rejection:", reason);
      await this.close("unhandledRejection");
      process.exit(1);
    });
  }
  async callLifecycleHook(hookName, ...args) {
    const providers = await this.container.getAllInstances();
    for (const instance of providers) {
      try {
        switch (hookName) {
          case "onModuleInit":
            if (hasOnModuleInit(instance)) {
              await instance.onModuleInit();
            }
            break;
          case "onModuleDestroy":
            if (hasOnModuleDestroy(instance)) {
              await instance.onModuleDestroy();
            }
            break;
          case "onApplicationBootstrap":
            if (hasOnApplicationBootstrap(instance)) {
              await instance.onApplicationBootstrap();
            }
            break;
          case "onApplicationShutdown":
            if (hasOnApplicationShutdown(instance)) {
              await instance.onApplicationShutdown(args[0]);
            }
            break;
          case "beforeApplicationShutdown":
            if (hasBeforeApplicationShutdown(instance)) {
              await instance.beforeApplicationShutdown(args[0]);
            }
            break;
        }
      } catch (error) {
        console.error(`Error calling ${hookName} on provider:`, error);
      }
    }
  }
  resolveMiddleware(middleware) {
    if (typeof middleware === "function") {
      if (middleware.prototype && "use" in middleware.prototype) {
        const MiddlewareClass = middleware;
        return async (req, next) => {
          let instance;
          if (this.container.has(MiddlewareClass)) {
            instance = await this.container.resolve(MiddlewareClass);
          } else {
            instance = new MiddlewareClass;
          }
          return instance.use(req, next);
        };
      }
      return middleware;
    }
    if (typeof middleware === "object" && "use" in middleware) {
      return (req, next) => middleware.use(req, next);
    }
    throw new Error("Invalid middleware");
  }
  async handleRequest(request, handler) {
    try {
      const response = this.middlewares.length === 0 ? await this.routeRequest(request, handler) : await this.executeMiddlewares(request, handler, 0);
      return this.applySecurityHeaders(response);
    } catch (error) {
      return this.applySecurityHeaders(this.handleError(error));
    }
  }
  executeMiddlewares(request, handler, index) {
    if (index < this.middlewares.length) {
      return this.middlewares[index](request, () => this.executeMiddlewares(request, handler, index + 1));
    }
    return this.routeRequest(request, handler);
  }
  applySecurityHeaders(response) {
    if (!this.secureHeadersRecord)
      return response;
    return applySecureHeaderRecord(response, this.secureHeadersRecord);
  }
  async routeRequest(request, handler) {
    const method = request.method;
    const url = request.url;
    const start = url.indexOf("/", 8);
    let pathname;
    if (start === -1) {
      pathname = "/";
    } else {
      const qi = url.indexOf("?", start);
      pathname = qi === -1 ? url.slice(start) : url.slice(start, qi);
    }
    const byMethod = this.staticRouteIndex.get(pathname);
    if (byMethod) {
      const route = byMethod.get(method);
      if (route) {
        try {
          return await handler.handle(route, request, OrbitApplication.EMPTY_PARAMS);
        } catch (error) {
          return this.handleError(error);
        }
      }
    }
    const pathSegments = pathname.split("/").filter(Boolean);
    for (const compiled of this.compiledRoutes) {
      if (compiled.route.method !== method && compiled.route.method !== "ALL")
        continue;
      const params = this.matchSegments(compiled.segments, pathSegments, compiled.hasWildcard);
      if (params !== null) {
        try {
          return await handler.handle(compiled.route, request, params);
        } catch (error) {
          return this.handleError(error);
        }
      }
    }
    return new Response(JSON.stringify({ statusCode: 404, message: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  static EMPTY_PARAMS = Object.freeze({});
  matchSegments(patternSegments, pathSegments, hasWildcard) {
    if (patternSegments.length !== pathSegments.length && !hasWildcard) {
      return null;
    }
    const params = {};
    for (let i = 0;i < patternSegments.length; i++) {
      const patternPart = patternSegments[i];
      const pathPart = pathSegments[i];
      if (patternPart === "*") {
        return params;
      }
      if (patternPart.startsWith(":")) {
        params[patternPart.slice(1)] = pathPart;
        continue;
      }
      if (patternPart !== pathPart) {
        return null;
      }
    }
    return params;
  }
  handleError(error) {
    console.error("Request error:", error);
    if (error && typeof error === "object" && "getStatus" in error && "toJSON" in error) {
      const httpError = error;
      return new Response(JSON.stringify(httpError.toJSON()), { status: httpError.getStatus(), headers: { "Content-Type": "application/json" } });
    }
    if (error instanceof Error) {
      return new Response(JSON.stringify({ statusCode: 500, message: error.message, error: error.name }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ statusCode: 500, message: "Internal Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  log(message) {
    if (this.logger) {
      this.logger.log(message);
    }
  }
  logRoutes() {
    if (this.logger && this.routes.length > 0) {
      this.logger.log("Routes registered:");
      for (const route of this.routes) {
        this.logger.log(`  ${route.method.padEnd(7)} ${route.path}`);
      }
    }
  }
}
var telemetryListeners = new Set;
function onRequestTelemetry(listener) {
  telemetryListeners.add(listener);
  return () => telemetryListeners.delete(listener);
}
function emitRequestTelemetry(telemetry) {
  for (const listener of telemetryListeners) {
    try {
      listener(telemetry);
    } catch {}
  }
}

class OrbitFactory {
  static async create(rootModule, options = {}) {
    const container2 = new Container;
    const scanner = new ModuleScanner;
    const compiler = new ModuleCompiler(container2, scanner);
    await compiler.compile(rootModule);
    const routeExplorer = new RouteExplorer(container2);
    const allModules = scanner.getAllModules();
    const allControllers = [];
    for (const module3 of allModules) {
      allControllers.push(...module3.controllers);
    }
    const routes = await routeExplorer.explore(allControllers);
    const app = new OrbitApplication(container2, options);
    app.setRoutes(routes);
    app.setModules(allModules.map((m) => ({
      name: m.metatype.name,
      controllers: m.controllers.map((c) => c?.name ?? String(c)),
      providers: m.providers.map((pr) => String("provide" in pr ? pr.provide : pr)),
      imports: m.imports.map((im) => im.metatype?.name ?? String(im)),
      exports: m.exports.map((ex) => String(ex))
    })));
    const middlewareConfigs = compiler.getMiddlewareConfigurations();
    app.setMiddlewareConfigurations(middlewareConfigs);
    return app;
  }
}
var BunFactory = OrbitFactory;
var GalaxyFactory = OrbitFactory;

// src/pipeline/execution-pipeline.ts
import"reflect-metadata";

// src/exceptions/http.exception.ts
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  NotAcceptableException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException
} from "@galaxy-stack/orbit-common";

// src/pipeline/execution-pipeline.ts
var GUARDS_KEY = "orbit:guards";
var PIPES_KEY = "orbit:pipes";
var INTERCEPTORS_KEY = "orbit:interceptors";
var EXCEPTION_FILTERS_KEY = "orbit:exception-filters";

class ExecutionContextImpl {
  request;
  controllerClass;
  handler;
  constructor(request, controllerClass, handler) {
    this.request = request;
    this.controllerClass = controllerClass;
    this.handler = handler;
  }
  getRequest() {
    return this.request;
  }
  getResponse() {
    return null;
  }
  getHandler() {
    return this.handler;
  }
  getClass() {
    return this.controllerClass;
  }
  switchToHttp() {
    return {
      getRequest: () => this.request,
      getResponse: () => null
    };
  }
}

class ExecutionPipeline {
  container;
  metaCache = new WeakMap;
  constructor(container2) {
    this.container = container2;
  }
  getCachedMeta(controllerClass, methodName) {
    let byMethod = this.metaCache.get(controllerClass);
    if (!byMethod) {
      byMethod = new Map;
      this.metaCache.set(controllerClass, byMethod);
    }
    let meta = byMethod.get(methodName);
    if (!meta) {
      meta = {
        guards: this.getGuards(controllerClass, null, methodName),
        pipes: this.getPipes(controllerClass, null, methodName),
        interceptors: this.getInterceptors(controllerClass, null, methodName),
        filters: this.getFilters(controllerClass, null, methodName)
      };
      byMethod.set(methodName, meta);
    }
    return meta;
  }
  hasPipes(controllerClass, methodName) {
    return this.getCachedMeta(controllerClass, methodName).pipes.length > 0;
  }
  async execute(request, controllerClass, controllerInstance, handler, methodName, handlerFn) {
    const meta = this.getCachedMeta(controllerClass, methodName);
    if (meta.guards.length === 0 && meta.interceptors.length === 0 && meta.filters.length === 0) {
      try {
        const result = await handlerFn();
        return this.transformToResponse(result);
      } catch (error) {
        return await this.handleException(error, null, controllerClass, controllerInstance, methodName);
      }
    }
    const context = new ExecutionContextImpl(request, controllerClass, handler);
    try {
      const guardsPassed = await this.runGuards(meta, context);
      if (!guardsPassed) {
        return new Response(JSON.stringify({ statusCode: 403, message: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      const result = await this.runInterceptors(meta, context, handlerFn);
      return this.transformToResponse(result);
    } catch (error) {
      return await this.handleException(error, context, controllerClass, controllerInstance, methodName);
    }
  }
  async runGuards(meta, context) {
    const guards = meta.guards;
    for (const guard of guards) {
      const guardInstance = await this.resolveInstance(guard);
      const canActivate = await guardInstance.canActivate(context);
      if (!canActivate) {
        return false;
      }
    }
    return true;
  }
  async runInterceptors(meta, context, handlerFn) {
    const interceptors = meta.interceptors;
    if (interceptors.length === 0) {
      return handlerFn();
    }
    const self2 = this;
    const createCallHandler = (index) => ({
      handle: async () => {
        if (index >= interceptors.length) {
          return handlerFn();
        }
        const interceptor = await self2.resolveInstance(interceptors[index]);
        return interceptor.intercept(context, createCallHandler(index + 1));
      }
    });
    const firstInterceptor = await this.resolveInstance(interceptors[0]);
    return firstInterceptor.intercept(context, createCallHandler(1));
  }
  async transformWithPipes(value, metadata, controllerClass, instance, methodName) {
    const pipes = this.getPipes(controllerClass, instance, methodName);
    let result = value;
    for (const pipe of pipes) {
      const pipeInstance = await this.resolveInstance(pipe);
      result = await pipeInstance.transform(result, metadata);
    }
    return result;
  }
  async handleException(error, context, controllerClass, instance, methodName) {
    const filters = this.getCachedMeta(controllerClass, methodName).filters;
    for (const filter of filters) {
      const filterInstance = await this.resolveInstance(filter);
      const result = filterInstance.catch(error, context);
      if (result instanceof Response) {
        return result;
      }
      if (result !== undefined) {
        return this.transformToResponse(result);
      }
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      return new Response(JSON.stringify({ statusCode: status, message: error.message }), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.error("Unhandled exception:", error);
    return new Response(JSON.stringify({ statusCode: 500, message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  transformToResponse(result) {
    if (result instanceof Response) {
      return result;
    }
    if (result === undefined || result === null) {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  getGuards(controllerClass, instance, methodName) {
    const classGuards = Reflect.getMetadata(GUARDS_KEY, controllerClass) || [];
    const methodGuards = Reflect.getMetadata(GUARDS_KEY, controllerClass.prototype, methodName) || [];
    return [...classGuards, ...methodGuards];
  }
  getPipes(controllerClass, instance, methodName) {
    const classPipes = Reflect.getMetadata(PIPES_KEY, controllerClass) || [];
    const methodPipes = Reflect.getMetadata(PIPES_KEY, controllerClass.prototype, methodName) || [];
    return [...classPipes, ...methodPipes];
  }
  getInterceptors(controllerClass, instance, methodName) {
    const classInterceptors = Reflect.getMetadata(INTERCEPTORS_KEY, controllerClass) || [];
    const methodInterceptors = Reflect.getMetadata(INTERCEPTORS_KEY, controllerClass.prototype, methodName) || [];
    return [...classInterceptors, ...methodInterceptors];
  }
  getFilters(controllerClass, instance, methodName) {
    const classFilters = Reflect.getMetadata(EXCEPTION_FILTERS_KEY, controllerClass) || [];
    const methodFilters = Reflect.getMetadata(EXCEPTION_FILTERS_KEY, controllerClass.prototype, methodName) || [];
    return [...classFilters, ...methodFilters];
  }
  async resolveInstance(target) {
    if (target === null || target === undefined) {
      return target;
    }
    if (typeof target === "function") {
      try {
        if (this.container.has(target)) {
          return await this.container.resolve(target);
        }
      } catch (e) {}
      try {
        return new target;
      } catch (e) {
        console.error("Failed to instantiate:", target.name, e);
        return target;
      }
    }
    if (typeof target === "object" && target !== null) {
      if ("canActivate" in target || "transform" in target || "intercept" in target || "catch" in target) {
        return target;
      }
    }
    return target;
  }
}

// src/router/route-explorer.ts
var ROUTE_PARAMS_KEY = "orbit:route:params";
var HTTP_CODE_KEY = "orbit:http-code";
var HEADERS_KEY = "orbit:headers";

class RouteExplorer {
  container;
  routes = [];
  constructor(container2) {
    this.container = container2;
  }
  async explore(controllers) {
    this.routes = [];
    for (const controller2 of controllers) {
      await this.exploreController(controller2);
    }
    return this.routes;
  }
  async exploreController(controller2) {
    const controllerPath = Reflector.getControllerPath(controller2);
    const prototype = controller2.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor" && typeof prototype[name] === "function");
    for (const methodName of methodNames) {
      const routePath = Reflect.getMetadata(METADATA_KEYS.ROUTE_PATH, prototype, methodName);
      const routeMethod = Reflect.getMetadata(METADATA_KEYS.ROUTE_METHOD, prototype, methodName);
      if (routePath !== undefined && routeMethod) {
        const fullPath = this.joinPaths(controllerPath, routePath);
        this.routes.push({
          path: fullPath,
          method: routeMethod,
          controller: controller2,
          methodName,
          handler: prototype[methodName]
        });
      }
    }
  }
  joinPaths(...paths) {
    const joined = paths.map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
    return "/" + joined;
  }
  getParamMetadata(target, methodName) {
    return Reflect.getMetadata(ROUTE_PARAMS_KEY, target, methodName) || [];
  }
}

class RequestHandler {
  container;
  pipeline;
  constructor(container2) {
    this.container = container2;
    this.pipeline = new ExecutionPipeline(container2);
  }
  paramCache = new WeakMap;
  getCachedParams(controllerClass, methodName) {
    let byMethod = this.paramCache.get(controllerClass);
    if (!byMethod) {
      byMethod = new Map;
      this.paramCache.set(controllerClass, byMethod);
    }
    let info = byMethod.get(methodName);
    if (!info) {
      const metadata = this.getParamMetadata(controllerClass.prototype, methodName);
      const sorted = [...metadata].sort((a, b) => a.index - b.index);
      const maxIndex = sorted.length > 0 ? Math.max(...sorted.map((m) => m.index)) : -1;
      info = {
        sorted,
        maxIndex,
        hasQuery: sorted.some((m) => m.type === "query"),
        hasBody: sorted.some((m) => m.type === "body"),
        hasHeaders: sorted.some((m) => m.type === "headers"),
        hasAsync: sorted.some((m) => m.type === "query" || m.type === "body" || m.type === "headers" || m.type === "ip")
      };
      byMethod.set(methodName, info);
    }
    return info;
  }
  async handle(route, request, pathParams) {
    const startedAt = Date.now();
    let telemetryError;
    try {
      const controllerInstance = await this.container.resolve(route.controller);
      const paramInfo = this.getCachedParams(route.controller, route.methodName);
      const hasPipes = this.pipeline.hasPipes(route.controller, route.methodName);
      const handlerFn = paramInfo.hasAsync || hasPipes ? async () => {
        const args = await this.resolveParamsAsync(paramInfo, request, pathParams, controllerInstance, route, hasPipes);
        return controllerInstance[route.methodName](...args);
      } : () => {
        const args = this.resolveParamsSync(paramInfo, request, pathParams);
        return controllerInstance[route.methodName](...args);
      };
      const response = await this.pipeline.execute(request, route.controller, controllerInstance, route.handler, route.methodName, handlerFn);
      emitRequestTelemetry({
        method: request.method,
        path: route.path,
        status: response.status,
        durationMs: Date.now() - startedAt
      });
      return this.applyHttpMetadata(response, route.controller.prototype, route.methodName);
    } catch (error) {
      telemetryError = {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
        stack: error?.stack
      };
      emitRequestTelemetry({
        method: request.method,
        path: route.path,
        status: 500,
        durationMs: Date.now() - startedAt,
        error: telemetryError
      });
      throw error;
    }
  }
  getParamMetadata(target, methodName) {
    return Reflect.getMetadata(ROUTE_PARAMS_KEY, target, methodName) || [];
  }
  resolveParamsSync(info, request, pathParams) {
    if (info.maxIndex < 0) {
      return [];
    }
    const args = new Array(info.maxIndex + 1).fill(undefined);
    for (const param of info.sorted) {
      switch (param.type) {
        case "param":
          args[param.index] = param.data ? pathParams[param.data] : pathParams;
          break;
        case "request":
          args[param.index] = request;
          break;
        default:
          args[param.index] = undefined;
      }
    }
    return args;
  }
  async resolveParamsAsync(info, request, pathParams, controllerInstance, route, hasPipes) {
    if (info.maxIndex < 0) {
      return [];
    }
    let queryParams;
    if (info.hasQuery) {
      queryParams = {};
      const qi = request.url.indexOf("?");
      if (qi !== -1 && qi + 1 < request.url.length) {
        for (const [key, value] of new URLSearchParams(request.url.slice(qi + 1))) {
          queryParams[key] = value;
        }
      }
    }
    let body = undefined;
    if (info.hasBody && (request.method === "POST" || request.method === "PUT" || request.method === "PATCH")) {
      try {
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          body = await request.json();
        } else {
          body = await request.text();
        }
      } catch {
        body = undefined;
      }
    }
    let headers;
    if (info.hasHeaders) {
      headers = Object.fromEntries(request.headers.entries());
    }
    const args = new Array(info.maxIndex + 1).fill(undefined);
    for (const param of info.sorted) {
      let value;
      let paramType = "custom";
      switch (param.type) {
        case "body":
          value = param.data ? body?.[param.data] : body;
          paramType = "body";
          break;
        case "query":
          value = param.data ? queryParams[param.data] : queryParams;
          paramType = "query";
          break;
        case "param":
          value = param.data ? pathParams[param.data] : pathParams;
          paramType = "param";
          break;
        case "headers":
          value = param.data ? headers[param.data.toLowerCase()] : headers;
          break;
        case "request":
          value = request;
          break;
        case "ip":
          value = request.headers.get("x-forwarded-for") || "unknown";
          break;
        default:
          value = undefined;
      }
      if (hasPipes) {
        const transformedValue = await this.pipeline.transformWithPipes(value, { type: paramType, data: param.data }, route.controller, controllerInstance, route.methodName);
        args[param.index] = transformedValue;
      } else {
        args[param.index] = value;
      }
    }
    return args;
  }
  applyHttpMetadata(response, target, methodName) {
    const httpCode = Reflect.getMetadata(HTTP_CODE_KEY, target, methodName);
    const customHeaders = Reflect.getMetadata(HEADERS_KEY, target, methodName);
    if (!httpCode && !customHeaders) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        newHeaders.set(key, value);
      }
    }
    return new Response(response.body, {
      status: httpCode || response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
}
// src/pipes/builtin.pipes.ts
class ParseIntPipe {
  transform(value, metadata) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed (numeric string is expected for ${metadata.data || "value"})`);
    }
    return val;
  }
}

class ParseFloatPipe {
  transform(value, metadata) {
    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed (numeric string is expected for ${metadata.data || "value"})`);
    }
    return val;
  }
}

class ParseBoolPipe {
  transform(value, metadata) {
    if (value === "true")
      return true;
    if (value === "false")
      return false;
    throw new BadRequestException(`Validation failed (boolean string is expected for ${metadata.data || "value"})`);
  }
}

class ParseArrayPipe {
  separator;
  constructor(separator = ",") {
    this.separator = separator;
  }
  transform(value, metadata) {
    if (!value)
      return [];
    return value.split(this.separator).map((item) => item.trim());
  }
}

class DefaultValuePipe {
  defaultValue;
  constructor(defaultValue) {
    this.defaultValue = defaultValue;
  }
  transform(value, metadata) {
    return value ?? this.defaultValue;
  }
}

class TrimPipe {
  transform(value, metadata) {
    if (typeof value !== "string")
      return value;
    return value.trim();
  }
}

class ParseUUIDPipe {
  uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  transform(value, metadata) {
    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException(`Validation failed (UUID is expected for ${metadata.data || "value"})`);
    }
    return value;
  }
}

class ParseEnumPipe {
  enumType;
  allowedValues;
  constructor(enumType) {
    this.enumType = enumType;
    this.allowedValues = new Set(Object.values(enumType).filter((v) => typeof v === "string" || typeof v === "number"));
  }
  transform(value, metadata) {
    if (!this.allowedValues.has(value)) {
      const values = Array.from(this.allowedValues).join(", ");
      throw new BadRequestException(`Validation failed (one of ${values} is expected for ${metadata.data || "value"})`);
    }
    return value;
  }
}
// src/pipes/validation.pipe.ts
class ValidationPipe {
  options;
  constructor(options = {}) {
    this.options = {
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      disableErrorMessages: false,
      ...options
    };
  }
  async transform(value, metadata) {
    if (!value) {
      return value;
    }
    const schema = this.options.schema || metadata.metatype?.schema;
    if (!schema) {
      return value;
    }
    return this.validate(value, schema);
  }
  validate(value, schema) {
    const result = schema.safeParse(value);
    if (!result.success) {
      const errors = this.formatZodErrors(result.error);
      if (this.options.exceptionFactory) {
        throw this.options.exceptionFactory(errors);
      }
      const message = this.options.disableErrorMessages ? "Validation failed" : errors.join("; ");
      throw new BadRequestException(message);
    }
    return this.options.transform ? result.data : value;
  }
  formatZodErrors(error) {
    if (!error?.errors) {
      return ["Validation failed"];
    }
    return error.errors.map((err) => {
      const path = err.path?.join(".") || "value";
      return `${path}: ${err.message}`;
    });
  }
}

class ZodValidationPipe {
  schema;
  constructor(schema) {
    this.schema = schema;
  }
  transform(value, metadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join(".") || "value"}: ${e.message}`).join("; ");
      throw new BadRequestException(`Validation failed: ${errors}`);
    }
    return result.data;
  }
}
function createZodDto(schema) {

  class ZodDto {
    static schema = schema;
    constructor(data) {
      if (data) {
        Object.assign(this, schema.parse(data));
      }
    }
  }
  return ZodDto;
}
// src/middleware/middleware-registry.ts
class MiddlewareRegistry {
  container;
  globalMiddlewares = [];
  moduleMiddlewares = new Map;
  constructor(container2) {
    this.container = container2;
  }
  registerGlobal(middleware, forRoutes, excludeRoutes) {
    const fn = this.resolveMiddlewareToFunction(middleware);
    this.globalMiddlewares.push({
      fn,
      forRoutes: forRoutes || [{ path: "*" }],
      excludeRoutes: excludeRoutes || []
    });
  }
  registerForModule(moduleClass, configurations) {
    for (const config of configurations) {
      for (const middleware of config.middlewares) {
        if (typeof middleware === "function" && middleware.prototype && "use" in middleware.prototype) {
          if (!this.container.has(middleware)) {
            this.container.register(middleware);
          }
        }
      }
    }
    const existing = this.moduleMiddlewares.get(moduleClass) || [];
    this.moduleMiddlewares.set(moduleClass, [...existing, ...configurations]);
  }
  async getMiddlewaresForRoute(path, method) {
    const result = [];
    for (const mw of this.globalMiddlewares) {
      if (this.matchesRoute(path, method, mw.forRoutes, mw.excludeRoutes)) {
        result.push(mw.fn);
      }
    }
    for (const [, configs] of this.moduleMiddlewares) {
      for (const config of configs) {
        if (this.matchesRoute(path, method, config.forRoutes, config.excludeRoutes)) {
          for (const middleware of config.middlewares) {
            const fn = await this.resolveMiddlewareToFunctionAsync(middleware);
            result.push(fn);
          }
        }
      }
    }
    return result;
  }
  matchesRoute(pathname, method, forRoutes, excludeRoutes) {
    for (const exclude of excludeRoutes) {
      if (this.matchesSingleRoute(pathname, method, exclude)) {
        return false;
      }
    }
    for (const route of forRoutes) {
      if (this.matchesSingleRoute(pathname, method, route)) {
        return true;
      }
    }
    return false;
  }
  matchesSingleRoute(pathname, method, route) {
    if (route.method) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      const upperMethods = methods.map((m) => m.toUpperCase());
      if (!upperMethods.includes(method.toUpperCase()) && !upperMethods.includes("ALL")) {
        return false;
      }
    }
    return this.matchPath(route.path, pathname);
  }
  matchPath(pattern, pathname) {
    if (pattern === "*" || pattern === "(.*)") {
      return true;
    }
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    if (pattern.endsWith("/(.*)")) {
      const prefix = pattern.slice(0, -5);
      return pathname === prefix || pathname.startsWith(prefix + "/");
    }
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) {
      return pathname === pattern || pathname.startsWith(pattern + "/");
    }
    for (let i = 0;i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      if (patternPart.startsWith(":")) {
        continue;
      }
      if (patternPart !== pathPart) {
        return false;
      }
    }
    return true;
  }
  resolveMiddlewareToFunction(middleware) {
    if (typeof middleware === "function") {
      if (middleware.prototype && "use" in middleware.prototype) {
        const MiddlewareClass = middleware;
        return async (req, next) => {
          let instance;
          if (this.container.has(MiddlewareClass)) {
            instance = await this.container.resolve(MiddlewareClass);
          } else {
            instance = new MiddlewareClass;
          }
          return instance.use(req, next);
        };
      }
      return middleware;
    }
    if (typeof middleware === "object" && "use" in middleware) {
      return (req, next) => middleware.use(req, next);
    }
    throw new Error("Invalid middleware");
  }
  async resolveMiddlewareToFunctionAsync(middleware) {
    return this.resolveMiddlewareToFunction(middleware);
  }
}
// src/middleware/timeout.middleware.ts
var DEFAULT_OPTIONS2 = {
  timeout: 30000,
  message: "Request Timeout",
  statusCode: 408,
  onTimeout: () => {}
};

class TimeoutMiddleware {
  options;
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS2, ...options };
  }
  async use(request, next) {
    const controller2 = new AbortController;
    const startTime = Date.now();
    let timeoutId = null;
    const racePromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        controller2.abort();
        const error = new Error("Request timeout");
        error.name = "TimeoutError";
        reject(error);
      }, this.options.timeout);
    });
    try {
      const response = await Promise.race([next(), racePromise]);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "TimeoutError" || error.message === "Request timeout") {
        const elapsed = Date.now() - startTime;
        this.options.onTimeout(request, elapsed);
        return new Response(JSON.stringify({
          statusCode: this.options.statusCode,
          message: this.options.message,
          error: "Request Timeout"
        }), {
          status: this.options.statusCode,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw error;
    }
  }
}
function timeout(options) {
  return new TimeoutMiddleware(options);
}

class RequestTimeoutError extends Error {
  elapsed;
  path;
  method;
  constructor(request, elapsed) {
    const url = new URL(request.url);
    super(`Request timeout after ${elapsed}ms: ${request.method} ${url.pathname}`);
    this.name = "RequestTimeoutError";
    this.elapsed = elapsed;
    this.path = url.pathname;
    this.method = request.method;
  }
}
function createTimeoutHandler(timeoutMs, handler) {
  return async (request) => {
    const controller2 = new AbortController;
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      controller2.abort();
    }, timeoutMs);
    try {
      const response = await Promise.race([
        handler(request),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new RequestTimeoutError(request, Date.now() - startTime));
          }, timeoutMs);
        })
      ]);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof RequestTimeoutError) {
        return new Response(JSON.stringify({
          statusCode: 408,
          message: "Request Timeout",
          error: error.message
        }), {
          status: 408,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw error;
    }
  };
}
// src/lifecycle/graceful-shutdown.ts
var DEFAULT_OPTIONS3 = {
  timeout: 30000,
  signals: ["SIGTERM", "SIGINT", "SIGHUP"],
  onShutdown: () => {},
  forceExitCode: 1
};

class GracefulShutdownManager {
  options;
  activeRequests = new Map;
  isShuttingDown = false;
  shutdownPromise = null;
  shutdownCallbacks = [];
  server = null;
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS3, ...options };
  }
  get isInShutdown() {
    return this.isShuttingDown;
  }
  get activeRequestCount() {
    return this.activeRequests.size;
  }
  get pendingRequests() {
    return Array.from(this.activeRequests.values());
  }
  registerServer(server) {
    this.server = server;
  }
  registerShutdownCallback(callback) {
    this.shutdownCallbacks.push(callback);
  }
  trackRequest(request) {
    const id = crypto.randomUUID();
    const url = new URL(request.url);
    this.activeRequests.set(id, {
      id,
      startedAt: Date.now(),
      path: url.pathname,
      method: request.method
    });
    return id;
  }
  completeRequest(id) {
    this.activeRequests.delete(id);
  }
  setupSignalHandlers() {
    for (const signal of this.options.signals) {
      process.on(signal, () => {
        this.initiateShutdown();
      });
    }
  }
  async initiateShutdown() {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }
    this.isShuttingDown = true;
    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }
  async performShutdown() {
    console.log("[Shutdown] Initiating graceful shutdown...");
    if (this.server) {
      console.log("[Shutdown] Stopping server from accepting new connections...");
      this.server.stop(false);
    }
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Shutdown timeout exceeded"));
      }, this.options.timeout);
    });
    let timedOut = false;
    try {
      await Promise.race([
        this.waitForRequests(),
        timeoutPromise
      ]);
      console.log("[Shutdown] All requests completed");
    } catch (error) {
      timedOut = true;
      console.warn("[Shutdown] Timeout exceeded, forcing shutdown...");
      console.warn(`[Shutdown] ${this.activeRequests.size} requests still pending`);
      for (const req of this.activeRequests.values()) {
        console.warn(`[Shutdown] Pending: ${req.method} ${req.path} (${Date.now() - req.startedAt}ms)`);
      }
    }
    console.log("[Shutdown] Running shutdown callbacks...");
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error("[Shutdown] Callback error:", error);
      }
    }
    await this.options.onShutdown();
    console.log("[Shutdown] Graceful shutdown complete");
    if (this.server) {
      this.server.stop(true);
    }
    if (timedOut && this.options.forceExitCode !== undefined) {
      console.log(`[Shutdown] Force exiting with code ${this.options.forceExitCode}`);
      process.exit(this.options.forceExitCode);
    }
  }
  async waitForRequests() {
    while (this.activeRequests.size > 0) {
      await new Promise((resolve2) => setTimeout(resolve2, 100));
    }
  }
  createMiddleware() {
    return async (request, next) => {
      if (this.isShuttingDown) {
        return new Response("Service Unavailable", {
          status: 503,
          headers: {
            Connection: "close",
            "Retry-After": "30"
          }
        });
      }
      const requestId = this.trackRequest(request);
      try {
        const response = await next();
        return response;
      } finally {
        this.completeRequest(requestId);
      }
    };
  }
}
var globalManager = null;
function getGracefulShutdownManager(options) {
  if (!globalManager) {
    globalManager = new GracefulShutdownManager(options);
  }
  return globalManager;
}
function gracefulShutdown(options) {
  const manager = getGracefulShutdownManager(options);
  manager.setupSignalHandlers();
  return manager;
}
// src/versioning/versioning.ts
import"reflect-metadata";
var VERSION_METADATA = "versioning:version";
var VERSION_NEUTRAL = Symbol("VERSION_NEUTRAL");
function Version(version) {
  return (target, propertyKey, descriptor) => {
    if (descriptor?.value) {
      Reflect.defineMetadata(VERSION_METADATA, version, descriptor.value);
    } else {
      Reflect.defineMetadata(VERSION_METADATA, version, target);
    }
    return descriptor;
  };
}

class VersioningManager {
  options = null;
  configure(options) {
    this.options = {
      prefix: "v",
      header: "X-API-Version",
      key: "version",
      ...options
    };
  }
  getOptions() {
    return this.options;
  }
  extractVersion(request) {
    if (!this.options)
      return null;
    if (this.options.extractor) {
      return this.options.extractor(request);
    }
    switch (this.options.type) {
      case "uri":
        return this.extractFromUri(request);
      case "header":
        return this.extractFromHeader(request);
      case "media":
        return this.extractFromMediaType(request);
      default:
        return null;
    }
  }
  extractFromUri(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const rawPrefix = this.options?.prefix;
    const prefix = rawPrefix === false ? false : rawPrefix || "v";
    for (const part of pathParts) {
      if (prefix === false) {
        if (/^\d+(\.\d+)*$/.test(part)) {
          return part;
        }
      } else if (part.startsWith(prefix)) {
        return part.slice(prefix.length);
      }
    }
    return null;
  }
  extractFromHeader(request) {
    const header = this.options?.header || "X-API-Version";
    return request.headers.get(header);
  }
  extractFromMediaType(request) {
    const accept = request.headers.get("Accept") || "";
    const key = this.options?.key || "version";
    const match = accept.match(new RegExp(`${key}=(\\d+(?:\\.\\d+)*)`));
    return match ? match[1] : null;
  }
  matchVersion(requestVersion, handlerVersion) {
    if (handlerVersion === VERSION_NEUTRAL) {
      return true;
    }
    if (!handlerVersion) {
      return true;
    }
    if (!requestVersion) {
      const defaultVersion = this.options?.defaultVersion;
      if (defaultVersion) {
        requestVersion = defaultVersion;
      } else {
        return true;
      }
    }
    const handlerVersions = Array.isArray(handlerVersion) ? handlerVersion : [handlerVersion];
    const requestVersions = Array.isArray(requestVersion) ? requestVersion : [requestVersion];
    return handlerVersions.some((hv) => requestVersions.includes(hv));
  }
  buildVersionedPath(basePath, version) {
    if (!this.options || this.options.type !== "uri") {
      return basePath;
    }
    const prefix = this.options.prefix === false ? "" : this.options.prefix || "v";
    const versionPath = `${prefix}${version}`;
    if (basePath.startsWith("/")) {
      return `/${versionPath}${basePath}`;
    }
    return `/${versionPath}/${basePath}`;
  }
}
var versioningManager = new VersioningManager;
// src/cluster/cluster.ts
function getDefaultWorkerCount() {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  try {
    const os = __require("os");
    return os.cpus?.()?.length || 4;
  } catch {
    return 4;
  }
}
var DEFAULT_OPTIONS4 = {
  workers: getDefaultWorkerCount(),
  workerScript: "",
  respawn: true,
  respawnDelay: 1000,
  maxRespawns: 10,
  gracefulTimeout: 30000
};

class ClusterManager {
  options;
  workers = new Map;
  nextWorkerId = 1;
  isShuttingDown = false;
  messageHandlers = new Map;
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS4, ...options };
  }
  get workerCount() {
    return this.workers.size;
  }
  get activeWorkers() {
    return Array.from(this.workers.values()).filter((w) => w.status === "running" || w.status === "starting");
  }
  async start() {
    if (!this.options.workerScript) {
      throw new Error("workerScript is required");
    }
    const promises = [];
    for (let i = 0;i < this.options.workers; i++) {
      promises.push(this.spawnWorker());
    }
    await Promise.all(promises);
  }
  async spawnWorker() {
    const id = this.nextWorkerId++;
    const worker = new Worker(this.options.workerScript, {
      name: `worker-${id}`
    });
    const info = {
      id,
      worker,
      status: "starting",
      startedAt: Date.now(),
      respawnCount: 0
    };
    this.workers.set(id, info);
    worker.onmessage = (event) => {
      this.handleWorkerMessage(id, event.data);
    };
    worker.onerror = (error) => {
      this.handleWorkerError(id, error);
    };
    return new Promise((resolve2) => {
      const timeout3 = setTimeout(() => {
        info.status = "running";
        resolve2();
      }, 5000);
      const handler = (msg) => {
        if (msg.type === "ready") {
          clearTimeout(timeout3);
          info.status = "running";
          resolve2();
        }
      };
      this.messageHandlers.set(`ready-${id}`, handler);
    });
  }
  handleWorkerMessage(workerId, message) {
    const handler = this.messageHandlers.get(`${message.type}-${workerId}`);
    if (handler) {
      handler(message, workerId);
    }
    if (message.type === "ready") {
      const info = this.workers.get(workerId);
      if (info) {
        info.status = "running";
      }
    }
  }
  handleWorkerError(workerId, error) {
    const info = this.workers.get(workerId);
    if (!info)
      return;
    info.status = "crashed";
    info.lastError = error.message;
    if (this.isShuttingDown)
      return;
    if (this.options.respawn && info.respawnCount < this.options.maxRespawns) {
      setTimeout(() => {
        this.respawnWorker(workerId);
      }, this.options.respawnDelay);
    }
  }
  async respawnWorker(oldWorkerId) {
    const oldInfo = this.workers.get(oldWorkerId);
    const respawnCount = oldInfo ? oldInfo.respawnCount + 1 : 1;
    this.workers.delete(oldWorkerId);
    const id = this.nextWorkerId++;
    const worker = new Worker(this.options.workerScript, {
      name: `worker-${id}`
    });
    const info = {
      id,
      worker,
      status: "starting",
      startedAt: Date.now(),
      respawnCount
    };
    this.workers.set(id, info);
    worker.onmessage = (event) => {
      this.handleWorkerMessage(id, event.data);
    };
    worker.onerror = (error) => {
      this.handleWorkerError(id, error);
    };
  }
  broadcast(message) {
    for (const info of this.workers.values()) {
      if (info.status === "running") {
        info.worker.postMessage(message);
      }
    }
  }
  sendToWorker(workerId, message) {
    const info = this.workers.get(workerId);
    if (!info || info.status !== "running")
      return false;
    info.worker.postMessage(message);
    return true;
  }
  async shutdown() {
    this.isShuttingDown = true;
    this.broadcast({ type: "shutdown" });
    const shutdownPromises = Array.from(this.workers.values()).map((info) => {
      return new Promise((resolve2) => {
        info.status = "stopping";
        const timeout3 = setTimeout(() => {
          info.worker.terminate();
          info.status = "stopped";
          resolve2();
        }, this.options.gracefulTimeout);
        const checkStopped = () => {
          if (info.status === "stopped") {
            clearTimeout(timeout3);
            resolve2();
          } else {
            setTimeout(checkStopped, 100);
          }
        };
        checkStopped();
      });
    });
    await Promise.all(shutdownPromises);
    this.workers.clear();
  }
  getStats() {
    let activeWorkers = 0;
    let crashedWorkers = 0;
    let totalRespawns = 0;
    for (const info of this.workers.values()) {
      if (info.status === "running" || info.status === "starting") {
        activeWorkers++;
      } else if (info.status === "crashed") {
        crashedWorkers++;
      }
      totalRespawns += info.respawnCount;
    }
    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      crashedWorkers,
      totalRespawns
    };
  }
}
function isPrimaryProcess() {
  if (typeof Bun !== "undefined" && "isMainThread" in Bun) {
    return Bun.isMainThread === true;
  }
  return typeof self === "undefined" || typeof self.postMessage !== "function";
}
function isWorkerProcess() {
  if (typeof Bun !== "undefined" && "isMainThread" in Bun) {
    return Bun.isMainThread === false;
  }
  return typeof self !== "undefined" && typeof self.postMessage === "function";
}
function notifyReady() {
  if (isWorkerProcess()) {
    self.postMessage({ type: "ready" });
  }
}
function onShutdown(callback) {
  if (isWorkerProcess()) {
    self.onmessage = async (event) => {
      if (event.data.type === "shutdown") {
        await callback();
        self.close();
      }
    };
  }
}
// src/resilience/circuit-breaker.ts
var DEFAULT_OPTIONS5 = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  resetTimeout: 60000,
  volumeThreshold: 10,
  onStateChange: () => {},
  onSuccess: () => {},
  onFailure: () => {},
  isFailure: () => true
};

class CircuitBreaker {
  action;
  options;
  state = "closed";
  failures = 0;
  successes = 0;
  totalCalls = 0;
  consecutiveSuccesses = 0;
  consecutiveFailures = 0;
  lastFailureTime = null;
  lastSuccessTime = null;
  resetTimer = null;
  halfOpenCalls = 0;
  constructor(action, options = {}) {
    this.action = action;
    this.options = { ...DEFAULT_OPTIONS5, ...options };
  }
  get currentState() {
    return this.state;
  }
  get stats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures
    };
  }
  async execute() {
    this.checkResetTimeout();
    if (this.state === "open") {
      throw new CircuitOpenError("Circuit breaker is open");
    }
    if (this.state === "half-open" && this.halfOpenCalls >= 1) {
      throw new CircuitOpenError("Circuit breaker is testing");
    }
    if (this.state === "half-open") {
      this.halfOpenCalls++;
    }
    this.totalCalls++;
    try {
      const result = await this.executeWithTimeout();
      this.onSuccess();
      return result;
    } catch (error) {
      if (this.options.isFailure(error)) {
        this.onFailure(error);
      }
      throw error;
    }
  }
  async executeWithTimeout() {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new CircuitTimeoutError("Circuit breaker timeout"));
      }, this.options.timeout);
    });
    return Promise.race([this.action(), timeoutPromise]);
  }
  onSuccess() {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    this.options.onSuccess();
    if (this.state === "half-open") {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo("closed");
      }
      this.halfOpenCalls = 0;
    }
  }
  onFailure(error) {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.options.onFailure(error);
    if (this.state === "half-open") {
      this.transitionTo("open");
      this.halfOpenCalls = 0;
      return;
    }
    if (this.state === "closed") {
      if (this.totalCalls >= this.options.volumeThreshold && this.consecutiveFailures >= this.options.failureThreshold) {
        this.transitionTo("open");
      }
    }
  }
  checkResetTimeout() {
    if (this.state === "open" && this.lastFailureTime && Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
      this.transitionTo("half-open");
    }
  }
  transitionTo(newState) {
    if (this.state === newState)
      return;
    const oldState = this.state;
    this.state = newState;
    if (newState === "closed") {
      this.consecutiveFailures = 0;
    }
    if (newState === "half-open") {
      this.consecutiveSuccesses = 0;
      this.halfOpenCalls = 0;
    }
    this.options.onStateChange(oldState, newState);
  }
  reset() {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.halfOpenCalls = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
  forceOpen() {
    this.transitionTo("open");
    this.lastFailureTime = Date.now();
  }
  forceClosed() {
    this.transitionTo("closed");
  }
}

class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

class CircuitTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitTimeoutError";
  }
}

class CircuitBreakerRegistry {
  breakers = new Map;
  register(name, action, options) {
    const breaker = new CircuitBreaker(action, options);
    this.breakers.set(name, breaker);
    return breaker;
  }
  get(name) {
    return this.breakers.get(name);
  }
  getOrCreate(name, action, options) {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = this.register(name, action, options);
    }
    return breaker;
  }
  remove(name) {
    return this.breakers.delete(name);
  }
  clear() {
    this.breakers.clear();
  }
  getAllStats() {
    const stats = new Map;
    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.stats);
    }
    return stats;
  }
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
var circuitBreakerRegistry = new CircuitBreakerRegistry;
function withCircuitBreaker(name, action, options) {
  const breaker = circuitBreakerRegistry.getOrCreate(name, action, options);
  return () => breaker.execute();
}
async function circuitBreaker(action, options) {
  const breaker = new CircuitBreaker(action, options);
  return breaker.execute();
}
// src/config/config.interface.ts
var CONFIG_OPTIONS = Symbol("CONFIG_OPTIONS");
var CONFIGURATION_TOKEN = Symbol("CONFIGURATION_TOKEN");
var CONFIGURATION_SERVICE_TOKEN = Symbol("ConfigService");
// src/config/config.service.ts
class ConfigService {
  config;
  internalConfig = new Map;
  cache = new Map;
  isCacheEnabled = false;
  constructor(config = {}) {
    this.config = config;
    this.loadFromEnv();
    this.loadFromConfig();
  }
  loadFromEnv() {
    if (typeof process !== "undefined" && process.env) {
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          this.internalConfig.set(key, value);
        }
      }
    }
    if (typeof Bun !== "undefined" && Bun.env) {
      for (const [key, value] of Object.entries(Bun.env)) {
        if (value !== undefined) {
          this.internalConfig.set(key, value);
        }
      }
    }
  }
  loadFromConfig() {
    if (this.config) {
      this.flattenObject(this.config, "");
    }
  }
  flattenObject(obj, prefix) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        this.flattenObject(value, fullKey);
      } else {
        this.internalConfig.set(fullKey, value);
      }
    }
  }
  get(propertyPath, defaultValue) {
    if (this.isCacheEnabled && this.cache.has(propertyPath)) {
      return this.cache.get(propertyPath);
    }
    let value = this.internalConfig.get(propertyPath);
    if (value === undefined) {
      value = this.getNestedValue(this.config, propertyPath);
    }
    if (value === undefined) {
      value = this.internalConfig.get(propertyPath.toUpperCase().replace(/\./g, "_"));
    }
    const result = value !== undefined ? value : defaultValue;
    if (this.isCacheEnabled && result !== undefined) {
      this.cache.set(propertyPath, result);
    }
    return result;
  }
  getOrThrow(propertyPath) {
    const value = this.get(propertyPath);
    if (value === undefined) {
      throw new Error(`Configuration key "${propertyPath}" does not exist`);
    }
    return value;
  }
  getNestedValue(obj, path) {
    if (!obj)
      return;
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) {
        return;
      }
      current = current[key];
    }
    return current;
  }
  set(propertyPath, value) {
    this.internalConfig.set(propertyPath, value);
    if (this.isCacheEnabled) {
      this.cache.delete(propertyPath);
    }
  }
  setEnableCache(enabled) {
    this.isCacheEnabled = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }
}
ConfigService = __legacyDecorateClassTS([
  Injectable(),
  __legacyDecorateParamTS(0, Optional()),
  __legacyDecorateParamTS(0, Inject(CONFIGURATION_TOKEN)),
  __legacyMetadataTS("design:paramtypes", [
    typeof Record === "undefined" ? Object : Record
  ])
], ConfigService);
// src/config/config.module.ts
class ConfigModule {
  static forRoot(options = {}) {
    const configProviders = ConfigModule.createConfigProviders(options);
    return {
      module: ConfigModule,
      global: options.isGlobal ?? false,
      providers: [
        ...configProviders,
        ConfigService
      ],
      exports: [ConfigService, CONFIGURATION_TOKEN]
    };
  }
  static forFeature(factory) {
    const token = Symbol("CONFIG_FEATURE");
    return {
      module: ConfigModule,
      providers: [
        {
          provide: token,
          useFactory: factory
        }
      ],
      exports: [token]
    };
  }
  static createConfigProviders(options) {
    const providers = [
      {
        provide: CONFIG_OPTIONS,
        useValue: options
      }
    ];
    const configFactory = async () => {
      let config = {};
      if (!options.ignoreEnvFile) {
        const envConfig = await ConfigModule.loadEnvFile(options.envFilePath);
        config = { ...config, ...envConfig };
      }
      if (!options.ignoreEnvVars) {
        const envVars = ConfigModule.loadEnvVars();
        config = { ...config, ...envVars };
      }
      if (options.load) {
        for (const loader of options.load) {
          const loaded = await loader();
          config = { ...config, ...loaded };
        }
      }
      if (options.expandVariables) {
        config = ConfigModule.expandVariables(config);
      }
      if (options.validate) {
        config = options.validate(config);
      }
      if (options.validationSchema) {
        config = ConfigModule.validateWithZod(config, options.validationSchema, options.validationOptions);
      }
      return config;
    };
    providers.push({
      provide: CONFIGURATION_TOKEN,
      useFactory: configFactory
    });
    return providers;
  }
  static async loadEnvFile(envFilePath) {
    const config = {};
    const paths = envFilePath ? Array.isArray(envFilePath) ? envFilePath : [envFilePath] : [".env"];
    for (const filePath of paths) {
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          const parsed = ConfigModule.parseEnvContent(content);
          Object.assign(config, parsed);
        }
      } catch (error) {}
    }
    return config;
  }
  static parseEnvContent(content) {
    const config = {};
    const lines = content.split(`
`);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#"))
        continue;
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1)
        continue;
      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      config[key] = value;
    }
    return config;
  }
  static loadEnvVars() {
    const config = {};
    if (typeof Bun !== "undefined" && Bun.env) {
      for (const [key, value] of Object.entries(Bun.env)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    } else if (typeof process !== "undefined" && process.env) {
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    }
    return config;
  }
  static expandVariables(config) {
    const result = { ...config };
    const expand = (value) => {
      return value.replace(/\$\{([^}]+)\}/g, (_, key) => {
        return result[key] || process.env[key] || "";
      });
    };
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string") {
        result[key] = expand(value);
      }
    }
    return result;
  }
  static validateWithZod(config, schema, options) {
    try {
      if (typeof schema.parse === "function") {
        return schema.parse(config);
      }
      if (typeof schema.safeParse === "function") {
        const result = schema.safeParse(config);
        if (!result.success) {
          const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
          throw new Error(`Configuration validation failed: ${errors}`);
        }
        return result.data;
      }
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    return config;
  }
}
ConfigModule = __legacyDecorateClassTS([
  Module({})
], ConfigModule);
function registerAs(namespace, factory) {
  const fn = factory;
  fn.KEY = namespace;
  return fn;
}
export {
  withCircuitBreaker,
  versioningManager,
  timeout,
  serveStatic,
  registerAs,
  onShutdown,
  onRequestTelemetry,
  notifyReady,
  isWorkerProcess,
  isValueProvider,
  isPrimaryProcess,
  isForwardReference,
  isFactoryProvider,
  isExistingProvider,
  isClassProvider,
  hasOnModuleInit,
  hasOnModuleDestroy,
  hasOnApplicationShutdown,
  hasOnApplicationBootstrap,
  hasConfigureMethod,
  hasBeforeApplicationShutdown,
  gracefulShutdown,
  getProviderToken,
  getGracefulShutdownManager,
  forwardRef,
  emitRequestTelemetry,
  createZodDto,
  createTimeoutHandler,
  cors,
  circuitBreakerRegistry,
  circuitBreaker,
  ZodValidationPipe,
  VersioningManager,
  Version,
  ValidationPipe,
  VERSION_NEUTRAL,
  VERSION_METADATA,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  UnauthorizedException,
  TrimPipe,
  TimeoutMiddleware,
  StaticMiddleware,
  ServiceUnavailableException,
  Scope,
  RouteExplorer,
  RequestTimeoutError,
  RequestHandler,
  Reflector,
  Put,
  Post,
  PayloadTooLargeException,
  Patch,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseFloatPipe,
  ParseEnumPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  OrbitFactory,
  OrbitApplication,
  Options,
  Optional,
  NotImplementedException,
  NotFoundException,
  NotAcceptableException,
  ModuleScanner,
  ModuleCompiler,
  Module,
  MiddlewareRegistry,
  MiddlewareConsumerImpl,
  MiddlewareConfigProxyImpl,
  MethodNotAllowedException,
  METADATA_KEYS,
  InternalServerErrorException,
  Injectable,
  Inject,
  HttpException,
  Head,
  GracefulShutdownManager,
  GoneException,
  Get,
  GatewayTimeoutException,
  GalaxyFactory,
  ForbiddenException,
  ExecutionPipeline,
  Delete,
  DefaultValuePipe,
  CorsMiddleware,
  Controller,
  Container,
  ConflictException,
  ConfigService,
  ConfigModule,
  ClusterManager,
  CircuitTimeoutError,
  CircuitOpenError,
  CircuitBreakerRegistry,
  CircuitBreaker,
  CONFIG_OPTIONS,
  CONFIGURATION_TOKEN,
  CONFIGURATION_SERVICE_TOKEN,
  BunFactory,
  BadRequestException,
  BadGatewayException,
  All
};
