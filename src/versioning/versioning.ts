import 'reflect-metadata';

export type VersioningType = 'uri' | 'header' | 'media' | 'custom';

export interface VersioningOptions {
  type: VersioningType;
  defaultVersion?: string | string[];
  header?: string;
  key?: string;
  prefix?: string | false;
  extractor?: (request: Request) => string | string[];
}

export const VERSION_METADATA = 'versioning:version';
export const VERSION_NEUTRAL = Symbol('VERSION_NEUTRAL');

export function Version(version: string | string[] | typeof VERSION_NEUTRAL): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor?.value) {
      Reflect.defineMetadata(VERSION_METADATA, version, descriptor.value);
    } else {
      Reflect.defineMetadata(VERSION_METADATA, version, target);
    }
    return descriptor as any;
  };
}

export class VersioningManager {
  private options: VersioningOptions | null = null;

  configure(options: VersioningOptions): void {
    this.options = {
      prefix: 'v',
      header: 'X-API-Version',
      key: 'version',
      ...options,
    };
  }

  getOptions(): VersioningOptions | null {
    return this.options;
  }

  extractVersion(request: Request): string | string[] | null {
    if (!this.options) return null;

    if (this.options.extractor) {
      return this.options.extractor(request);
    }

    switch (this.options.type) {
      case 'uri':
        return this.extractFromUri(request);
      case 'header':
        return this.extractFromHeader(request);
      case 'media':
        return this.extractFromMediaType(request);
      default:
        return null;
    }
  }

  private extractFromUri(request: Request): string | null {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const rawPrefix = this.options?.prefix;
    const prefix = rawPrefix === false ? false : (rawPrefix || 'v');
    
    for (const part of pathParts) {
      if (prefix === false) {
        if (/^\d+(\.\d+)*$/.test(part)) {
          return part;
        }
      } else if (part.startsWith(prefix)) {
        return part.slice(prefix.length);
      }
    }
    
    return null;
  }

  private extractFromHeader(request: Request): string | null {
    const header = this.options?.header || 'X-API-Version';
    return request.headers.get(header);
  }

  private extractFromMediaType(request: Request): string | null {
    const accept = request.headers.get('Accept') || '';
    const key = this.options?.key || 'version';
    
    const match = accept.match(new RegExp(`${key}=(\\d+(?:\\.\\d+)*)`));
    return match ? match[1] : null;
  }

  matchVersion(
    requestVersion: string | string[] | null,
    handlerVersion: string | string[] | typeof VERSION_NEUTRAL | undefined
  ): boolean {
    if (handlerVersion === VERSION_NEUTRAL) {
      return true;
    }

    if (!handlerVersion) {
      return true;
    }

    if (!requestVersion) {
      const defaultVersion = this.options?.defaultVersion;
      if (defaultVersion) {
        requestVersion = defaultVersion;
      } else {
        return true;
      }
    }

    const handlerVersions = Array.isArray(handlerVersion) ? handlerVersion : [handlerVersion];
    const requestVersions = Array.isArray(requestVersion) ? requestVersion : [requestVersion];

    return handlerVersions.some(hv => requestVersions.includes(hv));
  }

  buildVersionedPath(basePath: string, version: string): string {
    if (!this.options || this.options.type !== 'uri') {
      return basePath;
    }

    const prefix = this.options.prefix === false ? '' : (this.options.prefix || 'v');
    const versionPath = `${prefix}${version}`;

    if (basePath.startsWith('/')) {
      return `/${versionPath}${basePath}`;
    }
    
    return `/${versionPath}/${basePath}`;
  }
}

export const versioningManager = new VersioningManager();
