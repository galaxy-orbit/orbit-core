import type { PipeTransform, ArgumentMetadata } from '../pipeline/execution-pipeline';
export interface ZodSchema {
    parse(data: unknown): unknown;
    safeParse(data: unknown): {
        success: boolean;
        data?: unknown;
        error?: any;
    };
}
export interface ValidationPipeOptions {
    transform?: boolean;
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
    disableErrorMessages?: boolean;
    errorHttpStatusCode?: number;
    exceptionFactory?: (errors: string[]) => any;
    schema?: ZodSchema;
}
export declare class ValidationPipe implements PipeTransform {
    private readonly options;
    constructor(options?: ValidationPipeOptions);
    transform(value: any, metadata: ArgumentMetadata): Promise<any>;
    private validate;
    private formatZodErrors;
}
export declare class ZodValidationPipe implements PipeTransform {
    private schema;
    constructor(schema: ZodSchema);
    transform(value: any, metadata: ArgumentMetadata): any;
}
export declare function createZodDto<T extends ZodSchema>(schema: T): {
    new (data?: any): any;
    schema: T;
};
//# sourceMappingURL=validation.pipe.d.ts.map