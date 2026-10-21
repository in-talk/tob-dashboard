import { useEffect, useRef } from "react";

// Minimal Cloudflare Turnstile widget (explicit rendering, no extra package).
// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("Failed to load Turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

type Props = {
  siteKey: string;
  /** Change this value to get a fresh token (tokens are single-use). */
  resetKey: number;
  onToken: (token: string | null) => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
};

export default function Turnstile({ siteKey, resetKey, onToken, onError, theme = "dark" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Keep latest callbacks without re-rendering the widget.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "login",
          theme,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onTokenRef.current(null);
            onErrorRef.current?.();
          },
        });
      })
      .catch(() => onErrorRef.current?.());
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, theme]);

  useEffect(() => {
    if (resetKey === 0) return;
    if (widgetId.current && window.turnstile) {
      onTokenRef.current(null);
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  return <div ref={containerRef} className="flex justify-center min-h-[65px]" />;
}
