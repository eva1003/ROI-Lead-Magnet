import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL not set – assessment persistence disabled. Set DATABASE_URL to enable."
  );
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
