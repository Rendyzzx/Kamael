"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Grid 3 kolom dengan infinite scroll: render item awal (dari SSR),
 * lalu memuat halaman berikutnya otomatis saat sentinel di bawah grid
 * terlihat di viewport (IntersectionObserver) — tidak perlu tombol
 * "Selanjutnya". `fetchPage` memanggil API route internal yang
 * mengembalikan data asli yang sama dengan render awal.
 */
export default function InfiniteGrid<T>({
  initialItems,
  initialHasNext,
  initialPage,
  fetchPage,
  renderItem,
  getKey,
  emptyMessage,
}: {
  initialItems: T[];
  initialHasNext: boolean | null;
  initialPage: number;
  fetchPage: (page: number) => Promise<{ items: T[]; hasNextPage: boolean | null }>;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasNext, setHasNext] = useState(initialHasNext !== false);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  // Reset saat sumber data berubah (ganti tab/genre di parent Server Component).
  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setHasNext(initialHasNext !== false);
  }, [initialItems, initialPage, initialHasNext]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNext) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetchPage(next);
      setItems((prev) => [...prev, ...res.items]);
      setPage(next);
      setHasNext(res.items.length > 0 && res.hasNextPage !== false);
    } catch {
      setHasNext(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchPage, hasNext, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNext, loadMore]);

  if (!items.length) {
    return (
      <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={getKey(item)}>{renderItem(item, i)}</div>
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

      {loading ? (
        <div className="mt-5 flex justify-center">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--surface-3)", borderTopColor: "var(--blue)" }}
            role="status"
            aria-label="Memuat"
          />
        </div>
      ) : null}

      {!hasNext && items.length > initialItems.length ? (
        <p className="mt-5 text-center text-[13px]" style={{ color: "var(--text-2)" }}>
          Semua sudah ditampilkan.
        </p>
      ) : null}
    </div>
  );
}
