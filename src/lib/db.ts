import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy proxy — defers neon() until the first actual query, so the module
// can be imported at build time without DATABASE_URL being present.
let _instance: NeonHttpDatabase<typeof schema> | undefined;

function getInstance(): NeonHttpDatabase<typeof schema> {
  if (!_instance) {
    _instance = drizzle(neon(process.env.DATABASE_URL!), { schema });
  }
  return _instance;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return getInstance()[prop as keyof NeonHttpDatabase<typeof schema>];
  },
});
