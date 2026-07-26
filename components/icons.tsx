// Sade çizgi ikonları (24px, currentColor). Navigasyon ve kartlarda kullanılır.

type Props = { className?: string };

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<string, React.ReactNode> = {
  panel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  ogrenciEkle: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M18 8v6M15 11h6" />
    </>
  ),
  ogretmenEkle: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  ders: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v15h6.5a1.5 1.5 0 0 1 1.5 1.5z" />
    </>
  ),
  gundem: (
    <>
      <path d="M3 11l14-6v14L3 13z" />
      <path d="M17 8a3 3 0 0 1 0 8" />
      <path d="M6 13v4a2 2 0 0 0 4 0" />
    </>
  ),
  takvim: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
    </>
  ),
  kisiler: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M3 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M18 19a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  tahsilat: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 12h.01M17 12h.01" />
    </>
  ),
  rapor: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-7" />
    </>
  ),
  gider: (
    <>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V20l-2.5-1.5L15 20l-3-1.5L9 20l-2.5-1.5L4 20z" />
      <path d="M8 9h8M8 12.5h8" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z" />
      <path d="M8.5 9c0 3 2.5 5.5 5.5 5.5" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: string; className?: string }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg {...base} className={className} aria-hidden>
      {path}
    </svg>
  );
}
