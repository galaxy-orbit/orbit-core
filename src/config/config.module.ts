import { Module } from '../decorators';
import type { DynamicModule } from '../interfaces/module.interface';
import type { Provider } from '../interfaces/provider.interface';
import type { Type } from '../interfaces/type.interface';
import { ConfigService } from './config.service';
import { 
  type ConfigModuleOptions, 
  type ConfigFactory,
  CONFIG_OPTIONS, 
  CONFIGURATION_TOKEN 
} from './config.interface';

@Module({})
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    const configProviders = ConfigModule.createConfigProviders(options);
    
    return {
      module: ConfigModule,
      global: options.isGlobal ?? false,
      providers: [
        ...configProviders,
        ConfigService,
      ],
      exports: [ConfigService, CONFIGURATION_TOKEN],
    };
  }

  static forFeature(factory: ConfigFactory): DynamicModule {
    const token = Symbol('CONFIG_FEATURE');
    
    return {
      module: ConfigModule,
      providers: [
        {
          provide: token,
          useFactory: factory,
        },
      ],
      exports: [token],
    };
  }

  private static createConfigProviders(options: ConfigModuleOptions): Provider[] {
    const providers: Provider[] = [
      {
        provide: CONFIG_OPTIONS,
        useValue: options,
      },
    ];

    const configFactory = async () => {
      let config: Record<string, any> = {};

      if (!options.ignoreEnvFile) {
        const envConfig = await ConfigModule.loadEnvFile(options.envFilePath);
        config = { ...config, ...envConfig };
      }

      if (!options.ignoreEnvVars) {
        const envVars = ConfigModule.loadEnvVars();
        config = { ...config, ...envVars };
      }

      if (options.load) {
        for (const loader of options.load) {
          const loaded = await loader();
          config = { ...config, ...loaded };
        }
      }

      if (options.expandVariables) {
        config = ConfigModule.expandVariables(config);
      }

      if (options.validate) {
        config = options.validate(config);
      }

      if (options.validationSchema) {
        config = ConfigModule.validateWithZod(config, options.validationSchema, options.validationOptions);
      }

      return config;
    };

    providers.push({
      provide: CONFIGURATION_TOKEN,
      useFactory: configFactory,
    });

    return providers;
  }

  private static async loadEnvFile(
    envFilePath?: string | string[]
  ): Promise<Record<string, string>> {
    const config: Record<string, string> = {};
    
    const paths = envFilePath 
      ? (Array.isArray(envFilePath) ? envFilePath : [envFilePath])
      : ['.env'];

    for (const filePath of paths) {
      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          const parsed = ConfigModule.parseEnvContent(content);
          Object.assign(config, parsed);
        }
      } catch (error) {
      }
    }

    return config;
  }

  private static parseEnvContent(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      config[key] = value;
    }

    return config;
  }

  private static loadEnvVars(): Record<string, string> {
    const config: Record<string, string> = {};
    
    if (typeof Bun !== 'undefined' && Bun.env) {
      for (const [key, value] of Object.entries(Bun.env)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    } else if (typeof process !== 'undefined' && process.env) {
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    }

    return config;
  }

  private static expandVariables(config: Record<string, any>): Record<string, any> {
    const result = { ...config };
    
    const expand = (value: string): string => {
      return value.replace(/\$\{([^}]+)\}/g, (_, key) => {
        return result[key] || process.env[key] || '';
      });
    };

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        result[key] = expand(value);
      }
    }

    return result;
  }

  private static validateWithZod(
    config: Record<string, any>,
    schema: any,
    options?: { allowUnknown?: boolean; abortEarly?: boolean }
  ): Record<string, any> {
    try {
      if (typeof schema.parse === 'function') {
        return schema.parse(config);
      }
      if (typeof schema.safeParse === 'function') {
        const result = schema.safeParse(config);
        if (!result.success) {
          const errors = result.error.errors
            .map((e: any) => `${e.path.join('.')}: ${e.message}`)
            .join(', ');
          throw new Error(`Configuration validation failed: ${errors}`);
        }
        return result.data;
      }
    } catch (error: any) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    
    return config;
  }
}

export function registerAs<T extends Record<string, any>>(
  namespace: string,
  factory: () => T
): (() => T) & { KEY: string } {
  const fn = factory as (() => T) & { KEY: string };
  fn.KEY = namespace;
  return fn;
}
