/**
 * Strongly typed shape of the application configuration, consumed through
 * `ConfigService` using nested dot-notation paths (e.g. `database.uri`).
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: { uri: string };
  jwt: { secret: string; expiresIn: string };
  bcrypt: { saltRounds: number };
  swagger: { path: string };
}

/**
 * Builds the typed configuration object from `process.env`. Values are already
 * validated and defaulted by Joi (see env.validation.ts) before this runs, so
 * the fallbacks here only satisfy the type checker.
 */
export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    uri: process.env.MONGODB_URI ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
  },
  swagger: {
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
});
