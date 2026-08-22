require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@school.edu.ng").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
  const hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");

    if (existing.rowCount > 0) {
      await client.query(
        "UPDATE users SET email = $1, password_hash = $2 WHERE id = $3",
        [email, hash, existing.rows[0].id]
      );
    } else {
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        ["School Administrator", email, hash]
      );
    }

    await client.query("COMMIT");
    console.log(`Admin credentials reset for ${email}. Existing data was preserved.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Admin reset failed:", error.message);
  process.exit(1);
});
