export function BarChart({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height: 190 }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="text-xs font-medium text-foreground">
            {format ? format(d.value) : d.value}
          </span>
          <div
            className="w-full rounded-t-md bg-primary"
            style={{
              height:
                d.value > 0 ? Math.max(6, Math.round((d.value / max) * 140)) : 0,
            }}
          />
          <span className="text-xs text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
