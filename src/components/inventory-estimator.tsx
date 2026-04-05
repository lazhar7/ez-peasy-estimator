"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  calculateTotals,
  CATEGORY_OPTIONS,
  createBlankItem,
  createStarterInventory,
  DEFAULT_RATES,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/estimator";
import { EstimatorRates, InventoryItem } from "@/types/estimator";
import { ZillowIngestionResponse } from "@/types/listing";

const furnishingProfiles = [
  { id: "light", label: "Lightly furnished", multiplier: 0.88 },
  { id: "average", label: "Average home", multiplier: 1 },
  { id: "full", label: "Fully furnished", multiplier: 1.16 },
] as const;

const roomGroupOrder = [
  "Bedrooms",
  "Living room",
  "Kitchen / dining",
  "Office",
  "Garage / storage",
  "Other",
] as const;

type ItemField = keyof InventoryItem;
type RateField = keyof EstimatorRates;
type EntryMode = "zillow" | "manual";
type FurnishingProfileId = (typeof furnishingProfiles)[number]["id"];

export function InventoryEstimator() {
  const [entryMode, setEntryMode] = useState<EntryMode>("zillow");
  const [inventory, setInventory] = useState<InventoryItem[]>(createStarterInventory);
  const [rates, setRates] = useState<EstimatorRates>(DEFAULT_RATES);
  const [listingUrl, setListingUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [ingestionResult, setIngestionResult] = useState<ZillowIngestionResponse | null>(null);
  const [furnishingProfile, setFurnishingProfile] =
    useState<FurnishingProfileId>("average");

  const totals = useMemo(() => calculateTotals(inventory, rates), [inventory, rates]);
  const furnishingMultiplier =
    furnishingProfiles.find((profile) => profile.id === furnishingProfile)?.multiplier ?? 1;
  const adjustedSummary = useMemo(
    () => ({
      cubicFeet: totals.cubicFeet * furnishingMultiplier,
      shipmentWeight: totals.shipmentWeight * furnishingMultiplier,
      laborHoursLow: totals.laborHoursLow * furnishingMultiplier,
      laborHoursHigh: totals.laborHoursHigh * furnishingMultiplier,
      laborCost: totals.laborCost * furnishingMultiplier,
      truckCost: totals.truckCost * furnishingMultiplier,
      disposalCost: totals.disposalCost,
      grandTotal:
        totals.laborCost * furnishingMultiplier +
        totals.truckCost * furnishingMultiplier +
        totals.disposalCost,
    }),
    [furnishingMultiplier, totals],
  );

  const groupedInventory = useMemo(() => {
    const grouped = new Map<string, { label: string; cubicFeet: number; items: number }>();

    for (const item of inventory) {
      const label = getRoomGroupLabel(item);
      const existing = grouped.get(label) ?? { label, cubicFeet: 0, items: 0 };
      existing.cubicFeet += item.quantity * item.cubicFeetEach;
      existing.items += item.quantity;
      grouped.set(label, existing);
    }

    return roomGroupOrder
      .map((label) => grouped.get(label))
      .filter(
        (group): group is { label: string; cubicFeet: number; items: number } =>
          Boolean(group),
      );
  }, [inventory]);

  const inferredBaselineItems = useMemo(
    () => inventory.filter((item) => item.sourceType === "inferred-baseline"),
    [inventory],
  );

  const confidenceExplanation =
    ingestionResult?.inference.mode === "vision"
      ? "Based on visible rooms + inferred full-home coverage."
      : "Based on listing details, visible rooms, and inferred full-home coverage.";

  const reportAddress =
    ingestionResult?.listing.details.address ?? "Estimate report pending Zillow intake";

  function updateItem(id: string, field: ItemField, value: string) {
    setInventory((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const numericFields: ItemField[] = [
          "quantity",
          "cubicFeetEach",
          "estimatedWeightEach",
          "laborHoursEach",
          "disposalRateEach",
          "confidence",
        ];

        if (numericFields.includes(field)) {
          return {
            ...item,
            [field]: value === "" ? 0 : Number(value),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  function updateRate(field: RateField, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setRates((current) => ({
      ...current,
      [field]: value === "" ? 0 : Number(value),
    }));
  }

  function addRow() {
    setInventory((current) => [
      ...current,
      createBlankItem(entryMode === "manual" ? "manual" : "ai-generated"),
    ]);
  }

  function duplicateRow(id: string) {
    setInventory((current) => {
      const match = current.find((item) => item.id === id);
      if (!match) {
        return current;
      }

      return [
        ...current,
        {
          ...match,
          id: createBlankItem(match.sourceType).id,
          notes: match.notes ? `${match.notes} (copy)` : "",
        },
      ];
    });
  }

  function removeRow(id: string) {
    setInventory((current) => current.filter((item) => item.id !== id));
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/listing-intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: listingUrl }),
      });

      const payload = (await response.json()) as ZillowIngestionResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Listing intake failed.");
      }

      setIngestionResult(payload);
      setInventory(payload.inference.generatedInventory);
      setEntryMode("zillow");
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Unable to process that Zillow URL.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function switchToManual() {
    setEntryMode("manual");
    setGenerationError(null);
    setIngestionResult(null);
    setInventory(createStarterInventory());
  }

  function printReport() {
    window.print();
  }

  return (
    <main className="min-h-screen px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5">
        <section className="overflow-hidden rounded-[1.8rem] border border-[rgba(187,145,98,0.2)] bg-surface shadow-[var(--shadow)]">
          <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.35fr)_290px] lg:px-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[#ffe7d4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-deep">
                  Easy Peasy move pre-estimate
                </span>
                <span className="inline-flex rounded-full border border-[rgba(187,145,98,0.26)] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  Zillow listing intake
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="max-w-3xl font-display text-[2.3rem] leading-[1.02] tracking-[-0.03em] sm:text-[3.2rem] lg:text-[3.65rem]">
                  EZ Peasy AI Estimator
                </h1>
                <p className="max-w-2xl text-base leading-7 text-foreground/72">
                  Get a fast, accurate moving estimate using AI powered by real listing data and moving industry logic.
                </p>
                <p className="text-sm font-medium tracking-[0.01em] text-foreground/58">
                  Based on listing photos, home size, and moving-industry estimating logic.
                </p>
              </div>

              <form
                onSubmit={handleGenerate}
                className="rounded-[1.35rem] border border-[rgba(187,145,98,0.25)] bg-white/96 p-3.5 shadow-[0_12px_28px_rgba(78,54,36,0.06)]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                      Zillow listing URL
                    </label>
                    <p className="mt-1 text-sm leading-6 text-foreground/62">
                      Paste one property link to create a fast, customer-ready pre-estimate.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f7efe1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                    Fast quote start
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                  <input
                    type="url"
                    required
                    placeholder="https://www.zillow.com/homedetails/..."
                    value={listingUrl}
                    onChange={(event) => setListingUrl(event.target.value)}
                    className="h-12 flex-1 rounded-full border border-line bg-[#fffdf9] px-5 text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(222,122,52,0.28)] transition hover:bg-accent-deep disabled:cursor-wait disabled:opacity-70"
                  >
                    {isGenerating ? "Building estimate..." : "Start estimate"}
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-foreground/66 sm:flex-row sm:items-center sm:justify-between">
                  <p>Free first-pass estimate for faster follow-up before the final survey.</p>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className="text-left font-semibold text-accent-deep transition hover:text-accent"
                  >
                    Use manual inventory instead
                  </button>
                </div>
                {generationError ? (
                  <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {generationError}
                  </p>
                ) : null}
              </form>

              <section className="relative overflow-hidden rounded-[1.5rem] bg-navy px-4 py-4 text-white shadow-[0_22px_48px_rgba(17,32,50,0.22)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_42%)]" />
                <div className="flex flex-col gap-3">
                  <div className="relative flex flex-col gap-2 rounded-[1.15rem] border border-white/10 bg-white/6 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                        Your Estimated Move Size
                      </p>
                      <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-[3.4rem]">
                        {formatCurrency(adjustedSummary.grandTotal)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        Based on listing data, photos, and full-home assumptions.
                      </p>
                    </div>
                    <p className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      {furnishingProfiles.find((profile) => profile.id === furnishingProfile)?.label}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <PremiumStatCard
                      label="Cubic feet"
                      value={`${formatNumber(adjustedSummary.cubicFeet, 0)} cu ft`}
                      detail="Estimated move volume"
                    />
                    <PremiumStatCard
                      label="Weight"
                      value={`${formatNumber(adjustedSummary.shipmentWeight, 0)} lb`}
                      detail="Estimated shipment weight"
                    />
                    <PremiumStatCard
                      label="Truck"
                      value={totals.truckRecommendation}
                      detail="Suggested truck size"
                    />
                    <PremiumStatCard
                      label="Crew"
                      value={totals.crewRecommendation}
                      detail="Suggested crew size"
                    />
                    <PremiumStatCard
                      label="Labor"
                      value={`${formatNumber(adjustedSummary.laborHoursLow)}-${formatNumber(
                        adjustedSummary.laborHoursHigh,
                      )} hrs`}
                      detail="Estimated labor window"
                    />
                  </div>

                  <div className="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.05))] px-4 py-3">
                    <p className="text-base font-semibold leading-7 text-white sm:text-lg">
                      This home will likely require a {totals.truckRecommendation.toLowerCase()} with a {totals.crewRecommendation.toLowerCase()} and about {formatNumber(adjustedSummary.laborHoursLow)}-{formatNumber(adjustedSummary.laborHoursHigh)} labor hours.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 rounded-[1.1rem] border border-white/10 bg-[#102645] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        Confidence
                      </p>
                      <p className="mt-1 text-3xl font-semibold">{formatPercent(totals.averageConfidence)}</p>
                      <p className="text-sm leading-6 text-white/72">
                        AI + home-size baseline + industry averages
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(222,122,52,0.32)] transition hover:bg-accent-deep"
                      >
                        Request exact quote
                      </button>
                      <p className="text-xs leading-5 text-white/55">
                        Use this pre-estimate to guide the first quote conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="flex flex-col gap-3 self-start">
              <section className="rounded-[1.2rem] border border-[rgba(187,145,98,0.22)] bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                  Furnishing profile
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {furnishingProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setFurnishingProfile(profile.id)}
                      className={pillClassName(furnishingProfile === profile.id)}
                    >
                      {profile.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.2rem] border border-[rgba(187,145,98,0.22)] bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                  Rate controls
                </p>
                <div className="mt-3 grid gap-3">
                  <RateField
                    label="Labor rate per hour"
                    value={rates.laborRatePerHour}
                    step={1}
                    onChange={(event) => updateRate("laborRatePerHour", event)}
                  />
                  <RateField
                    label="Truck rate per cubic foot"
                    value={rates.truckRatePerCubicFoot}
                    step={0.5}
                    onChange={(event) => updateRate("truckRatePerCubicFoot", event)}
                  />
                  <RateField
                    label="Disposal multiplier"
                    value={rates.disposalRateMultiplier}
                    step={0.1}
                    onChange={(event) => updateRate("disposalRateMultiplier", event)}
                  />
                </div>
              </section>

              <section className="rounded-[1.2rem] border border-[rgba(187,145,98,0.22)] bg-white/92 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                  Compact move summary
                </p>
                <div className="mt-3 space-y-3">
                  <SidebarStat label="Truck" value={totals.truckRecommendation} />
                  <SidebarStat label="Crew" value={totals.crewRecommendation} />
                  <SidebarStat
                    label="Labor"
                    value={`${formatNumber(adjustedSummary.laborHoursLow)}-${formatNumber(
                      adjustedSummary.laborHoursHigh,
                    )} hrs`}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/62">
                  Designed for a fast first quote, then refined after a full review.
                </p>
              </section>
            </aside>
          </div>
        </section>

        <section className="grid gap-2.5">
          <section className="overflow-hidden rounded-[1.6rem] border border-[rgba(187,145,98,0.2)] bg-white shadow-[var(--shadow)] print:break-inside-avoid">
            <div className="border-b border-[rgba(187,145,98,0.18)] bg-[#f8efe2] px-5 py-4 print:bg-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-foreground/45">
                    Estimate report
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold">Your Estimated Move Size</h2>
                  <p className="mt-2 text-sm leading-6 text-foreground/70">
                    Based on listing data, photos, and full-home assumptions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(187,145,98,0.24)] bg-white px-5 text-sm font-semibold text-foreground transition hover:border-line-strong hover:bg-stone-50 print:hidden"
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>

            <div className="grid gap-3 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.25rem] border border-[rgba(187,145,98,0.18)] bg-[#fffaf3] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                    Property address
                  </p>
                  <p className="mt-3 text-2xl font-semibold leading-tight">{reportAddress}</p>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">
                    {[
                      ingestionResult?.listing.details.bedrooms
                        ? `${formatNumber(ingestionResult.listing.details.bedrooms)} bd`
                        : null,
                      ingestionResult?.listing.details.bathrooms
                        ? `${formatNumber(ingestionResult.listing.details.bathrooms)} ba`
                        : null,
                      ingestionResult?.listing.details.squareFeet
                        ? `${formatNumber(ingestionResult.listing.details.squareFeet, 0)} sq ft`
                        : null,
                      ingestionResult?.listing.details.propertyType ?? null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "Run a Zillow estimate to populate listing details."}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[rgba(21,47,74,0.18)] bg-navy px-4 py-4 text-white">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                          Estimate snapshot
                        </p>
                        <p className="mt-2 text-base font-semibold text-white/88">
                          Built for a fast, confident first quote conversation.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#274867] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Pre-estimate
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                    <ReportMetric
                      label="Cubic feet"
                      value={`${formatNumber(adjustedSummary.cubicFeet, 0)} cu ft`}
                    />
                    <ReportMetric
                      label="Weight"
                      value={`${formatNumber(adjustedSummary.shipmentWeight, 0)} lb`}
                    />
                    <ReportMetric label="Truck" value={totals.truckRecommendation} />
                    <ReportMetric label="Crew" value={totals.crewRecommendation} />
                    <ReportMetric
                      label="Labor"
                      value={`${formatNumber(adjustedSummary.laborHoursLow)}-${formatNumber(
                        adjustedSummary.laborHoursHigh,
                      )} hrs`}
                      className="sm:col-span-2"
                    />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div className="rounded-[1.25rem] border border-[rgba(187,145,98,0.18)] bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                    Confidence explanation
                  </p>
                  <p className="mt-3 text-2xl font-semibold">{formatPercent(totals.averageConfidence)}</p>
                  <p className="mt-3 text-sm leading-6 text-foreground/72">
                    {confidenceExplanation}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground/65">
                    AI + home-size baseline + industry averages
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[rgba(187,145,98,0.18)] bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                    Sales summary
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-7 text-foreground">
                    This home will likely require a {totals.truckRecommendation.toLowerCase()} with a {totals.crewRecommendation.toLowerCase()}.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground/72">
                    Fast quoting summary for a first conversation before final survey.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(222,122,52,0.22)] transition hover:bg-accent-deep print:hidden"
                  >
                    Request exact quote
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-[rgba(187,145,98,0.2)] bg-white shadow-[var(--shadow)]">
            <div className="flex flex-col gap-3 border-b border-[rgba(187,145,98,0.18)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryMode("zillow")}
                    className={pillClassName(entryMode === "zillow")}
                  >
                    Zillow generated
                  </button>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className={pillClassName(entryMode === "manual")}
                  >
                    Manual fallback
                  </button>
                </div>
                <h2 className="mt-3 text-2xl font-semibold">Editable inventory table</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/68">
                  Keep every row editable after AI generation. The estimate is directional, not exact, and should be reviewed before quoting or dispatch.
                </p>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent-deep"
              >
                Add inventory row
              </button>
            </div>

            <div className="overflow-x-auto bg-[#fffdfa]">
              <table className="min-w-[1380px] w-full text-left text-sm">
                <thead className="bg-[#f7efe2] text-foreground/55">
                  <tr>
                    {[
                      "Area",
                      "Item",
                      "Category",
                      "Qty",
                      "Cu ft each",
                      "Weight each",
                      "Labor hrs each",
                      "Disposal each",
                      "Confidence",
                      "Source",
                      "Notes",
                      "",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id} className="border-t border-[rgba(187,145,98,0.16)] align-top">
                      <td className="px-4 py-3">
                        <TextCell
                          value={item.area}
                          onChange={(value) => updateItem(item.id, "area", value)}
                          placeholder="Living Room"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <TextCell
                          value={item.name}
                          onChange={(value) => updateItem(item.id, "name", value)}
                          placeholder="Sectional sofa"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.category}
                          onChange={(event) =>
                            updateItem(item.id, "category", event.target.value)
                          }
                          className={fieldClassName}
                        >
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.quantity}
                          min={0}
                          step={1}
                          onChange={(value) => updateItem(item.id, "quantity", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.cubicFeetEach}
                          min={0}
                          step={1}
                          onChange={(value) => updateItem(item.id, "cubicFeetEach", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.estimatedWeightEach}
                          min={0}
                          step={1}
                          onChange={(value) =>
                            updateItem(item.id, "estimatedWeightEach", value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.laborHoursEach}
                          min={0}
                          step={0.1}
                          onChange={(value) =>
                            updateItem(item.id, "laborHoursEach", value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.disposalRateEach}
                          min={0}
                          step={1}
                          onChange={(value) =>
                            updateItem(item.id, "disposalRateEach", value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberCell
                          value={item.confidence ?? 0}
                          min={0}
                          step={0.01}
                          onChange={(value) => updateItem(item.id, "confidence", value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="rounded-2xl border border-[rgba(187,145,98,0.18)] bg-[#fffaf2] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/55">
                          {item.sourceType}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TextCell
                          value={item.notes}
                          onChange={(value) => updateItem(item.id, "notes", value)}
                          placeholder="Stairs, fragile, disassembly..."
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => duplicateRow(item.id)}
                            className={secondaryButtonClassName}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(item.id)}
                            className={secondaryButtonClassName}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-2.5 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[1.55rem] border border-[rgba(187,145,98,0.2)] bg-white px-5 py-4 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-foreground/45">
                    Room breakdown
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/72">
                    Subtotal cubic feet grouped by likely move areas.
                  </p>
                </div>
                <p className="rounded-full bg-[#f3e5d1] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                  {formatNumber(adjustedSummary.cubicFeet, 0)} cu ft adjusted
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {groupedInventory.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-[1rem] border border-[rgba(187,145,98,0.18)] bg-[#fffaf3] px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                      {group.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatNumber(group.cubicFeet, 0)} cu ft
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {formatNumber(group.items, 0)} pieces
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.55rem] border border-[rgba(187,145,98,0.2)] bg-white px-5 py-4 shadow-[var(--shadow)]">
              <p className="text-sm uppercase tracking-[0.24em] text-foreground/45">
                Listing intelligence
              </p>
              {ingestionResult ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-[1rem] border border-[rgba(187,145,98,0.18)] bg-[#fffaf3] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold">
                        {ingestionResult.listing.retrievalStatus === "live"
                          ? "Listing retrieved from Zillow"
                          : "Fallback Zillow profile used"}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          ingestionResult.inference.mode === "vision"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-[#fff0d8] text-accent-deep"
                        }`}
                      >
                        {ingestionResult.inference.mode === "vision"
                          ? "vision mode"
                          : "heuristic fallback"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground/72">
                      Provider: {ingestionResult.inference.providerId}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/72">
                      {ingestionResult.inference.narrative}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {ingestionResult.listing.photos.slice(0, 4).map((photo) => (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-[1rem] border border-[rgba(187,145,98,0.18)] bg-[#fffaf3]"
                      >
                        {photo.url ? (
                          <Image
                            src={photo.url}
                            alt={photo.caption}
                            width={320}
                            height={192}
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center bg-[#efe4d1] px-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                            {photo.caption}
                          </div>
                        )}
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium">{photo.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-foreground/70">
                  Run a Zillow estimate to populate listing details, photo previews, and provider status.
                </p>
              )}
            </section>
          </section>

          {inferredBaselineItems.length > 0 ? (
            <section className="rounded-[1.55rem] border border-[rgba(187,145,98,0.2)] bg-white px-5 py-4 shadow-[var(--shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-foreground/45">
                    Additional items typically found in similar homes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/72">
                    Conservative baseline additions used to avoid underestimating larger furnished homes.
                  </p>
                </div>
                <span className="rounded-full bg-[#fff1dc] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-deep">
                  Informational
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {inferredBaselineItems.map((item) => (
                  <div
                    key={item.id}
                  className="rounded-[1rem] border border-[rgba(187,145,98,0.18)] bg-[#fff7e8] px-4 py-3"
                  >
                    <p className="text-sm font-semibold">
                      {item.area}: {item.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/72">
                      {formatNumber(item.quantity, 0)} x {formatNumber(item.cubicFeetEach, 0)} cu ft each
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-foreground/45">
                      Typical similar-home item
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.55rem] border border-[rgba(187,145,98,0.2)] bg-white px-5 py-4 shadow-[var(--shadow)]">
            <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <SummaryRow
                  label="Truck recommendation"
                  value={totals.truckRecommendation}
                  amount={`${formatNumber(adjustedSummary.cubicFeet, 0)} cu ft`}
                />
                <SummaryRow
                  label="Crew recommendation"
                  value={totals.crewRecommendation}
                  amount={`${formatNumber(adjustedSummary.shipmentWeight, 0)} lb`}
                />
                <SummaryRow
                  label="Labor range"
                  value={`${formatNumber(adjustedSummary.laborHoursLow)}-${formatNumber(
                    adjustedSummary.laborHoursHigh,
                  )} hrs`}
                  amount={formatCurrency(adjustedSummary.laborCost)}
                />
              </div>

              <div className="rounded-[1rem] bg-[#f2e5d3] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">
                  Estimate disclaimer
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/75">
                  This is a fast AI-powered pre-estimate. Final volume may change after full survey.
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/72">
                  {ingestionResult?.disclaimer ??
                    "Estimated inventory may vary depending on hidden contents, closets, storage, garage items, basement items, and items not visible in listing photos."}
                </p>
              </div>
            </div>
          </section>

          {ingestionResult?.debugEnabled && ingestionResult.inference.debug ? (
            <section className="rounded-[1.45rem] border border-dashed border-line-strong bg-white px-5 py-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.26em] text-foreground/45">
                Dev debug
              </p>
              <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-2 text-sm leading-6 text-foreground/72">
                  <p>
                    Zillow photo extraction: {ingestionResult.inference.debug.zillowPhotoExtractionStatus} ({ingestionResult.inference.debug.extractedPhotoCount} extracted)
                  </p>
                  <p>
                    Provider requested: {ingestionResult.inference.debug.providerRequested}
                  </p>
                  <p>
                    Provider used: {ingestionResult.inference.debug.providerUsed}
                  </p>
                  <p>Model used: {ingestionResult.inference.debug.modelUsed ?? "none"}</p>
                  <p>
                    Photos sent to provider: {ingestionResult.inference.debug.sentPhotoCount}
                  </p>
                  <p>
                    Provider status: {ingestionResult.inference.debug.providerStatus}
                  </p>
                  {ingestionResult.inference.debug.failureStage ? (
                    <p>
                      Failure stage: {ingestionResult.inference.debug.failureStage}
                    </p>
                  ) : null}
                  {ingestionResult.inference.debug.failureReason ? (
                    <p>
                      Failure reason: {ingestionResult.inference.debug.failureReason}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-[1rem] bg-[#f6efe2] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                    Normalized rows before estimator
                  </p>
                  <pre className="mt-2 overflow-x-auto text-xs leading-5 text-foreground/78 whitespace-pre-wrap">
                    {JSON.stringify(
                      ingestionResult.inference.debug.normalizedInventoryRows,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.45rem] border border-dashed border-line-strong bg-white px-5 py-4 shadow-sm">
            <p className="text-sm uppercase tracking-[0.26em] text-foreground/45">
              Architecture notes
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-foreground/72">
              <p>
                Listing retrieval is isolated behind a provider-based ingestion layer, and AI inventory generation is isolated behind a separate inference module.
              </p>
              <p>
                That keeps GitHub and Vercel deployment simple now while leaving a clean seam for real Zillow retrieval, richer image analysis, or external model calls next.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function TextCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={fieldClassName}
    />
  );
}

function NumberCell({
  value,
  min,
  step,
  onChange,
}: {
  value: number;
  min: number;
  step: number;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${fieldClassName} min-w-24`}
    />
  );
}

function RateField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground/75">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={onChange}
        className={`${fieldClassName} h-12`}
      />
    </label>
  );
}

function SummaryRow({
  label,
  value,
  amount,
}: {
  label: string;
  value: string;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-[rgba(187,145,98,0.18)] bg-[#fffaf3] px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-foreground/55">{value}</p>
      </div>
      <p className="text-right text-lg font-semibold">{amount}</p>
    </div>
  );
}

function PremiumStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] px-3 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-[1.9rem] font-semibold leading-tight text-white">{value}</p>
      <p className="mt-1 text-sm leading-5 text-white/65">{detail}</p>
    </div>
  );
}

function ReportMetric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] px-4 py-3 ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-[1.35rem] font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}

function SidebarStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[rgba(187,145,98,0.16)] bg-[#fffaf3] px-3 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function getRoomGroupLabel(item: InventoryItem) {
  const area = item.area.toLowerCase();
  const category = item.category.toLowerCase();

  if (area.includes("bed") || category === "bedroom") {
    return "Bedrooms";
  }
  if (area.includes("living") || area.includes("family") || area.includes("den")) {
    return "Living room";
  }
  if (area.includes("kitchen") || area.includes("dining") || category === "kitchen") {
    return "Kitchen / dining";
  }
  if (area.includes("office")) {
    return "Office";
  }
  if (area.includes("garage") || area.includes("storage") || category === "garage") {
    return "Garage / storage";
  }

  return "Other";
}

function pillClassName(active: boolean) {
  return active
    ? "inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_18px_rgba(222,122,52,0.18)]"
    : "inline-flex h-10 items-center justify-center rounded-full border border-[rgba(187,145,98,0.24)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/65";
}

const fieldClassName =
  "h-11 w-full rounded-2xl border border-[rgba(187,145,98,0.22)] bg-white px-3 text-sm text-foreground outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent-soft";

const secondaryButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-full border border-[rgba(187,145,98,0.24)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/65 transition hover:border-line-strong hover:bg-stone-50";
