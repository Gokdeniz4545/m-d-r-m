"use client";

export function YazdirButonu() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary print:hidden"
    >
      Yazdır
    </button>
  );
}
