"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Device = {
  userAgent?: string;
  platform?: string;
  vendor?: string;
  language?: string;
  languages?: string[];
  os?: string;
  browser?: string;
  isMobile?: boolean;
  isTouch?: boolean;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  maxTouchPoints?: number;
  timezone?: string | null;
  timezoneOffset?: number;
  ip?: string;
  screen?: {
    width?: number;
    height?: number;
    orientation?: string | null;
  };
  viewport?: {
    width?: number;
    height?: number;
    devicePixelRatio?: number;
  };
  connection?: {
    effectiveType?: string | null;
    downlink?: number | null;
    rtt?: number | null;
  } | null;
  online?: boolean;
  pageUrl?: string;
  referrer?: string | null;
};

type LocationRow = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  ip: string | null;
  device: Device | null;
  createdAt: string;
  mapsUrl: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/locations", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Failed to load");
        return;
      }
      setRows(data.locations || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0f] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold sm:text-xl">Admin Panel</h1>
            <p className="text-xs text-white/40">
              Locations + device info from users
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/15"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              Total saved
            </p>
            <p className="text-2xl font-bold">{loading ? "…" : rows.length}</p>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-white/70">No locations saved yet</p>
            <p className="mt-1 text-sm text-white/35">
              Open home page on a device and allow permission
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => {
              const open = expanded === row.id;
              const d = row.device;
              return (
                <li
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-200">
                          #{rows.length - index}
                        </span>
                        <span className="text-xs text-white/40">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-sm text-white/90">
                        {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/40">
                        {d?.os || "?"} · {d?.browser || "?"} ·{" "}
                        {d?.isMobile ? "Mobile" : "Desktop"}
                        {row.ip ? ` · IP ${row.ip}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={row.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-[0.98]"
                      >
                        Open in Maps
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(open ? null : row.id)
                        }
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
                      >
                        {open ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="border-t border-white/10 bg-black/20 px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoCard title="Location">
                          <Row k="Latitude" v={String(row.latitude)} />
                          <Row k="Longitude" v={String(row.longitude)} />
                          <Row
                            k="Accuracy"
                            v={
                              row.accuracy != null
                                ? `${Math.round(row.accuracy)} m`
                                : "—"
                            }
                          />
                          <Row
                            k="Altitude"
                            v={
                              row.altitude != null
                                ? `${row.altitude} m`
                                : "—"
                            }
                          />
                          <Row k="IP" v={row.ip || "—"} />
                          <a
                            href={row.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm font-medium text-emerald-400 underline-offset-2 hover:underline"
                          >
                            Google Maps →
                          </a>
                        </InfoCard>

                        <InfoCard title="Device">
                          <Row k="OS" v={d?.os || "—"} />
                          <Row k="Browser" v={d?.browser || "—"} />
                          <Row k="Platform" v={d?.platform || "—"} />
                          <Row
                            k="Type"
                            v={d?.isMobile ? "Mobile" : "Desktop"}
                          />
                          <Row
                            k="Touch"
                            v={d?.isTouch ? "Yes" : "No"}
                          />
                          <Row
                            k="CPU cores"
                            v={
                              d?.hardwareConcurrency != null
                                ? String(d.hardwareConcurrency)
                                : "—"
                            }
                          />
                          <Row
                            k="Memory"
                            v={
                              d?.deviceMemory != null
                                ? `${d.deviceMemory} GB`
                                : "—"
                            }
                          />
                        </InfoCard>

                        <InfoCard title="Screen & Network">
                          <Row
                            k="Screen"
                            v={
                              d?.screen
                                ? `${d.screen.width}×${d.screen.height}`
                                : "—"
                            }
                          />
                          <Row
                            k="Viewport"
                            v={
                              d?.viewport
                                ? `${d.viewport.width}×${d.viewport.height}`
                                : "—"
                            }
                          />
                          <Row
                            k="DPR"
                            v={
                              d?.viewport?.devicePixelRatio != null
                                ? String(d.viewport.devicePixelRatio)
                                : "—"
                            }
                          />
                          <Row k="Language" v={d?.language || "—"} />
                          <Row k="Timezone" v={d?.timezone || "—"} />
                          <Row
                            k="Network"
                            v={d?.connection?.effectiveType || "—"}
                          />
                        </InfoCard>
                      </div>

                      {d?.userAgent ? (
                        <p className="mt-4 break-all rounded-xl bg-white/5 p-3 font-mono text-[11px] leading-relaxed text-white/40">
                          {d.userAgent}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="text-white/40">{k}</span>
      <span className="text-right font-medium text-white/90">{v}</span>
    </div>
  );
}
