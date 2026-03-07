import { defineConfig } from 'prisma/config';

// process.env.DATABASE_URL is injected by Railway at runtime.
// No dotenv needed — this works both locally (if DATABASE_URL is set in shell)
// and in production (Railway injects it as an env var).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
