"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { copy } from "@/lib/copy";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown right-aligned in the option row. */
  hint?: string;
}

/**
 * Searchable single-select: an input that filters the option list as you
 * type. When closed, the input shows the selected option's label.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function select(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) select(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={onKeyDown}
        className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <ChevronsUpDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      {open && (
        <div
          role="listbox"
          className="absolute z-20 top-full mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {filtered.map((option, i) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              // preventDefault keeps focus on the input so its blur doesn't
              // close the list before this click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(option)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm text-slate-700 flex items-center justify-between gap-2",
                i === highlight && "bg-blue-50"
              )}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {option.value === value && <Check size={13} className="text-blue-600 shrink-0" />}
                <span className="truncate">{option.label}</span>
              </span>
              {option.hint && <span className="text-xs text-slate-400 shrink-0">{option.hint}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">{copy.ui.combobox.noMatches}</p>
          )}
        </div>
      )}
    </div>
  );
}
