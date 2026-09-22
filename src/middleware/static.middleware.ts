import type { StaticServeOptions, OrbitMiddleware } from './middleware.interface';
import { join, extname, resolve } from 'path';

interface CachedFile {
  file: ReturnType<typeof Bun.file>;
  size: number;
  mtime: Date | null;
  etag: string;
  contentType: string;
  cachedAt: number;
}

interface FileCache {
  entries: Map<string, CachedFile>;
  maxSize: number;
  ttl: number;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.wasm': 'application/wasm',
};

const DEFAULT_OPTIONS: StaticServeOptions = {
  root: 'public',
  prefix: '',
  index: ['index.html', 'index.htm'],
  dotFiles: 'ignore',
  maxAge: 0,
  immutable: false,
  etag: true,
  lastModified: true,
};

export class StaticMiddleware implements OrbitMiddleware {
  private options: Required<StaticServeOptions>;
  private rootPath: string;
  private cache: FileCache;

  constructor(options: Partial<StaticServeOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      cacheMaxSize: 100,
      cacheTtl: 60000,
      cacheDebug: false,
      ...options,
    } as Required<StaticServeOptions>;
    this.rootPath = resolve(this.options.root);
    this.cache = {
      entries: new Map(),
      maxSize: this.options.cacheMaxSize,
      ttl: this.options.cacheTtl,
    };
  }

  private getCachedFile(filePath: string): CachedFile | null {
    const cached = this.cache.entries.get(filePath);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.cachedAt > this.cache.ttl) {
      this.cache.entries.delete(filePath);
      return null;
    }
    
    this.cache.entries.delete(filePath);
    this.cache.entries.set(filePath, cached);
    
    return cached;
  }

  private async validateCachedFile(filePath: string, cached: CachedFile): Promise<boolean> {
    try {
      const file = Bun.file(filePath);
      const stats = await file.stat();
      if (!stats) return false;
      
      const mtimeMs = stats.mtime?.getTime() || 0;
      const cachedMtimeMs = cached.mtime?.getTime() || 0;
      
      return stats.size === cached.size && mtimeMs === cachedMtimeMs;
    } catch {
      return false;
    }
  }

  private setCachedFile(filePath: string, cached: CachedFile): void {
    if (this.cache.entries.size >= this.cache.maxSize) {
      const oldestKey = this.cache.entries.keys().next().value;
      if (oldestKey) this.cache.entries.delete(oldestKey);
    }
    this.cache.entries.set(filePath, cached);
  }

  clearCache(): void {
    this.cache.entries.clear();
  }

  async use(request: Request, next: () => Promise<Response>): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next();
    }

    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (this.options.prefix && !pathname.startsWith(this.options.prefix)) {
      return next();
    }

    if (this.options.prefix) {
      pathname = pathname.slice(this.options.prefix.length) || '/';
    }

    if (this.containsDotSegment(pathname)) {
      return next();
    }

    const filename = pathname.split('/').pop() || '';
    if (filename.startsWith('.')) {
      if (this.options.dotFiles === 'deny') {
        return new Response('Forbidden', { status: 403 });
      }
      if (this.options.dotFiles === 'ignore') {
        return next();
      }
    }

    let filePath = join(this.rootPath, pathname);

    try {
      const cached = this.getCachedFile(filePath);
      
      if (cached && await this.validateCachedFile(filePath, cached)) {
        const headers = new Headers();
        headers.set('Content-Type', cached.contentType);
        headers.set('Content-Length', String(cached.size));
        
        if (this.options.cacheDebug) {
          headers.set('X-Cache', 'HIT');
        }
        
        if (this.options.lastModified && cached.mtime) {
          headers.set('Last-Modified', cached.mtime.toUTCString());
        }
        
        if (this.options.etag) {
          headers.set('ETag', cached.etag);
          const ifNoneMatch = request.headers.get('if-none-match');
          if (ifNoneMatch === cached.etag) {
            return new Response(null, { status: 304, headers });
          }
        }
        
        if (this.options.maxAge !== undefined) {
          let cacheControl = `max-age=${this.options.maxAge}`;
          if (this.options.immutable) cacheControl += ', immutable';
          headers.set('Cache-Control', cacheControl);
        }
        
        if (request.method === 'HEAD') {
          return new Response(null, { status: 200, headers });
        }
        
        return new Response(cached.file, { status: 200, headers });
      } else if (cached) {
        this.cache.entries.delete(filePath);
      }

      const file = Bun.file(filePath);
      let stat = await file.exists();

      if (!stat) {
        if (this.options.index) {
          for (const indexFile of this.options.index) {
            const indexPath = join(filePath, indexFile);
            const indexBunFile = Bun.file(indexPath);
            if (await indexBunFile.exists()) {
              filePath = indexPath;
              stat = true;
              break;
            }
          }
        }
      }

      if (!stat) {
        return next();
      }

      const bunFile = Bun.file(filePath);
      const fileStats = await bunFile.stat();

      if (!fileStats || fileStats.isDirectory()) {
        return next();
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const etag = `"${fileStats.size.toString(16)}-${fileStats.mtime?.getTime().toString(16)}"`;

      this.setCachedFile(filePath, {
        file: bunFile,
        size: fileStats.size,
        mtime: fileStats.mtime || null,
        etag,
        contentType,
        cachedAt: Date.now(),
      });

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', String(fileStats.size));
      
      if (this.options.cacheDebug) {
        headers.set('X-Cache', 'MISS');
      }

      if (this.options.lastModified && fileStats.mtime) {
        headers.set('Last-Modified', fileStats.mtime.toUTCString());
      }

      if (this.options.etag) {
        headers.set('ETag', etag);

        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
          return new Response(null, { status: 304, headers });
        }
      }

      if (this.options.maxAge !== undefined) {
        let cacheControl = `max-age=${this.options.maxAge}`;
        if (this.options.immutable) {
          cacheControl += ', immutable';
        }
        headers.set('Cache-Control', cacheControl);
      }

      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }

      return new Response(bunFile, { status: 200, headers });
    } catch (error) {
      return next();
    }
  }

  private containsDotSegment(pathname: string): boolean {
    const segments = pathname.split('/');
    return segments.some((segment) => segment === '..' || segment === '.');
  }
}

export function serveStatic(options?: Partial<StaticServeOptions>): StaticMiddleware {
  return new StaticMiddleware(options);
}
