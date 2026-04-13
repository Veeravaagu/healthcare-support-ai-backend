import type { ZodSchema } from 'zod';

export const parseWithSchema = <T>(schema: ZodSchema<T>, input: unknown): T => {
  return schema.parse(input);
};
