// Applies schema.sql to the database pointed at by DATABASE_URL.
// Usage: npm run migrate

const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  console.log("Applying schema.sql ...");
  await pool.query(sql);
  console.log("Done. Tables created.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
