"use client";

import { Calendar, FileText } from "lucide-react";

export default function CallToAction() {
  return (
    <div className="card-section bg-gradient-to-br from-brand-600 to-brand-700 border-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-brand-100 text-xs font-semibold uppercase tracking-widest mb-1">
            Next Steps
          </p>
          <p className="text-white font-bold text-lg leading-tight">
            Would you like us to schedule your move or get a precise quote?
          </p>
          <p className="text-brand-100 text-sm mt-1">
            Our team can review your inventory and provide an exact price.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-brand-700 text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Schedule a Move
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500/30 border border-white/20 text-white text-sm font-semibold hover:bg-brand-500/50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Get Precise Quote
          </button>
        </div>
      </div>
    </div>
  );
}
