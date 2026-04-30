import { env } from "@generai/env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const sql = neon(env.DATABASE_URL || "");
export const db = drizzle(sql, { schema, casing: "snake_case" });

// For only local dev use 👇
// import { env } from "@generai/env/server";
// import { drizzle } from "drizzle-orm/node-postgres";
// import * as schema from "./schema";
// import { Pool } from "pg";

// const pool = new Pool({
//   connectionString: env.DATABASE_URL,
// });

// export const db = drizzle(pool, { schema, casing: "snake_case" });
