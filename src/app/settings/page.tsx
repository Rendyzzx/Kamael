import type { Metadata } from "next";
import { auth } from "@/lib/auth/session";
import { logoutToOnboarding } from "@/lib/auth/logout-action";
import SettingsView from "@/components/settings/SettingsView";
import pkg from "../../../package.json";

export const metadata: Metadata = {
  title: "Settings",
  description: "Atur tampilan, player, dan preferensi Cyronime.",
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return <SettingsView user={user} version={pkg.version} logoutAction={logoutToOnboarding} />;
}
