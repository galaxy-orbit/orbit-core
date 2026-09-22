import 'reflect-metadata';
import { METADATA_KEYS } from '../metadata/constants';
import type { ModuleMetadata } from '../interfaces/module.interface';

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(METADATA_KEYS.MODULE, true, target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_IMPORTS, metadata.imports || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_CONTROLLERS, metadata.controllers || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_PROVIDERS, metadata.providers || [], target);
    Reflect.defineMetadata(METADATA_KEYS.MODULE_EXPORTS, metadata.exports || [], target);
  };
}
