import type { PipeTransform, ArgumentMetadata } from '../pipeline/execution-pipeline';
import { BadRequestException } from '../exceptions';

export interface ZodSchema {
  parse(data: unknown): unknown;
  safeParse(data: unknown): { success: boolean; data?: unknown; error?: any };
}

/**
 * Argument kind a validation pipe applies to. @UsePipes() runs a pipe for EVERY
 * parameter of the method, so validating a body against a schema also throws for
 * @Param('id') / @Query() values. Scope the pipe when the handler mixes parameters.
 */
export type ValidationScope = 'body' | 'query' | 'param' | 'custom';

function matchesScope(
  scope: ValidationScope | ValidationScope[] | undefined,
  type: ArgumentMetadata['type'] | undefined
): boolean {
  if (!scope) {
    return true;
  }
  const wanted = Array.isArray(scope) ? scope : [scope];
  return wanted.includes((type ?? 'custom') as ValidationScope);
}

export interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  disableErrorMessages?: boolean;
  errorHttpStatusCode?: number;
  exceptionFactory?: (errors: string[]) => any;
  schema?: ZodSchema;
  /** Restrict validation to these argument kinds; every argument is validated when omitted. */
  scope?: ValidationScope | ValidationScope[];
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
    if (!matchesScope(this.options.scope, metadata.type)) {
      return value;
    }

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
    // Zod v4 renamed `error.errors` to `error.issues`; support both.
    const issues = error?.issues ?? error?.errors;
    if (!Array.isArray(issues)) {
      return ['Validation failed'];
    }

    return issues.map((err: any) => {
      const path = err.path?.join('.') || 'value';
      return `${path}: ${err.message}`;
    });
  }
}

export class ZodValidationPipe implements PipeTransform {
  constructor(
    private schema: ZodSchema,
    /** Restrict validation to these argument kinds; every argument is validated when omitted. */
    private scope?: ValidationScope | ValidationScope[]
  ) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!matchesScope(this.scope, metadata.type)) {
      return value;
    }

    const result = this.schema.safeParse(value);

    if (!result.success) {
      // Zod v4 renamed `error.errors` to `error.issues`; support both.
      const issues = result.error?.issues ?? result.error?.errors ?? [];
      const errors = issues
        .map((e: any) => `${e.path?.join('.') || 'value'}: ${e.message}`)
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
