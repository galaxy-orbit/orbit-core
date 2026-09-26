export declare const TRANSFORM_METADATA: unique symbol;
export interface TransformOptions {
    toClassOnly?: boolean;
    toPlainOnly?: boolean;
    groups?: string[];
}
export interface TransformFn {
    (value: any, obj: any): any;
}
export declare function Transform(transformFn: TransformFn, options?: TransformOptions): PropertyDecorator;
export declare function ToInt(): PropertyDecorator;
export declare function ToFloat(): PropertyDecorator;
export declare function ToBoolean(): PropertyDecorator;
export declare function ToDate(): PropertyDecorator;
export declare function ToLowerCase(): PropertyDecorator;
export declare function ToUpperCase(): PropertyDecorator;
export declare function Trim(): PropertyDecorator;
export declare function ToArray(): PropertyDecorator;
export declare function DefaultValue(defaultVal: any): PropertyDecorator;
export declare function applyTransforms<T extends object>(instance: T): T;
