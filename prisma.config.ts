import { defineConfig } from 'prisma/config';

// DATABASE_URL is read from schema.prisma via env("DATABASE_URL").
// Railway injects it as a real env var — no dotenv needed in production.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
});
