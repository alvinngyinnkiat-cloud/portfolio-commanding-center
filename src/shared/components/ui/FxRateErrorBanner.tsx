import { AlertTriangle } from "lucide-react";
import { FX_RATE_ERROR_MESSAGE } from "@/core/calculations/fx-validation";

export function FxRateErrorBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
      <div>
        <p className="font-semibold text-amber-200">{FX_RATE_ERROR_MESSAGE}</p>
        <p className="mt-1 text-sm text-amber-100/80">
          Set a valid USD/SGD FX rate in Settings → Portfolio Values (must be
          greater than zero).
        </p>
      </div>
    </div>
  );
}
