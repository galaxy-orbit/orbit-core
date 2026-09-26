import 'reflect-metadata';
import type { CanActivate, GuardClass } from '../interfaces/guard.interface';
export declare const GUARDS_METADATA = "orbit:guards";
export declare function UseGuards(...guards: (GuardClass | CanActivate)[]): MethodDecorator & ClassDecorator;
export declare function getGuards(target: Object, propertyKey?: string | symbol): (GuardClass | CanActivate)[];
