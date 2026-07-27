"use client";

import { useEffect, useRef, useState } from "react";

const APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_FB_CONFIG_ID;
const GRAPH_VERSION = "v21.0";

type FBLoginResponse = { authResponse?: { code?: string } };
type FB = {
  init: (o: Record<string, unknown>) => void;
  login: (cb: (r: FBLoginResponse) => void, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    FB?: FB;
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppEmbedded() {
  const [status, setStatus] = useState<"idle" | "loading" | "sending" | "error" | "done">(
    "idle",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const session = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  useEffect(() => {
    if (!APP_ID || !CONFIG_ID) return;
    // Embedded Signup mesaj olayı (waba_id + phone_number_id buradan gelir)
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.endsWith("facebook.com")) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          session.current = {
            wabaId: data.data?.waba_id,
            phoneNumberId: data.data?.phone_number_id,
          };
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);

    // FB SDK yükle
    if (!document.getElementById("fb-sdk")) {
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId: APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: GRAPH_VERSION,
        });
      };
      const s = document.createElement("script");
      s.id = "fb-sdk";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(s);
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connect = () => {
    if (!window.FB) {
      setStatus("error");
      setMsg("Facebook SDK yüklenemedi, sayfayı yenileyin.");
      return;
    }
    setStatus("loading");
    setMsg(null);
    window.FB.login(
      async (response: FBLoginResponse) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setStatus("error");
          setMsg("Bağlantı iptal edildi veya kod alınamadı.");
          return;
        }
        setStatus("sending");
        try {
          const r = await fetch("/api/wa/embedded", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              wabaId: session.current.wabaId,
              phoneNumberId: session.current.phoneNumberId,
            }),
          });
          const j = await r.json();
          if (!r.ok) {
            setStatus("error");
            setMsg(j.error ?? "Kayıt başarısız.");
            return;
          }
          setStatus("done");
          setMsg("Bağlandı! Sayfa yenileniyor…");
          setTimeout(() => location.reload(), 1200);
        } catch {
          setStatus("error");
          setMsg("Sunucu hatası.");
        }
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { sessionInfoVersion: "3" },
      },
    );
  };

  if (!APP_ID || !CONFIG_ID) {
    return (
      <div className="card p-5 text-sm text-muted">
        WhatsApp API henüz yapılandırılmadı. (Meta App ortam değişkenleri eksik —
        <code> NEXT_PUBLIC_FB_APP_ID</code>, <code>NEXT_PUBLIC_FB_CONFIG_ID</code>.)
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="mb-3 text-sm text-muted">
        Kurumun WhatsApp Business numarasını resmi Meta akışıyla bağla.
      </p>
      <button
        onClick={connect}
        disabled={status === "loading" || status === "sending"}
        className="btn-primary"
      >
        {status === "loading" || status === "sending"
          ? "…"
          : "WhatsApp ile devam et"}
      </button>
      {msg ? (
        <p
          className={
            "mt-3 text-sm " +
            (status === "error" ? "text-danger" : "text-emerald-600 dark:text-emerald-400")
          }
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
