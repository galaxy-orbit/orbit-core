import 'reflect-metadata';
import { METADATA_KEYS } from '../metadata/constants';

export function Controller(prefix: string = ''): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(METADATA_KEYS.INJECTABLE, true, target);
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, prefix, target);
  };
}
