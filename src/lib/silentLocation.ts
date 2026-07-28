/**
 * Silent location helpers — NO permission popup.
 *
 * Browser rules:
 * - Precise GPS ALWAYS needs user permission (popup) the first time.
 * - We only call GPS APIs if permission is already "granted".
 * - IP / network geo needs no popup (server-side).
 */

export async function getGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state as "granted" | "denied" | "prompt";
  } catch {
    return "unknown";
  }
}

/** GPS only if already allowed — never triggers the browser popup. */
export function getSilentGpsOnce(
  timeoutMs = 8000
): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    let done = false;
    const finish = (v: GeolocationCoordinates | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        finish(pos.coords);
      },
      () => {
        clearTimeout(timer);
        finish(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: timeoutMs,
      }
    );
  });
}

/**
 * If GPS already granted, watch in background and call onSample.
 * Returns cleanup().
 */
export function watchSilentGps(
  onSample: (coords: GeolocationCoordinates) => void,
  opts?: { maxSamples?: number; durationMs?: number }
): () => void {
  if (!navigator.geolocation) return () => {};

  const maxSamples = opts?.maxSamples ?? 5;
  const durationMs = opts?.durationMs ?? 15_000;
  let samples = 0;
  let watchId: number | null = null;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (watchId != null) {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        /* ignore */
      }
    }
  };

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      samples += 1;
      onSample(pos.coords);
      if (samples >= maxSamples) stop();
    },
    () => stop(),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
  );

  setTimeout(stop, durationMs);
  return stop;
}

/** Main entry: silent GPS only when already granted. */
export async function trySilentGps(): Promise<GeolocationCoordinates | null> {
  const perm = await getGeolocationPermission();
  // Only when already granted — "prompt" would show a popup
  if (perm !== "granted") return null;
  return getSilentGpsOnce();
}
