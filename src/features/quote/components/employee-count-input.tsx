import { Minus, Plus } from "@phosphor-icons/react";
import { useController, useFormContext } from "react-hook-form";
import type { EmployerRole, QuoteInput } from "@/features/quote/types";
import { FieldError } from "./ui";

export function EmployeeCountInput({
  role,
  label,
  rate,
  min = 0,
  max,
}: {
  role: EmployerRole;
  label: string;
  rate?: number;
  min?: number;
  max?: number;
}) {
  const { control } = useFormContext<QuoteInput>();
  const { field, fieldState } = useController({
    control,
    name: `employeeCounts.${role}`,
  });
  const id = `employee-${role}`;
  const errorId = `${id}-error`;
  const finiteValue = Number.isFinite(field.value) ? Number(field.value) : min;
  const normalizedValue = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.trunc(finiteValue)));

  function commit(value: number) {
    field.onChange(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.trunc(value))));
  }

  return (
    <div className="employee-field">
      <div className="employee-row">
        <div className="employee-copy">
          <label htmlFor={id}>{label}</label>
          {rate !== undefined ? <span>¥{rate} / 人 / 年</span> : null}
        </div>
        <div className="employee-counter">
          <button type="button" aria-label={`减少${label}`} disabled={normalizedValue <= min} onClick={() => commit(normalizedValue - 1)}>
            <Minus aria-hidden="true" />
          </button>
          <input
            {...field}
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={Number.isFinite(field.value) ? field.value : ""}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
            onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
            onBlur={() => {
              commit(finiteValue);
              field.onBlur();
            }}
          />
          <button type="button" aria-label={`增加${label}`} disabled={max !== undefined && normalizedValue >= max} onClick={() => commit(normalizedValue + 1)}>
            <Plus aria-hidden="true" />
          </button>
        </div>
      </div>
      {fieldState.error ? <div id={errorId}><FieldError>{fieldState.error.message}</FieldError></div> : null}
    </div>
  );
}
