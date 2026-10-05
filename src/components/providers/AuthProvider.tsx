"use client";

import { SessionProvider } from "next-auth/react";

/** Wrapper client agar `useSession()` dapat dipakai di seluruh app (Navbar, UserMenu, dll). */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
