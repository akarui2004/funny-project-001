import { z } from 'zod';

export const ENV_SCHEMA = z.object({
  port: z.coerce.number().default(3000)
});
