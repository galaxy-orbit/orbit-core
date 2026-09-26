export declare const METADATA_KEYS: {
    readonly INJECTABLE: "orbit:injectable";
    readonly CONTROLLER: "orbit:controller";
    readonly MODULE: "orbit:module";
    readonly ROUTE_PATH: "orbit:route:path";
    readonly ROUTE_METHOD: "orbit:route:method";
    readonly PARAM_TYPES: "design:paramtypes";
    readonly RETURN_TYPE: "design:returntype";
    readonly ROUTE_PARAMS: "orbit:route:params";
    readonly INJECT_TOKEN: "orbit:inject:token";
    readonly SCOPE: "orbit:scope";
    readonly OPTIONAL: "orbit:optional";
    readonly MODULE_IMPORTS: "orbit:module:imports";
    readonly MODULE_CONTROLLERS: "orbit:module:controllers";
    readonly MODULE_PROVIDERS: "orbit:module:providers";
    readonly MODULE_EXPORTS: "orbit:module:exports";
    readonly GUARDS: "orbit:guards";
    readonly PIPES: "orbit:pipes";
    readonly INTERCEPTORS: "orbit:interceptors";
    readonly EXCEPTION_FILTERS: "orbit:exception-filters";
};
export type MetadataKey = typeof METADATA_KEYS[keyof typeof METADATA_KEYS];
//# sourceMappingURL=constants.d.ts.map