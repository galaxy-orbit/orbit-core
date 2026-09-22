import 'reflect-metadata';
import { METADATA_KEYS } from '../metadata/constants';
import { Scope } from '../interfaces/provider.interface';

export interface InjectableOptions {
  scope?: Scope;
}

export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
    
    if (options.scope) {
      Reflect.defineMetadata(METADATA_KEYS.SCOPE, options.scope, target);
    }
  };
}
