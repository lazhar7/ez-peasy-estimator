import { Truck } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
        {/* Logo placeholder — swap with <Image> once logo asset is available */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600">
          <Truck className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 leading-tight">
            Easy Peasy Movers
          </span>
          <span className="text-lg font-bold text-slate-900 leading-tight">
            AI Estimator
          </span>
        </div>

        <div className="hidden sm:block ml-auto">
          <span className="text-sm text-slate-500">
            Fast move size estimates for inventory, truck, crew &amp; shipment weight.
          </span>
        </div>
      </div>
    </header>
  );
}
