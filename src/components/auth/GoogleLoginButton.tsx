"use client";

import { signIn } from "next-auth/react";

export default function GoogleLoginButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl })}
      className="flex w-full items-center justify-center gap-2.5 rounded-chip bg-white px-4 py-3 text-sm font-bold text-black transition-smooth hover:bg-white/90"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.86c2.26-2.08 3.56-5.14 3.56-8.66z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-3.01c-1.07.72-2.45 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.26 21.3 7.3 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.66H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.78 1.27 5.34l4-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.27 6.66l4 3.1C6.22 6.91 8.87 4.75 12 4.75z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
