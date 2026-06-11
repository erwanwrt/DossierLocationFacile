const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const readline = require("readline");

// Helper for interactive terminal input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

// 1. Load environment variables from .env.local
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

const args = process.argv.slice(2);
let email = args[0];
let password = args[1];
let name = args[2] || "Administrateur";

async function main() {
  // If arguments are missing, ask interactively
  if (!email) {
    email = await askQuestion("Entrez l'adresse e-mail de l'administrateur : ");
    email = email.trim();
  }

  if (!email) {
    console.error("❌ L'adresse e-mail est obligatoire.");
    process.exit(1);
  }

  if (!password) {
    password = await askQuestion("Entrez le mot de passe de l'administrateur : ");
  }

  if (!password) {
    console.error("❌ Le mot de passe est obligatoire.");
    process.exit(1);
  }

  console.log(`\nConnexion à la base de données...`);
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Check if user already exists
    const checkRes = await pool.query('SELECT id FROM "user" WHERE email = $1', [email.toLowerCase()]);
    const userExists = checkRes.rows.length > 0;

    if (userExists) {
      const existingUser = checkRes.rows[0];
      const userId = existingUser.id;
      
      console.log(`\n⚠️ L'utilisateur avec l'adresse email ${email} existe déjà.`);
      const confirmUpdate = await askQuestion("Voulez-vous réinitialiser / mettre à jour son mot de passe ? (oui/non) : ");
      
      if (confirmUpdate.trim().toLowerCase() !== "oui" && confirmUpdate.trim().toLowerCase() !== "o" && confirmUpdate.trim().toLowerCase() !== "y") {
        console.log("Annulé. Aucune modification n'a été apportée.");
        process.exit(0);
      }

      console.log("Mise à jour du mot de passe...");
      const hashedPassword = await bcryptjs.hash(password, 10);
      const now = new Date();

      await pool.query("BEGIN");
      
      // Update or Insert the credential account in account table
      const accCheck = await pool.query(
        'SELECT id FROM "account" WHERE user_id = $1 AND provider_id = $2',
        [userId, "credential"]
      );

      if (accCheck.rows.length > 0) {
        await pool.query(
          'UPDATE "account" SET password = $1, updated_at = $2 WHERE user_id = $3 AND provider_id = $4',
          [hashedPassword, now, userId, "credential"]
        );
      } else {
        const accountId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [accountId, userId, "credential", userId, hashedPassword, now, now]
        );
      }

      await pool.query("COMMIT");
      console.log(`\n✅ Mot de passe mis à jour avec succès pour ${email.toLowerCase()}.`);
      process.exit(0);
    }

    // Creating new admin
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hashedPassword = await bcryptjs.hash(password, 10);
    const now = new Date();

    await pool.query("BEGIN");

    // Insert user
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, name, email.toLowerCase(), true, now, now]
    );

    // Insert account (linked credentials)
    await pool.query(
      `INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [accountId, userId, "credential", userId, hashedPassword, now, now]
    );

    await pool.query("COMMIT");
    console.log(`\n✅ Succès ! Le compte propriétaire a été créé avec succès.`);
    console.log(`Email : ${email.toLowerCase()}`);
    console.log(`ID Utilisateur : ${userId}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Erreur lors de l'exécution du script :", error);
  } finally {
    await pool.end();
  }
}

main();
