import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Since the API routes are hosted on the same domain, we don't need to specify baseURL explicitly.
  // It will default to the current window location origin.
});
