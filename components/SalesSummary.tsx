"use client";

import type { EstimateResult, Confidence } from "@/types";
import { Home, Truck, Users, Clock, BarChart3 } from "lucide-react";
import clsx from "clsx";

interface SalesSummaryProps {
  result: EstimateResult;
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const config: Record<Confidence, { cls: string; dot: string }> = {
    High:   { cls: "badge-green", dot: "bg-brand-500" },
    Medium: { cls: "badge-amber", dot: "bg-amber-400" },
    Low:    { cls: "badge-red",   dot: "bg-red-400" },
  };
  const { cls, dot } = config[confidence];
  return (
    <span className={cls}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {confidence}
    </span>
  );
}

export default function SalesSummary({ result }: SalesSummaryProps) {
  const rows = [
    {
      label: "Move Size",
      value: result.moveSize,
      icon: Home,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Suggested Truck",
      value: result.truckSize,
      icon: Truck,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Suggested Crew",
      value: result.crewSize,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Estimated Labor Time",
      value: result.laborTimeRange,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="card-section space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Sales Summary</p>
          <p className="text-slate-800 font-semibold">Move Recommendation</p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium mr-1">Confidence</span>
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className={clsx("p-2 rounded-lg flex-shrink-0", row.bg)}>
                <Icon className={clsx("w-4 h-4", row.color)} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {row.label}
                </p>
                <p className="text-sm font-bold text-slate-800">{row.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
        These numbers are approximate moving estimates and may vary based on exact size, material, and packing.
      </p>
    </div>
  );
}
