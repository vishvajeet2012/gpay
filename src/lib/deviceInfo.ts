/** Collect browser/device info available without extra permissions. */
export function getDeviceInfo() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
      type?: string;
    };
    userAgentData?: {
      brands?: { brand: string; version: string }[];
      mobile?: boolean;
      platform?: string;
    };
  };

  const conn = nav.connection;
  const uaData = nav.userAgentData;
  const screenObj = window.screen;
  const orientation =
    screenObj.orientation?.type ||
    (screenObj as Screen & { mozOrientation?: string; msOrientation?: string })
      .mozOrientation ||
    (screenObj as Screen & { msOrientation?: string }).msOrientation ||
    undefined;

  const isTouch =
    "ontouchstart" in window ||
    nav.maxTouchPoints > 0 ||
    // @ts-expect-error legacy
    nav.msMaxTouchPoints > 0;

  const ua = nav.userAgent || "";
  const isMobile =
    uaData?.mobile ??
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      ua
    );

  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";

  return {
    userAgent: ua,
    platform: nav.platform || uaData?.platform || "",
    vendor: nav.vendor || "",
    language: nav.language || "",
    languages: nav.languages ? Array.from(nav.languages) : [],
    cookieEnabled: nav.cookieEnabled,
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory ?? null,
    maxTouchPoints: nav.maxTouchPoints || 0,
    isTouch,
    isMobile,
    os,
    browser,
    brands: uaData?.brands?.map((b) => `${b.brand} ${b.version}`) || [],
    screen: {
      width: screenObj.width,
      height: screenObj.height,
      availWidth: screenObj.availWidth,
      availHeight: screenObj.availHeight,
      colorDepth: screenObj.colorDepth,
      pixelDepth: screenObj.pixelDepth,
      orientation: orientation || null,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    timezoneOffset: new Date().getTimezoneOffset(),
    connection: conn
      ? {
          effectiveType: conn.effectiveType || null,
          downlink: conn.downlink ?? null,
          rtt: conn.rtt ?? null,
          saveData: conn.saveData ?? null,
          type: conn.type || null,
        }
      : null,
    online: nav.onLine,
    referrer: document.referrer || null,
    pageUrl: window.location.href,
  };
}

export type DeviceInfo = ReturnType<typeof getDeviceInfo>;
