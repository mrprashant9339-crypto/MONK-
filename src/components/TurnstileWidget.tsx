import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
        appearance?: "always" | "execute" | "interaction-only";
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string) => void;
  onError?: () => void;
  onExpired?: () => void;
  resetKey?: number;
};

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAGRN064WbzkNKlkA";
const SCRIPT_ID = "monk-cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function TurnstileWidget({ onToken, onError, resetKey = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onExpiredRef.current = onExpired; }, [onExpired]);

  useEffect(() => {
    let cancelled = false;
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const handleScriptError = () => {
      if (script) script.remove();
      script = null;
      onTokenRef.current("");
      onErrorRef.current?.();
    };
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          callback: token => onTokenRef.current(token),
          "expired-callback": () => { onTokenRef.current(""); onExpiredRef.current?.(); },
          "error-callback": () => { onTokenRef.current(""); onErrorRef.current?.(); }
        });
      } catch {
        onTokenRef.current("");
        onErrorRef.current?.();
      }
    };

    if (window.turnstile) render();
    else {
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", handleScriptError, { once: true });
    }

    return () => {
      cancelled = true;
      if (script) {
        script.removeEventListener("load", render);
        script.removeEventListener("error", handleScriptError);
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [resetKey]);

  return <div className="monk-turnstile" ref={containerRef} aria-label="Security verification" />;
}
