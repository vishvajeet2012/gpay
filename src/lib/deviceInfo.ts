/* eslint-disable @typescript-eslint/no-explicit-any */

/** Collect as much browser/device fingerprint as public web APIs allow. */
export async function collectDeviceInfo(): Promise<Record<string, unknown>> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  const nav = navigator as any;
  const win = window as any;
  const screenObj = window.screen as any;
  const ua = nav.userAgent || "";

  // --- Client Hints (Chrome / Edge / Android) ---
  let uaData: Record<string, unknown> | null = null;
  try {
    if (nav.userAgentData) {
      const high = nav.userAgentData.getHighEntropyValues
        ? await nav.userAgentData.getHighEntropyValues([
            "architecture",
            "bitness",
            "model",
            "platformVersion",
            "fullVersionList",
            "uaFullVersion",
            "wow64",
            "formFactors",
          ])
        : {};
      uaData = {
        mobile: nav.userAgentData.mobile ?? null,
        platform: nav.userAgentData.platform || null,
        brands: (nav.userAgentData.brands || []).map(
          (b: { brand: string; version: string }) =>
            `${b.brand} ${b.version}`
        ),
        architecture: high.architecture ?? null,
        bitness: high.bitness ?? null,
        model: high.model || null,
        platformVersion: high.platformVersion || null,
        fullVersionList: (high.fullVersionList || []).map(
          (b: { brand: string; version: string }) =>
            `${b.brand} ${b.version}`
        ),
        uaFullVersion: high.uaFullVersion || null,
        wow64: high.wow64 ?? null,
        formFactors: high.formFactors || null,
      };
    }
  } catch {
    uaData = null;
  }

  // --- Battery ---
  let battery: Record<string, unknown> | null = null;
  try {
    if (typeof nav.getBattery === "function") {
      const b = await nav.getBattery();
      battery = {
        charging: b.charging,
        chargingTime: b.chargingTime,
        dischargingTime: b.dischargingTime,
        level: Math.round((b.level ?? 0) * 100),
      };
    }
  } catch {
    battery = null;
  }

  // --- Network ---
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const connection = conn
    ? {
        effectiveType: conn.effectiveType || null,
        downlink: conn.downlink ?? null,
        downlinkMax: conn.downlinkMax ?? null,
        rtt: conn.rtt ?? null,
        saveData: conn.saveData ?? null,
        type: conn.type || null,
      }
    : null;

  // --- Storage estimate ---
  let storage: Record<string, unknown> | null = null;
  try {
    if (nav.storage?.estimate) {
      const est = await nav.storage.estimate();
      storage = {
        quota: est.quota ?? null,
        usage: est.usage ?? null,
        quotaGB:
          est.quota != null
            ? Math.round((est.quota / 1024 / 1024 / 1024) * 100) / 100
            : null,
        usageMB:
          est.usage != null
            ? Math.round((est.usage / 1024 / 1024) * 100) / 100
            : null,
      };
    }
  } catch {
    storage = null;
  }

  // --- Media devices (counts only — no labels without permission) ---
  let mediaDevices: Record<string, number> | null = null;
  try {
    if (nav.mediaDevices?.enumerateDevices) {
      const list = await nav.mediaDevices.enumerateDevices();
      mediaDevices = {
        audioinput: list.filter((d: MediaDeviceInfo) => d.kind === "audioinput")
          .length,
        audiooutput: list.filter(
          (d: MediaDeviceInfo) => d.kind === "audiooutput"
        ).length,
        videoinput: list.filter((d: MediaDeviceInfo) => d.kind === "videoinput")
          .length,
        total: list.length,
      };
    }
  } catch {
    mediaDevices = null;
  }

  // --- GPU / WebGL ---
  let webgl: Record<string, string | null> | null = null;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      webgl = {
        vendor: gl.getParameter(gl.VENDOR) || null,
        renderer: gl.getParameter(gl.RENDERER) || null,
        unmaskedVendor: dbg
          ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || null
          : null,
        unmaskedRenderer: dbg
          ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || null
          : null,
        version: gl.getParameter(gl.VERSION) || null,
        shadingLanguageVersion:
          gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || null,
      };
    }
  } catch {
    webgl = null;
  }

  // --- Canvas fingerprint (short hash) ---
  let canvasHash: string | null = null;
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 120, 60);
      ctx.fillStyle = "#069";
      ctx.fillText("device-fp-v1", 2, 15);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("device-fp-v1", 4, 17);
      const data = c.toDataURL();
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = (hash << 5) - hash + data.charCodeAt(i);
        hash |= 0;
      }
      canvasHash = (hash >>> 0).toString(16);
    }
  } catch {
    canvasHash = null;
  }

  // --- Audio context sample rate ---
  let audio: Record<string, unknown> | null = null;
  try {
    const AC = win.AudioContext || win.webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      audio = {
        sampleRate: ctx.sampleRate,
        state: ctx.state,
        baseLatency: (ctx as any).baseLatency ?? null,
        outputLatency: (ctx as any).outputLatency ?? null,
        maxChannelCount: ctx.destination?.maxChannelCount ?? null,
      };
      void ctx.close?.();
    }
  } catch {
    audio = null;
  }

  // --- Permissions (query only) ---
  const permissions: Record<string, string> = {};
  try {
    if (nav.permissions?.query) {
      for (const name of [
        "geolocation",
        "notifications",
        "camera",
        "microphone",
        "clipboard-read",
        "clipboard-write",
      ] as const) {
        try {
          const status = await nav.permissions.query({ name: name as any });
          permissions[name] = status.state;
        } catch {
          /* unsupported name */
        }
      }
    }
  } catch {
    /* ignore */
  }

  // --- Orientation ---
  const orientation =
    screenObj.orientation?.type ||
    screenObj.mozOrientation ||
    screenObj.msOrientation ||
    null;
  const orientationAngle =
    screenObj.orientation?.angle ?? win.orientation ?? null;

  // --- Touch / input ---
  const isTouch =
    "ontouchstart" in window ||
    (nav.maxTouchPoints || 0) > 0 ||
    (nav.msMaxTouchPoints || 0) > 0;

  // --- OS / browser parse ---
  const isMobile =
    uaData?.mobile === true ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      ua
    );

  const isTablet =
    /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ||
    (isTouch && Math.min(screenObj.width, screenObj.height) >= 600);

  let deviceType = "Desktop";
  if (isTablet) deviceType = "Tablet";
  else if (isMobile) deviceType = "Mobile";

  let os = "Unknown";
  let osVersion: string | null = null;
  if (/Windows NT 10/i.test(ua)) {
    os = "Windows";
    osVersion = "10/11";
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = "Windows";
    osVersion = "8.1";
  } else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android\s([\d.]+)/i.test(ua)) {
    os = "Android";
    osVersion = ua.match(/Android\s([\d.]+)/i)?.[1] || null;
  } else if (/iPhone OS\s([\d_]+)/i.test(ua) || /iPad.*OS\s([\d_]+)/i.test(ua)) {
    os = "iOS";
    osVersion = (ua.match(/(?:iPhone OS|CPU OS)\s([\d_]+)/i)?.[1] || "").replace(
      /_/g,
      "."
    );
  } else if (/Mac OS X\s([\d_]+)/i.test(ua)) {
    os = "macOS";
    osVersion = (ua.match(/Mac OS X\s([\d_]+)/i)?.[1] || "").replace(/_/g, ".");
  } else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "Chrome OS";

  if (uaData?.platformVersion && typeof uaData.platformVersion === "string") {
    osVersion = uaData.platformVersion as string;
  }

  let browser = "Unknown";
  let browserVersion: string | null = null;
  if (/Edg\/([\d.]+)/i.test(ua)) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/([\d.]+)/i)?.[1] || null;
  } else if (/OPR\/([\d.]+)/i.test(ua) || /Opera/i.test(ua)) {
    browser = "Opera";
    browserVersion = ua.match(/OPR\/([\d.]+)/i)?.[1] || null;
  } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Edg/i.test(ua)) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/([\d.]+)/i)?.[1] || null;
  } else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/([\d.]+)/i)?.[1] || null;
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/([\d.]+)/i)?.[1] || null;
  } else if (/SamsungBrowser\/([\d.]+)/i.test(ua)) {
    browser = "Samsung Internet";
    browserVersion = ua.match(/SamsungBrowser\/([\d.]+)/i)?.[1] || null;
  }

  if (uaData?.uaFullVersion && typeof uaData.uaFullVersion === "string") {
    browserVersion = uaData.uaFullVersion as string;
  }

  // --- Plugins ---
  let plugins: string[] = [];
  try {
    plugins = Array.from(nav.plugins || []).map(
      (p: any) => p?.name || "plugin"
    );
  } catch {
    plugins = [];
  }

  // --- Intl / locale ---
  const intl = Intl.DateTimeFormat().resolvedOptions();

  // --- Performance memory (Chrome) ---
  const perfMem = (performance as any).memory
    ? {
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      }
    : null;

  return {
    // Identity / UA
    userAgent: ua,
    appName: nav.appName || null,
    appVersion: nav.appVersion || null,
    appCodeName: nav.appCodeName || null,
    product: nav.product || null,
    productSub: nav.productSub || null,
    vendor: nav.vendor || null,
    vendorSub: nav.vendorSub || null,
    platform: nav.platform || (uaData?.platform as string) || "",
    buildID: nav.buildID || null,

    // Parsed
    os,
    osVersion,
    browser,
    browserVersion,
    deviceType,
    isMobile: !!isMobile,
    isTablet: !!isTablet,
    isDesktop: deviceType === "Desktop",
    deviceModel: (uaData?.model as string) || null,

    // Client hints
    uaData,

    // Locale
    language: nav.language || "",
    languages: nav.languages ? Array.from(nav.languages as string[]) : [],
    languagesCount: nav.languages?.length || 0,
    timezone: intl.timeZone || null,
    timezoneOffset: new Date().getTimezoneOffset(),
    locale: intl.locale || null,
    calendar: intl.calendar || null,
    numberingSystem: intl.numberingSystem || null,

    // Hardware
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    maxTouchPoints: nav.maxTouchPoints || 0,
    isTouch,
    pdfViewerEnabled: nav.pdfViewerEnabled ?? null,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack ?? null,
    globalPrivacyControl: (nav as any).globalPrivacyControl ?? null,
    webdriver: nav.webdriver ?? null,
    javaEnabled: typeof nav.javaEnabled === "function" ? nav.javaEnabled() : null,

    // Screen
    screen: {
      width: screenObj.width,
      height: screenObj.height,
      availWidth: screenObj.availWidth,
      availHeight: screenObj.availHeight,
      colorDepth: screenObj.colorDepth,
      pixelDepth: screenObj.pixelDepth,
      orientation: orientation,
      orientationAngle,
      isExtended: screenObj.isExtended ?? null,
    },

    // Viewport / window
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenX: window.screenX,
      screenY: window.screenY,
    },

    // Network / battery / storage
    connection,
    battery,
    storage,
    online: nav.onLine,

    // Media / GPU / audio
    mediaDevices,
    webgl,
    canvasHash,
    audio,

    // Features
    permissions,
    plugins,
    pluginCount: plugins.length,
    prefersColorScheme: win.matchMedia?.("(prefers-color-scheme: dark)")
      ?.matches
      ? "dark"
      : "light",
    prefersReducedMotion: !!win.matchMedia?.("(prefers-reduced-motion: reduce)")
      ?.matches,
    prefersContrast: win.matchMedia?.("(prefers-contrast: more)")?.matches
      ? "more"
      : "normal",
    colorGamut: win.matchMedia?.("(color-gamut: p3)")?.matches
      ? "p3"
      : win.matchMedia?.("(color-gamut: srgb)")?.matches
        ? "srgb"
        : null,
    hdr: !!win.matchMedia?.("(dynamic-range: high)")?.matches,
    hover: !!win.matchMedia?.("(hover: hover)")?.matches,
    pointerFine: !!win.matchMedia?.("(pointer: fine)")?.matches,
    pointerCoarse: !!win.matchMedia?.("(pointer: coarse)")?.matches,

    // Page / session
    referrer: document.referrer || null,
    pageUrl: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search || null,
    hash: window.location.hash || null,
    title: document.title || null,
    characterSet: document.characterSet || null,
    cookieLength: document.cookie?.length ?? 0,
    historyLength: history.length,
    localStorageEnabled: (() => {
      try {
        localStorage.setItem("__t", "1");
        localStorage.removeItem("__t");
        return true;
      } catch {
        return false;
      }
    })(),
    sessionStorageEnabled: (() => {
      try {
        sessionStorage.setItem("__t", "1");
        sessionStorage.removeItem("__t");
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDBEnabled: !!win.indexedDB,
    serviceWorkerEnabled: "serviceWorker" in nav,
    notificationPermission:
      typeof Notification !== "undefined" ? Notification.permission : null,
    visibilityState: document.visibilityState,
    performanceMemory: perfMem,
    collectedAt: new Date().toISOString(),
  };
}

/** @deprecated use collectDeviceInfo */
export function getDeviceInfo() {
  // sync fallback — prefer collectDeviceInfo
  if (typeof window === "undefined") return {};
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

export type DeviceInfo = Awaited<ReturnType<typeof collectDeviceInfo>>;
