export const METADATA_KEYS = {
  INJECTABLE: 'orbit:injectable',
  CONTROLLER: 'orbit:controller',
  MODULE: 'orbit:module',
  
  ROUTE_PATH: 'orbit:route:path',
  ROUTE_METHOD: 'orbit:route:method',
  
  PARAM_TYPES: 'design:paramtypes',
  RETURN_TYPE: 'design:returntype',
  ROUTE_PARAMS: 'orbit:route:params',
  
  INJECT_TOKEN: 'orbit:inject:token',
  SCOPE: 'orbit:scope',
  OPTIONAL: 'orbit:optional',
  
  MODULE_IMPORTS: 'orbit:module:imports',
  MODULE_CONTROLLERS: 'orbit:module:controllers',
  MODULE_PROVIDERS: 'orbit:module:providers',
  MODULE_EXPORTS: 'orbit:module:exports',
  
  GUARDS: 'orbit:guards',
  PIPES: 'orbit:pipes',
  INTERCEPTORS: 'orbit:interceptors',
  EXCEPTION_FILTERS: 'orbit:exception-filters',
} as const;

export type MetadataKey = typeof METADATA_KEYS[keyof typeof METADATA_KEYS];
