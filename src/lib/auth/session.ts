import NextAuth from "next-auth";
import { authConfig } from "./config";

/**
 * Instance Auth.js tunggal. `auth()` dipakai di Server Component/Route Handler
 * untuk mendapatkan session; TIDAK PERNAH dipercaya userId dari body request client.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** Ambil userId dari session server-side, atau null jika belum login. */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}
