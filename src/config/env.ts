import 'dotenv/config';
import { z } from 'zod';

// Valida las variables de entorno al arrancar: si falta una, el servidor
// no debe levantar (mejor fallar rápido que fallar en producción).
const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL debe ser una URL válida' }),
  SUPABASE_ANON_KEY: z.string().min(1, 'Falta SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Falta SUPABASE_SERVICE_ROLE_KEY'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: Number(parsed.data.PORT),
  nodeEnv: parsed.data.NODE_ENV,
  corsOrigin: parsed.data.CORS_ORIGIN,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
};
