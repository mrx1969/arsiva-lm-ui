import type { SummaryMetric } from "@/lib/workspace-data";

export function MetricGrid({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div className={`metric-card metric-card--${metric.accent}`} key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
