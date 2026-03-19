import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "./lib/utils";

const EMPTY_SELECT_VALUE = "__empty__";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Select({
  className,
  contentClassName,
  disabled,
  options,
  placeholder = "Select an option",
  value,
  onValueChange,
}: SelectProps) {
  const normalizedValue = value === "" ? EMPTY_SELECT_VALUE : value;

  return (
    <SelectPrimitive.Root
      disabled={disabled}
      value={normalizedValue}
      onValueChange={(nextValue) =>
        onValueChange?.(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2 text-left text-sm font-medium text-slate-950 outline-none transition focus-visible:border-slate-500 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 text-slate-700" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          className={cn(
            "z-[200] isolate max-h-80 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-300 bg-white opacity-100 shadow-[0_18px_36px_rgba(0,0,0,0.18)] backdrop-blur-none supports-[backdrop-filter]:backdrop-blur-none",
            contentClassName,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex items-center justify-center border-b border-slate-200 bg-white py-1 text-slate-700">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="w-[var(--radix-select-trigger-width)] bg-white p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value === "" ? EMPTY_SELECT_VALUE : option.value}
                disabled={option.disabled}
                className="relative flex min-h-10 w-full cursor-default select-none items-center border-b border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none whitespace-nowrap data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 last:border-b-0"
              >
                <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-slate-900" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex items-center justify-center border-t border-slate-200 bg-white py-1 text-slate-700">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export default Select;
