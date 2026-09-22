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

export function hasOnModuleInit(instance: any): instance is OnModuleInit {
  return instance && typeof instance.onModuleInit === 'function';
}

export function hasOnModuleDestroy(instance: any): instance is OnModuleDestroy {
  return instance && typeof instance.onModuleDestroy === 'function';
}

export function hasOnApplicationBootstrap(instance: any): instance is OnApplicationBootstrap {
  return instance && typeof instance.onApplicationBootstrap === 'function';
}

export function hasOnApplicationShutdown(instance: any): instance is OnApplicationShutdown {
  return instance && typeof instance.onApplicationShutdown === 'function';
}

export function hasBeforeApplicationShutdown(instance: any): instance is BeforeApplicationShutdown {
  return instance && typeof instance.beforeApplicationShutdown === 'function';
}
