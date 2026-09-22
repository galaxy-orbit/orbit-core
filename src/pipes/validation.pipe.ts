import type { PipeTransform, ArgumentMetadata } from '../pipeline/execution-pipeline';
import { BadRequestException } from '../exceptions';

export interface ZodSchema {
  parse(data: unknown): unknown;
  safeParse(data: unknown): { success: boolean; data?: unknown; error?: any };
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

export class ValidationPipe implements PipeTransform {
  private readonly options: ValidationPipeOptions;

  constructor(options: ValidationPipeOptions = {}) {
    this.options = {
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      disableErrorMessages: false,
      ...options,
    };
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!value) {
      return value;
    }

    const schema = this.options.schema || (metadata.metatype as any)?.schema;
    
    if (!schema) {
      return value;
    }

    return this.validate(value, schema);
  }

  private validate(value: any, schema: ZodSchema): any {
    const result = schema.safeParse(value);

    if (!result.success) {
      const errors = this.formatZodErrors(result.error);
      
      if (this.options.exceptionFactory) {
        throw this.options.exceptionFactory(errors);
      }

      const message = this.options.disableErrorMessages 
        ? 'Validation failed' 
        : errors.join('; ');
        
      throw new BadRequestException(message);
    }

    return this.options.transform ? result.data : value;
  }

  private formatZodErrors(error: any): string[] {
    if (!error?.errors) {
      return ['Validation failed'];
    }

    return error.errors.map((err: any) => {
      const path = err.path?.join('.') || 'value';
      return `${path}: ${err.message}`;
    });
  }
}

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = result.error.errors
        .map((e: any) => `${e.path.join('.') || 'value'}: ${e.message}`)
        .join('; ');
      throw new BadRequestException(`Validation failed: ${errors}`);
    }

    return result.data;
  }
}

export function createZodDto<T extends ZodSchema>(schema: T) {
  class ZodDto {
    static schema = schema;
    
    constructor(data?: any) {
      if (data) {
        Object.assign(this, schema.parse(data));
      }
    }
  }
  
  return ZodDto as { new (data?: any): any; schema: T };
}
