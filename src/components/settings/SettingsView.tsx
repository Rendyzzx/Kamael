"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { clearMirror } from "@/lib/onboarding-mirror";
import { LOCALES, MESSAGES, type Locale, type MessageKey } from "@/lib/i18n/messages";
import {
  ACCENTS,
  readAccent,
  readAutoResume,
  readLocale,
  readTheme,
  saveAccent,
  saveAutoResume,
  saveLocale,
  saveTheme,
  type Accent,
  type Theme,
} from "@/lib/prefs/prefs";
import { Button, Card, CardList, Chevron, Dialog, Icon, Row, Section, Segmented, SoonBadge, Toggle } from "./primitives";

/** Nomor admin: satu sumber untuk tautan WhatsApp dan tampilan. */
const ADMIN_WA_E164 = "6281249578370";
const ADMIN_WA_DISPLAY = "0812 4957 8370";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cyronime.web.id").replace(/\/+$/, "");

type Confirm = "history" | "progress" | null;

export interface SettingsUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

export default function SettingsView({
  user,
  version,
  logoutAction,
}: {
  user: SettingsUser | null;
  version: string;
  /** Server action logout yang sudah ada (logoutToOnboarding). */
  logoutAction: () => Promise<void>;
}) {
  // Default = nilai server; preferensi tersimpan dibaca setelah mount.
  const [locale, setLocale] = useState<Locale>("id");
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState<Accent>("purple");
  const [autoResume, setAutoResume] = useState(true);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocale(readLocale());
    setTheme(readTheme());
    setAccent(readAccent());
    setAutoResume(readAutoResume());
  }, []);

  const t = useCallback((k: MessageKey) => MESSAGES[locale][k], [locale]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  async function runDestructive(kind: Exclude<Confirm, null>) {
    if (busy) return;
    setBusy(true);
    try {
      const url = kind === "history" ? "/api/history" : "/api/watch/progress?all=1";
      const res = await fetch(url, { method: "DELETE", signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("failed");
      showToast(t(kind === "history" ? "watching.historyCleared" : "watching.progressCleared"));
    } catch {
      showToast(t("watching.failed"));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const waLink = `https://wa.me/${ADMIN_WA_E164}`;
  const waBugLink = `${waLink}?text=${encodeURIComponent(t("contact.bugMessage"))}`;
  const initial = (user?.name || user?.email || "C").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-md space-y-7 pb-4" style={{ padding: "0 var(--page-x)" }}>
      {/* 1. Header */}
      <header>
        <h1 className="font-display text-[24px] font-bold leading-tight text-[var(--text)]">{t("settings.title")}</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--text-2)" }}>
          {t("settings.subtitle")}
        </p>
      </header>

      {/* 2. Profil */}
      <Card>
        <div className="flex items-center gap-3.5 p-4">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-[20px] font-bold text-[var(--text)]"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line-strong)" }}
          >
            {user?.image ? (
              <Image src={user.image} alt={user.name ?? "Avatar"} fill sizes="56px" className="object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[16px] font-bold text-[var(--text)]">
              {user?.name || t("profile.guest")}
            </p>
            {user?.email ? (
              <p className="truncate text-[12.5px]" style={{ color: "var(--text-2)" }}>
                {user.email}
              </p>
            ) : null}
            <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: "var(--text-2)" }}>
              <Icon name={user ? "verified_user" : "person_off"} size={14} />
              {user ? t("profile.status") : t("profile.guest")}
            </p>
          </div>
        </div>
        {user ? (
          <div className="px-4 pb-4">
            <Button variant="ghost" icon="edit" onClick={() => setEditOpen(true)}>
              {t("profile.edit")}
            </Button>
          </div>
        ) : null}
      </Card>

      {/* 3. Appearance */}
      <Section title={t("appearance.title")}>
        <Card>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-[var(--text)]">{t("appearance.theme")}</p>
              <Segmented<Theme>
                label={t("appearance.theme")}
                value={theme}
                onChange={(v) => {
                  saveTheme(v);
                  setTheme(v);
                }}
                options={[
                  { value: "dark", label: t("appearance.theme.dark"), icon: "dark_mode" },
                  { value: "light", label: t("appearance.theme.light"), icon: "light_mode", disabled: true },
                  { value: "system", label: t("appearance.theme.system"), icon: "contrast", disabled: true },
                ]}
              />
              <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                {t("appearance.themeNote")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[14px] font-semibold text-[var(--text)]">{t("appearance.accent")}</p>
              <div role="radiogroup" aria-label={t("appearance.accent")} className="grid grid-cols-4 gap-2">
                {ACCENTS.map((a) => {
                  const active = a.id === accent;
                  const name = t(`appearance.accent.${a.id}` as MessageKey);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={name}
                      onClick={() => {
                        saveAccent(a.id);
                        setAccent(a.id);
                      }}
                      className="flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-app transition-smooth active:scale-[.96]"
                      style={{
                        background: "var(--bg)",
                        border: `1px solid ${active ? "var(--text)" : "var(--line)"}`,
                      }}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: a.swatch, color: "#FEFDFF" }}
                      >
                        {active ? <Icon name="check" size={16} /> : null}
                      </span>
                      <span className="text-[11.5px] font-semibold" style={{ color: active ? "var(--text)" : "var(--text-2)" }}>
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* 4. Player */}
      <Section title={t("player.title")}>
        <CardList>
          <Row
            icon="replay"
            title={t("player.autoResume")}
            desc={t("player.autoResumeDesc")}
            right={
              <Toggle
                checked={autoResume}
                label={t("player.autoResume")}
                onText={t("common.on")}
                offText={t("common.off")}
                onChange={(v) => {
                  setAutoResume(v);
                  saveAutoResume(v);
                }}
              />
            }
          />
          <Row
            icon="skip_next"
            title={t("player.autoNext")}
            desc={t("player.autoNextDesc")}
            disabled
            right={<SoonBadge label={t("common.soon")} />}
          />
          <Row
            icon="fast_forward"
            title={t("player.skipIntro")}
            desc={t("player.skipIntroDesc")}
            disabled
            right={<SoonBadge label={t("common.soon")} />}
          />
          <Row
            icon="closed_caption"
            title={t("player.subtitle")}
            desc={t("player.subtitleValue")}
            disabled
            right={<SoonBadge label={t("common.soon")} />}
          />
          <Row
            icon="high_quality"
            title={t("player.quality")}
            desc={t("player.qualityValue")}
            disabled
            right={<SoonBadge label={t("common.soon")} />}
          />
        </CardList>
      </Section>

      {/* 5. Watching */}
      <Section title={t("watching.title")}>
        <CardList>
          <Row icon="play_circle" title={t("watching.continue")} desc={t("watching.continueDesc")} href="/" right={<Chevron />} />
          <Row icon="history" title={t("watching.history")} desc={t("watching.historyDesc")} href="/history" right={<Chevron />} />
          <Row
            icon="delete_sweep"
            title={t("watching.clearHistory")}
            desc={t("watching.clearHistoryDesc")}
            danger
            disabled={!user}
            onClick={() => setConfirm("history")}
            right={<Chevron />}
          />
          <Row
            icon="restart_alt"
            title={t("watching.resetProgress")}
            desc={t("watching.resetProgressDesc")}
            danger
            disabled={!user}
            onClick={() => setConfirm("progress")}
            right={<Chevron />}
          />
        </CardList>
      </Section>

      {/* 6. Notifications */}
      <Section title={t("notif.title")}>
        <CardList>
          <Row icon="notifications" title={t("notif.newEpisode")} desc={t("notif.newEpisodeDesc")} disabled right={<SoonBadge label={t("common.soon")} />} />
          <Row icon="favorite" title={t("notif.favorite")} desc={t("notif.favoriteDesc")} disabled right={<SoonBadge label={t("common.soon")} />} />
          <Row icon="campaign" title={t("notif.system")} desc={t("notif.systemDesc")} disabled right={<SoonBadge label={t("common.soon")} />} />
        </CardList>
        <p className="px-1 text-[12px]" style={{ color: "var(--text-2)" }}>
          {t("notif.note")}
        </p>
      </Section>

      {/* 7. Language */}
      <Section title={t("language.title")}>
        <Card>
          <div className="space-y-2 p-4">
            <p className="text-[14px] font-semibold text-[var(--text)]">{t("language.label")}</p>
            <Segmented<Locale>
              label={t("language.label")}
              value={locale}
              onChange={(v) => {
                setLocale(v);
                saveLocale(v);
              }}
              options={LOCALES.map((l) => ({ value: l.code, label: l.label }))}
            />
            <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
              {t("language.note")}
            </p>
          </div>
        </Card>
      </Section>

      {/* 8. Contact Admin */}
      <Section title={t("contact.title")}>
        <Card>
          <div className="space-y-3.5 p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app"
                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                <Icon name="support_agent" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {t("contact.desc")}
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-bold tracking-wide text-[var(--text)]">
                  <Icon name="call" size={16} />
                  <span>{ADMIN_WA_DISPLAY}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-[380px]:flex-row">
              <Button variant="primary" icon="chat" href={waLink} external>
                {t("contact.cta")}
              </Button>
              <Button variant="ghost" icon="bug_report" href={waBugLink} external>
                {t("contact.bug")}
              </Button>
            </div>
          </div>
        </Card>
      </Section>

      {/* 9. About */}
      <Section title={t("about.title")}>
        <Card>
          <div className="p-4">
            <p className="font-display text-[16px] font-bold text-[var(--text)]">Cyronime</p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {t("about.desc")}
            </p>
          </div>
          <div className="divide-y border-t" style={{ borderColor: "var(--line)" }}>
            <Row icon="info" title={t("about.version")} right={<Meta>v{version}</Meta>} />
            <Row
              icon="language"
              title={t("about.website")}
              href={SITE_URL}
              right={<Meta>{SITE_URL.replace(/^https?:\/\//, "")}</Meta>}
            />
            <Row icon="support_agent" title={t("about.contact")} href={waLink} right={<Chevron />} />
            <Row icon="gavel" title={t("about.terms")} href="/privacy" right={<Chevron />} />
          </div>
        </Card>
      </Section>

      {/* 10. Danger Zone */}
      {user ? (
        <Section title={t("danger.title")}>
          <div
            className="rounded-card p-4"
            style={{ background: "var(--surface)", border: "1px solid rgba(245,197,183,.35)" }}
          >
            <p className="mb-3 text-[12.5px]" style={{ color: "var(--text-2)" }}>
              {t("danger.logoutDesc")}
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                onClick={() => clearMirror()}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-app text-[14px] font-bold transition-smooth active:scale-[.98]"
                style={{ background: "transparent", color: "var(--peach)", border: "1px solid var(--peach)" }}
              >
                <Icon name="logout" size={18} />
                {t("danger.logout")}
              </button>
            </form>
          </div>
        </Section>
      ) : null}

      {/* 11. Footer */}
      <footer className="pb-2 pt-1 text-center">
        <p className="font-display text-[14px] font-bold text-[var(--text)]">Cyronime</p>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-2)" }}>
          {t("footer.tagline")}
        </p>
        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--text-2)" }}>
          v{version}
        </p>
      </footer>

      {/* Konfirmasi aksi berbahaya */}
      <Dialog
        open={confirm !== null}
        onClose={() => (busy ? undefined : setConfirm(null))}
        title={confirm === "history" ? t("watching.confirmHistoryTitle") : t("watching.confirmProgressTitle")}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={() => confirm && runDestructive(confirm)} disabled={busy}>
              {busy ? "..." : confirm === "history" ? t("watching.confirmHistoryAction") : t("watching.confirmProgressAction")}
            </Button>
          </>
        }
      >
        {confirm === "history" ? t("watching.confirmHistoryBody") : t("watching.confirmProgressBody")}
      </Dialog>

      {/* Edit profil (informatif; identitas dikelola Google) */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("profile.editTitle")}
        actions={
          <Button variant="primary" onClick={() => setEditOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        {t("profile.editBody")}
      </Dialog>

      {/* Toast */}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4"
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
      >
        {toast ? (
          <div
            className="rounded-app px-4 py-2.5 text-[13px] font-semibold text-[var(--text)]"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line-strong)" }}
          >
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--text-2)" }}>
      {children}
    </span>
  );
}
