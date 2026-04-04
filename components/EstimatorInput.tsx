"use client";

import { useState, useRef } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import clsx from "clsx";

interface EstimatorInputProps {
  onEstimate: (value: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

const EXAMPLE_INVENTORY = `3 medium boxes, 1 king bed, 2 nightstands, 1 sofa, 1 dining table, 6 dining chairs, 1 dresser, 1 washer, 1 dryer`;

export default function EstimatorInput({
  onEstimate,
  onClear,
  isLoading,
}: EstimatorInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().length === 0) return;
    onEstimate(value.trim());
  }

  function handleClear() {
    setValue("");
    onClear();
    textareaRef.current?.focus();
  }

  function loadExample() {
    setValue(EXAMPLE_INVENTORY);
    textareaRef.current?.focus();
  }

  const isEmpty = value.trim().length === 0;

  return (
    <form onSubmit={handleSubmit} className="card-section space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Inventory</p>
          <p className="text-sm text-slate-500">
            Type or paste items separated by commas or new lines. You can include quantities and sizes.
          </p>
        </div>
        <button
          type="button"
          onClick={loadExample}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load example
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder={`e.g. ${EXAMPLE_INVENTORY}`}
        className={clsx(
          "w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
          "resize-none transition-shadow",
          "border-slate-200 bg-white"
        )}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isEmpty || isLoading}
          className={clsx(
            "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold",
            "bg-brand-600 text-white shadow-sm",
            "hover:bg-brand-700 active:bg-brand-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-150"
          )}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Calculate Estimate
            </>
          )}
        </button>

        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        {/* Mobile example button */}
        <button
          type="button"
          onClick={loadExample}
          className="sm:hidden ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-brand-600"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Example
        </button>
      </div>
    </form>
  );
}
