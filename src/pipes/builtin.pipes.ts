import type { PipeTransform, ArgumentMetadata } from '../pipeline/execution-pipeline';
import { BadRequestException } from '../exceptions/http.exception';

export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed (numeric string is expected for ${metadata.data || 'value'})`);
    }
    return val;
  }
}

export class ParseFloatPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new BadRequestException(`Validation failed (numeric string is expected for ${metadata.data || 'value'})`);
    }
    return val;
  }
}

export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException(`Validation failed (boolean string is expected for ${metadata.data || 'value'})`);
  }
}

export class ParseArrayPipe implements PipeTransform<string, any[]> {
  constructor(private separator: string = ',') {}

  transform(value: string, metadata: ArgumentMetadata): any[] {
    if (!value) return [];
    return value.split(this.separator).map(item => item.trim());
  }
}

export class DefaultValuePipe<T = any> implements PipeTransform<T | undefined, T> {
  constructor(private defaultValue: T) {}

  transform(value: T | undefined, metadata: ArgumentMetadata): T {
    return value ?? this.defaultValue;
  }
}

export class TrimPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string') return value;
    return value.trim();
  }
}

export class ParseUUIDPipe implements PipeTransform<string, string> {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException(
        `Validation failed (UUID is expected for ${metadata.data || 'value'})`,
      );
    }
    return value;
  }
}

export class ParseEnumPipe<T extends Record<string, any>> implements PipeTransform<string, string | number> {
  private readonly allowedValues: Set<string | number>;

  constructor(private readonly enumType: T) {
    this.allowedValues = new Set<string | number>(
      Object.values(enumType).filter(
        (v): v is string | number => typeof v === 'string' || typeof v === 'number',
      ),
    );
  }

  transform(value: string, metadata: ArgumentMetadata): string | number {
    if (!this.allowedValues.has(value)) {
      const values = Array.from(this.allowedValues).join(', ');
      throw new BadRequestException(
        `Validation failed (one of ${values} is expected for ${metadata.data || 'value'})`,
      );
    }
    return value;
  }
}
