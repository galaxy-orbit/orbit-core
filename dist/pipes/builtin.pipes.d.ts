import type { PipeTransform, ArgumentMetadata } from '../pipeline/execution-pipeline';
export declare class ParseIntPipe implements PipeTransform<string, number> {
    transform(value: string, metadata: ArgumentMetadata): number;
}
export declare class ParseFloatPipe implements PipeTransform<string, number> {
    transform(value: string, metadata: ArgumentMetadata): number;
}
export declare class ParseBoolPipe implements PipeTransform<string, boolean> {
    transform(value: string, metadata: ArgumentMetadata): boolean;
}
export declare class ParseArrayPipe implements PipeTransform<string, any[]> {
    private separator;
    constructor(separator?: string);
    transform(value: string, metadata: ArgumentMetadata): any[];
}
export declare class DefaultValuePipe<T = any> implements PipeTransform<T | undefined, T> {
    private defaultValue;
    constructor(defaultValue: T);
    transform(value: T | undefined, metadata: ArgumentMetadata): T;
}
export declare class TrimPipe implements PipeTransform<string, string> {
    transform(value: string, metadata: ArgumentMetadata): string;
}
export declare class ParseUUIDPipe implements PipeTransform<string, string> {
    private readonly uuidRegex;
    transform(value: string, metadata: ArgumentMetadata): string;
}
export declare class ParseEnumPipe<T extends Record<string, any>> implements PipeTransform<string, string | number> {
    private readonly enumType;
    private readonly allowedValues;
    constructor(enumType: T);
    transform(value: string, metadata: ArgumentMetadata): string | number;
}
