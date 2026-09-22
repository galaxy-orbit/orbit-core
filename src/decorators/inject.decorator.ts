import 'reflect-metadata';
import { METADATA_KEYS } from '../metadata/constants';
import type { InjectionToken } from '../interfaces/type.interface';

export function Inject(token: InjectionToken): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens = Reflect.getMetadata(METADATA_KEYS.INJECT_TOKEN, target) || {};
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(METADATA_KEYS.INJECT_TOKEN, existingTokens, target);
  };
}

export function Optional(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingOptional = Reflect.getMetadata(METADATA_KEYS.OPTIONAL, target) || [];
    existingOptional.push(parameterIndex);
    Reflect.defineMetadata(METADATA_KEYS.OPTIONAL, existingOptional, target);
  };
}
