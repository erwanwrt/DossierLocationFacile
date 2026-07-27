/* eslint-disable @typescript-eslint/no-require-imports --
 * CommonJS keeps this helper usable by both Next.js and the Node.js scripts.
 */
const fs = require("node:fs");
const path = require("node:path");

const TLS_QUERY_PARAMETERS = [
  "ssl",
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
];

/**
 * Creates a node-postgres configuration that always encrypts the connection
 * and validates the Supabase server certificate and hostname.
 *
 * @param {string | undefined} connectionString
 * @returns {import("pg").PoolConfig}
 */
function getVerifiedDatabaseConfig(connectionString) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const databaseUrl = new URL(connectionString);
  const tlsOverrides = TLS_QUERY_PARAMETERS.filter((parameter) =>
    databaseUrl.searchParams.has(parameter),
  );

  if (tlsOverrides.length > 0) {
    throw new Error(
      `DATABASE_URL must not override TLS settings: ${tlsOverrides.join(", ")}`,
    );
  }

  const ca = fs.readFileSync(
    path.join(
      process.cwd(),
      "certificates",
      "supabase-prod-ca-2021.crt",
    ),
    "utf8",
  );

  return {
    connectionString,
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  };
}

module.exports = { getVerifiedDatabaseConfig };
