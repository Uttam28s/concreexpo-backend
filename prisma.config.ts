import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL is optional during build (prisma generate doesn't need it)
// It's only required when running migrations or connecting to the database
// Use a dummy URL during build if DATABASE_URL is not available
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
