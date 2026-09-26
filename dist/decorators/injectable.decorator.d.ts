import 'reflect-metadata';
import { Scope } from '../interfaces/provider.interface';
export interface InjectableOptions {
    scope?: Scope;
}
export declare function Injectable(options?: InjectableOptions): ClassDecorator;
