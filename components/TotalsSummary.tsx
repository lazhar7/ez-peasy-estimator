"use client";

import type { EstimateResult } from "@/types";
import { Package, Weight, Scale } from "lucide-react";

interface TotalsSummaryProps {
  result: EstimateResult;
}

export default function TotalsSummary({ result }: TotalsSummaryProps) {
  const stats = [
    {
      label: "Total Estimated Cubic Feet",
      value: result.totalCubicFeet.toLocaleString(),
      unit: "cu ft",
      icon: Package,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Total Estimated Weight",
      value: result.totalWeightLbs.toLocaleString(),
      unit: "lbs",
      icon: Weight,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Estimated Weight",
      value: result.totalWeightTons.toFixed(2),
      unit: "tons",
      icon: Scale,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="card-section flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${s.bg} flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${s.color}`} strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {s.value}
                <span className="text-sm font-semibold text-slate-400 ml-1">{s.unit}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
