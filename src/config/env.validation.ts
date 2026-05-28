import * as Joi from 'joi';

/**
 * Joi schema for the environment variables the application depends on.
 * Validation runs at boot time; a missing or malformed variable aborts startup.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  BCRYPT_SALT_ROUNDS: Joi.number().default(10),
  SWAGGER_PATH: Joi.string().default('docs'),
});
