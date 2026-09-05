"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface MultiCheckboxOption {
  id: string;
  label: string;
}

interface MultiCheckboxProps {
  label: string;
  options: MultiCheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiCheckbox({ label, options, value, onChange }: MultiCheckboxProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {options.length ? (
        <div className="grid max-h-36 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
          {options.map((option) => {
            const checked = value.includes(option.id);
            return (
              <Label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange(next === true
                      ? [...value, option.id]
                      : value.filter((id) => id !== option.id))
                  }
                />
                <span className="truncate">{option.label}</span>
              </Label>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">No records available.</p>
      )}
    </fieldset>
  );
}
