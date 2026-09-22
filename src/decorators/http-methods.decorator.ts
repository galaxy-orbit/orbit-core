import 'reflect-metadata';
import { METADATA_KEYS } from '../metadata/constants';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ALL';

function createRouteDecorator(method: HttpMethod) {
  return (path: string = ''): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      Reflect.defineMetadata(METADATA_KEYS.ROUTE_PATH, path, target, propertyKey);
      Reflect.defineMetadata(METADATA_KEYS.ROUTE_METHOD, method, target, propertyKey);
      return descriptor;
    };
  };
}

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Patch = createRouteDecorator('PATCH');
export const Delete = createRouteDecorator('DELETE');
export const Head = createRouteDecorator('HEAD');
export const Options = createRouteDecorator('OPTIONS');
export const All = createRouteDecorator('ALL');
