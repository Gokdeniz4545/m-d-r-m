"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import {
  getWaStatus,
  requestWaConnect,
  requestWaPairing,
  disconnectWa,
  type WaStatus,
} from "@/lib/wa-actions";

export function WhatsAppConnect({ initial }: { initial: WaStatus }) {
  const [s, setS] = useState<WaStatus>(initial);
  const [phone, setPhone] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = setInterval(async () => {
      setS(await getWaStatus());
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => setS(await getWaStatus());
  const connectQr = () =>
    start(async () => {
      await requestWaConnect();
      await refresh();
    });
  const connectPair = () =>
    start(async () => {
      await requestWaPairing(phone);
      await refresh();
    });
  const disconnect = () =>
    start(async () => {
      await disconnectWa();
      await refresh();
    });

  const pairingCode = s.qr?.startsWith("PAIR:") ? s.qr.slice(5) : null;

  if (s.status === "connected") {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold">Bağlı</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Numara: <span className="tabular">{s.phoneNumber ?? "—"}</span>
        </p>
        <button onClick={disconnect} disabled={pending} className="btn-danger mt-4">
          Bağlantıyı kes
        </button>
      </div>
    );
  }

  // Pairing kodu hazır
  if (s.status === "qr_pending" && pairingCode) {
    return (
      <div className="card p-5">
        <p className="mb-3 text-sm text-muted">
          Telefonunda <b>WhatsApp → Bağlı cihazlar → Cihaz bağla → Telefon numarasıyla
          bağla</b>&apos;yı aç ve şu kodu gir:
        </p>
        <div className="tabular rounded-lg border border-border bg-accent px-4 py-3 text-center text-3xl font-bold tracking-[0.3em]">
          {pairingCode}
        </div>
        <p className="mt-3 text-xs text-muted">Kod birkaç dakika geçerlidir.</p>
        <button onClick={disconnect} disabled={pending} className="btn-ghost mt-4">
          İptal
        </button>
      </div>
    );
  }

  // QR hazır
  if (s.status === "qr_pending" && s.qr) {
    return (
      <div className="card p-5">
        <p className="mb-3 text-sm text-muted">
          Telefonunda <b>WhatsApp → Bağlı cihazlar → Cihaz bağla</b>&apos;yı aç ve QR&apos;ı
          okut:
        </p>
        <Image
          src={s.qr}
          alt="WhatsApp QR kodu"
          width={264}
          height={264}
          unoptimized
          className="rounded-lg border border-border bg-white p-2"
        />
        <button onClick={disconnect} disabled={pending} className="btn-ghost mt-4">
          İptal
        </button>
      </div>
    );
  }

  if (s.status === "connect_requested") {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
          <span className="font-medium">Hazırlanıyor…</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Birkaç saniye içinde kod/QR belirecek. Görünmezse worker&apos;ın çalıştığından
          emin ol (<code>node worker/index.mjs</code>).
        </p>
      </div>
    );
  }

  // disconnected — iki seçenek
  return (
    <div className="card flex flex-col gap-4 p-5">
      <p className="text-sm text-muted">
        Kurumun WhatsApp numarasını bağlayarak öğrenci, veli ve öğretmenlere otomatik
        hatırlatma gönderebilirsin.
      </p>
      {s.error ? <p className="text-sm text-danger">{s.error}</p> : null}

      <div className="flex flex-col gap-2">
        <label className="label">
          WhatsApp numarası (kod ile bağlanmak için)
          <input
            className="input"
            type="tel"
            placeholder="05xx xxx xx xx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <button
          onClick={connectPair}
          disabled={pending || phone.replace(/\D/g, "").length < 10}
          className="btn-primary"
        >
          {pending ? "…" : "Numarayla bağla (kod ile)"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> veya{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <button onClick={connectQr} disabled={pending} className="btn-ghost">
        QR kod ile bağla
      </button>
    </div>
  );
}
