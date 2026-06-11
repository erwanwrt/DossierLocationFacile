const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcryptjs = require("bcryptjs");
const readline = require("readline");

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
  const email = "erw.werthe@gmail.com";
  const password = await askQuestion(`Entrez le mot de passe à tester pour ${email} : `);

  if (!password) {
    console.error("❌ Le mot de passe est obligatoire.");
    process.exit(1);
  }

  console.log("Connexion à la base de données...");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const checkRes = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (checkRes.rows.length === 0) {
      console.error(`❌ L'utilisateur ${email} n'existe pas en base.`);
      process.exit(1);
    }

    const userId = checkRes.rows[0].id;

    const accRes = await pool.query(
      'SELECT password FROM "account" WHERE user_id = $1 AND provider_id = $2',
      [userId, "credential"]
    );

    if (accRes.rows.length === 0 || !accRes.rows[0].password) {
      console.error("❌ Aucun compte avec mot de passe n'a été trouvé en base de données pour cet utilisateur.");
      process.exit(1);
    }

    const storedHash = accRes.rows[0].password;
    console.log(`Hash stocké en base : ${storedHash}`);

    console.log("Comparaison en cours...");
    const match = await bcryptjs.compare(password, storedHash);

    if (match) {
      console.log("✅ SUCCÈS : Le mot de passe correspond EXACTEMENT au hash stocké en base de données !");
    } else {
      console.log("❌ ÉCHEC : Le mot de passe ne correspond PAS au hash stocké en base de données.");
    }
  } catch (err) {
    console.error("❌ Erreur :", err);
  } finally {
    await pool.end();
  }
}

main();
