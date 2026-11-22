// Better Auth's browser client. Same origin (the Next.js proxy forwards /api/auth/* to Express), so no baseURL.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
