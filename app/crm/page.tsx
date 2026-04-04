"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import EstimatorInput from "@/components/EstimatorInput";
import ResultsTable from "@/components/ResultsTable";
import TotalsSummary from "@/components/TotalsSummary";
import SalesSummary from "@/components/SalesSummary";
import SmartChecks from "@/components/SmartChecks";
import CallToAction from "@/components/CallToAction";
import { runEstimate } from "@/lib/estimator";
import type { EstimateResult } from "@/types";

export default function CRMPage() {
  const [result, setResult]     = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleEstimate = useCallback((inventory: string) => {
    setError(null);
    setIsLoading(true);

    // Run estimate synchronously but yield to the event loop first
    // so the loading state renders before heavy parsing starts.
    setTimeout(() => {
      try {
        const estimate = runEstimate(inventory);
        if (estimate.items.length === 0) {
          setError(
            "We couldn't parse any items from your inventory. Try entering items separated by commas, like: 1 sofa, 2 medium boxes, 1 king bed"
          );
          setResult(null);
        } else {
          setResult(estimate);
        }
      } catch {
        setError("Something went wrong calculating your estimate. Please check your input and try again.");
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, 60);
  }, []);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Easy Peasy AI Estimator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your inventory below to instantly estimate cubic feet, shipment weight, truck size, and crew.
          </p>
        </div>

        {/* Input */}
        <EstimatorInput
          onEstimate={handleEstimate}
          onClear={handleClear}
          isLoading={isLoading}
        />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results — only shown after a successful estimate */}
        {result && (
          <div className="space-y-5 transition-opacity duration-300">
            {/* Three totals cards */}
            <TotalsSummary result={result} />

            {/* Sales summary */}
            <SalesSummary result={result} />

            {/* Item breakdown table */}
            <ResultsTable items={result.items} />

            {/* Smart checks and flags */}
            <SmartChecks result={result} />

            {/* CTA */}
            <CallToAction />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-5 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Easy Peasy Movers · ezpeasymovers.com/crm
          </p>
          <p className="text-xs text-slate-400">
            Estimates are for planning purposes only and are not a binding quote.
          </p>
        </div>
      </footer>
    </div>
  );
}
