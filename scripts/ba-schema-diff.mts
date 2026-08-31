// Diffs Better Auth 1.7.1 expected schema vs live better_auth.* tables.
// Uses the project's own better-auth getSchema (not the outdated npx CLI).
// Usage: npx tsx scripts/ba-schema-diff.mts [--apply]
try { process.loadEnvFile?.(".env"); } catch {}

import pg from "pg";
import { getSchema } from "better-auth/db";

const mod: any = await import("../lib/auth.ts");
const auth: any = mod.auth ?? mod.default;
const options = auth.options;

const schema = getSchema(options);

const connectionString =
  process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";

if (!connectionString || connectionString.includes("[YOUR-PASSWORD]")) {
  console.error("DATABASE_URL missing/placeholder");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  options: "-c search_path=better_auth,public",
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

const typeMap: Record<string, string> = {
  string: "text",
  number: "integer",
  boolean: "boolean",
  date: "timestamp",
};

const { rows } = await pool.query(
  `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'better_auth'`
);

const existing = new Map<string, Set<string>>();
for (const r of rows) {
  if (!existing.has(r.table_name)) existing.set(r.table_name, new Set());
  existing.get(r.table_name)!.add(r.column_name);
}

const alters: string[] = [];
for (const [model, def] of Object.entries<any>(schema)) {
  const table = def.modelName ?? model;
  const cols = existing.get(table);
  if (!cols) {
    console.error(`❌ Table "${table}" does not exist in better_auth schema!`);
    continue;
  }
  for (const [fieldName, field] of Object.entries<any>(def.fields)) {
    const colName = field.fieldName ?? fieldName;
    if (!cols.has(colName)) {
      const pgType = typeMap[field.type] ?? "text";
      alters.push(`ALTER TABLE better_auth."${table}" ADD COLUMN IF NOT EXISTS "${colName}" ${pgType};`);
      console.log(`MISSING: ${table}.${colName} (type ${field.type})`);
    }
  }
}

if (alters.length === 0) {
  console.log("\n✅ Schema is in sync — no missing columns.");
} else {
  console.log(`\n--- ${alters.length} FIX-UP STATEMENTS ---\n`);
  console.log(alters.join("\n"));
  if (process.argv.includes("--apply")) {
    await pool.query(alters.join("\n"));
    console.log("\n✅ Applied to database.");
  } else {
    console.log("\n(dry run — re-run with --apply to execute)");
  }
}

await pool.end();
process.exit(0);
