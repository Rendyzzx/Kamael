"use client";

import { useEffect, useState } from "react";

const KEY = "cyronime_auto_resume";

/** Preferensi lokal: lanjutkan otomatis tanpa prompt "Lanjutkan dari ..." di watch page. */
export default function AutoResumeToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(localStorage.getItem(KEY) !== "0");
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(KEY, next ? "1" : "0");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className="relative h-6 w-11 shrink-0 rounded-chip transition-smooth"
      style={{ background: enabled ? "var(--blue)" : "var(--surface-3)" }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
