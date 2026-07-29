import * as React from "react";
import { cn } from "../../lib/utils";

// Chart container context
const ChartContext = React.createContext(null);

export function ChartContainer({
  children,
  className,
  config,
  ...props
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({ children, className, ...props }) {
  return (
    <div className={cn("rounded-clay-sm bg-clay-100 px-3 py-2 shadow-[6px_6px_18px_rgba(0,0,0,0.06),inset_-3px_-3px_10px_rgba(0,0,0,0.02),inset_3px_3px_10px_rgba(255,255,255,0.6)] text-xs", className)} {...props}>
      {children}
    </div>
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  className,
}) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltip className={className}>
      <p className="font-medium text-ice-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-ice-600">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold text-ice-900">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </ChartTooltip>
  );
}

export function ChartLegend({ payload, className }) {
  if (!payload?.length) return null;
  return (
    <div className={cn("flex items-center gap-4 mt-3", className)}>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-ice-500">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
