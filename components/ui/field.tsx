export function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  defaultValue,
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
}) {
  return (
    <label className="label">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        className="input"
      />
    </label>
  );
}
