"use client";

import type { ParsedItem } from "@/types";
import clsx from "clsx";

interface ResultsTableProps {
  items: ParsedItem[];
}

export default function ResultsTable({ items }: ResultsTableProps) {
  if (items.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <p className="section-label">Item Breakdown</p>
        <p className="text-slate-800 font-semibold text-sm">
          {items.length} item type{items.length !== 1 ? "s" : ""} parsed from your inventory
        </p>
      </div>

      {/* Responsive table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Item
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                Qty
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                Cu ft each
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                Lbs each
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                Total cu ft
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                Total lbs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr
                key={i}
                className={clsx(
                  "hover:bg-slate-50/50 transition-colors",
                  item.isSpecial && "bg-amber-50/30"
                )}
              >
                <td className="px-6 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    {item.label}
                    {item.isSpecial && (
                      <span className="badge-amber">Special</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                  {item.qty}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                  {item.cubicFeetEach.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                  {item.weightLbsEach.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800 tabular-nums">
                  {item.totalCubicFeet.toFixed(1)}
                </td>
                <td className="px-6 py-3 text-right font-medium text-slate-800 tabular-nums">
                  {item.totalWeightLbs.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
