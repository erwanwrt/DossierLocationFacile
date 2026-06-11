const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcryptjs = require("bcryptjs");

const envPath = path.join(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value;
    }
  });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL is not set in .env.local");
  process.exit(1);
}

async function main() {
  console.log("Connecting to database to debug...");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const users = await pool.query('SELECT * FROM "user"');
    console.log(`\n--- USERS (${users.rows.length} found) ---`);
    users.rows.forEach(u => {
      console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Verified: ${u.email_verified}`);
    });

    const accounts = await pool.query('SELECT * FROM "account"');
    console.log(`\n--- ACCOUNTS (${accounts.rows.length} found) ---`);
    accounts.rows.forEach(a => {
      console.log(`ID: ${a.id} | UserID: ${a.user_id} | Provider: ${a.provider_id} | Password hash starts with: ${a.password ? a.password.substring(0, 15) : "NULL"}...`);
    });

    if (users.rows.length > 0 && accounts.rows.length > 0) {
      console.log("\nVerifying last account password hash against a test string...");
      // Let's test if we can verify the hash using a simple bcrypt compare (if we know the password the user wants)
    }

  } catch (err) {
    console.error("❌ Error querying database:", err);
  } finally {
    await pool.end();
  }
}

main();
