import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import bcryptjs from "bcryptjs";

// Database Pool for PostgreSQL connection
// We use a global variable to cache the pool in development, preventing connection leaks.
const globalForPool = global as unknown as { pool: Pool };
const pool = globalForPool.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // Registrations are disabled, only login is allowed.
    password: {
      hash: async (password) => {
        return await bcryptjs.hash(password, 10);
      },
      verify: async ({ hash, password }) => {
        console.log("[Better-Auth] Verifying password...");
        const match = await bcryptjs.compare(password, hash);
        console.log("[Better-Auth] Password match result:", match);
        return match;
      },
    },
  },
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      scope: "scope",
      password: "password",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      identifier: "identifier",
      value: "value",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  plugins: [
    nextCookies(), // Automatically sets auth cookies in Next.js server actions/middleware
  ],
});
export { pool };
