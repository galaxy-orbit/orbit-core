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
export declare const VERSION_METADATA = "versioning:version";
export declare const VERSION_NEUTRAL: unique symbol;
export declare function Version(version: string | string[] | typeof VERSION_NEUTRAL): MethodDecorator & ClassDecorator;
export declare class VersioningManager {
    private options;
    configure(options: VersioningOptions): void;
    getOptions(): VersioningOptions | null;
    extractVersion(request: Request): string | string[] | null;
    private extractFromUri;
    private extractFromHeader;
    private extractFromMediaType;
    matchVersion(requestVersion: string | string[] | null, handlerVersion: string | string[] | typeof VERSION_NEUTRAL | undefined): boolean;
    buildVersionedPath(basePath: string, version: string): string;
}
export declare const versioningManager: VersioningManager;
//# sourceMappingURL=versioning.d.ts.map