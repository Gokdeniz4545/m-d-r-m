type Size = "sm" | "lg";

/**
 * Müdürüm marka işareti — teal bir nameplate karesi içinde "M" +
 * kelime markası. Panel başlığı ve giriş ekranında kullanılır.
 */
export function Wordmark({ size = "sm" }: { size?: Size }) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={
          "flex items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm " +
          (lg ? "h-12 w-12 text-2xl" : "h-8 w-8 text-base")
        }
        aria-hidden
      >
        M
      </span>
      <span
        className={
          "font-bold tracking-tight text-foreground " +
          (lg ? "text-2xl" : "text-lg")
        }
      >
        Müdürüm
      </span>
    </span>
  );
}
