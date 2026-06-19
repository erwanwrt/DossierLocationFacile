const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load environment variables from .env.local
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
  console.log("Connexion à la base de données...");
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log("Migration de la base de données : Ajout de la colonne 'rent' à 'properties'...");
    await pool.query("ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rent NUMERIC NOT NULL DEFAULT 0;");
    console.log("✅ Migration réussie ! La colonne 'rent' a été ajoutée.");
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
  } finally {
    await pool.end();
  }
}

main();
