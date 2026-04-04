"use client";

import type { EstimateResult } from "@/types";
import { AlertTriangle, PackageOpen, MapPin, Info, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface SmartChecksProps {
  result: EstimateResult;
}

interface CheckItem {
  id: string;
  icon: React.ElementType;
  title: string;
  body: string;
  variant: "warning" | "info" | "success";
}

export default function SmartChecks({ result }: SmartChecksProps) {
  const checks: CheckItem[] = [];

  // Special items flag
  if (result.hasSpecialItems) {
    checks.push({
      id: "special",
      icon: AlertTriangle,
      title: "Special Handling Required",
      body: `Your inventory includes items that need extra care or equipment: ${result.specialItemNames.join(", ")}.`,
      variant: "warning",
    });
  }

  // Multi-stop flag
  if (result.hasMultiStop) {
    checks.push({
      id: "multistop",
      icon: MapPin,
      title: "Move Complexity: Multi-Stop Move",
      body: "This move appears to involve multiple pickup or delivery locations. Please confirm all addresses with your move coordinator.",
      variant: "info",
    });
  }

  // Missing categories follow-up
  if (result.missingCategories.length > 0) {
    const cats = result.missingCategories.join(", ");
    checks.push({
      id: "missing",
      icon: Info,
      title: "Inventory may be incomplete",
      body: `Do you also have ${cats}? Adding these items will improve your estimate accuracy.`,
      variant: "info",
    });
  }

  // Packing recommendation
  if (result.needsMoreBoxes) {
    checks.push({
      id: "boxes",
      icon: PackageOpen,
      title: "Packing Recommendation",
      body: "You may need additional boxes or packing support depending on closets, kitchen items, garage items, and storage. A typical move this size uses 20–30+ boxes.",
      variant: "info",
    });
  }

  // Access check — always show as a gentle reminder
  checks.push({
    id: "access",
    icon: Info,
    title: "Access Conditions",
    body: "Do any locations have stairs, elevators, or a long walking distance from the truck? This affects labor time and crew needs.",
    variant: "info",
  });

  // Confidence note when high
  if (result.confidence === "High" && checks.length === 1) {
    checks.unshift({
      id: "complete",
      icon: CheckCircle2,
      title: "Inventory looks complete",
      body: "We found all major item categories in your list. Your estimate confidence is high.",
      variant: "success",
    });
  }

  const variantStyles: Record<CheckItem["variant"], { wrapper: string; icon: string }> = {
    warning: {
      wrapper: "border-amber-200 bg-amber-50/60",
      icon:    "text-amber-500",
    },
    info: {
      wrapper: "border-blue-100 bg-blue-50/40",
      icon:    "text-blue-500",
    },
    success: {
      wrapper: "border-brand-200 bg-brand-50/60",
      icon:    "text-brand-600",
    },
  };

  if (checks.length === 0) return null;

  return (
    <div className="card-section space-y-4">
      <p className="section-label">Flags &amp; Recommendations</p>

      <div className="space-y-2.5">
        {checks.map((check) => {
          const Icon = check.icon;
          const styles = variantStyles[check.variant];
          return (
            <div
              key={check.id}
              className={clsx(
                "flex gap-3 p-3.5 rounded-xl border",
                styles.wrapper
              )}
            >
              <Icon className={clsx("w-4 h-4 mt-0.5 flex-shrink-0", styles.icon)} strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{check.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{check.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
