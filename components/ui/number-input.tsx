"use client";

// Sayısal alan — fare tekerleğiyle değer değişmesin (yalnız yazarak girilir).
export function NumberField({
  label,
  name,
  required,
  defaultValue,
  placeholder,
  step,
  min,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="label">
      {label}
      <input
        name={name}
        type="number"
        inputMode="decimal"
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        min={min}
        onWheel={(e) => e.currentTarget.blur()}
        className="input"
      />
    </label>
  );
}
