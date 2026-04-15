import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  STORAGE_BACKEND: z.enum(['sqlite', 'mongodb']).default('sqlite'),
  MONGODB_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.STORAGE_BACKEND === 'mongodb' && !parsedEnv.MONGODB_URL) {
  throw new Error('MONGODB_URL is required when STORAGE_BACKEND=mongodb.');
}

export const env = parsedEnv;
