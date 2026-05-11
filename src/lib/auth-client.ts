import { createAuthClient } from "better-auth/react";

// No baseURL — Better Auth auto-detects from window.location.origin at runtime,
// so the client works on any deployment without a build-time env var.
export const authClient = createAuthClient();
