import { Injectable } from '@nestjs/common';

export type MetricLabels = Record<string, string | number>;

interface CounterState {
  values: Map<string, number>;
}

interface GaugeState {
  values: Map<string, number>;
}

interface HistogramState {
  sum: number;
  count: number;
  buckets: Map<number, number>;
}

const DEFAULT_BUCKETS_MS = [10, 50, 100, 250, 500, 1000, 2500, 5000];

/**
 * Minimal Prometheus-compatible metrics registry. Kept dependency-free so the
 * API has no extra runtime deps; `renderPrometheus()` emits text/0.0.4.
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, CounterState>();
  private readonly gauges = new Map<string, GaugeState>();
  private readonly histograms = new Map<string, Map<string, HistogramState>>();

  private labelKey(labels: MetricLabels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((key) => `${key}="${labels[key]}"`).join(',');
  }

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const state = this.counters.get(name) ?? { values: new Map() };
    const key = this.labelKey(labels);
    state.values.set(key, (state.values.get(key) ?? 0) + value);
    this.counters.set(name, state);
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const state = this.gauges.get(name) ?? { values: new Map() };
    state.values.set(this.labelKey(labels), value);
    this.gauges.set(name, state);
  }

  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.labelKey(labels);
    const byLabel = this.histograms.get(name) ?? new Map<string, HistogramState>();
    const state =
      byLabel.get(key) ??
      { sum: 0, count: 0, buckets: new Map(DEFAULT_BUCKETS_MS.map((b) => [b, 0])) };
    state.sum += value;
    state.count += 1;
    for (const bucket of DEFAULT_BUCKETS_MS) {
      if (value <= bucket) {
        state.buckets.set(bucket, (state.buckets.get(bucket) ?? 0) + 1);
      }
    }
    byLabel.set(key, state);
    this.histograms.set(name, byLabel);
  }

  snapshot(): Record<string, unknown> {
    return {
      counters: [...this.counters.entries()].map(([name, state]) => ({
        name,
        values: Object.fromEntries(state.values),
      })),
      gauges: [...this.gauges.entries()].map(([name, state]) => ({
        name,
        values: Object.fromEntries(state.values),
      })),
      histograms: [...this.histograms.entries()].map(([name, byLabel]) => ({
        name,
        series: [...byLabel.entries()].map(([labels, state]) => ({
          labels,
          count: state.count,
          sum: state.sum,
          buckets: Object.fromEntries(state.buckets),
        })),
      })),
    };
  }

  renderPrometheus(): string {
    const lines: string[] = [];

    for (const [name, state] of this.counters) {
      lines.push(`# HELP ${name} Total events recorded`);
      lines.push(`# TYPE ${name} counter`);
      for (const [labels, value] of state.values) {
        const suffix = labels ? `{${labels}}` : '';
        lines.push(`${name}${suffix} ${value}`);
      }
    }

    for (const [name, state] of this.gauges) {
      lines.push(`# HELP ${name} Current gauge value`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [labels, value] of state.values) {
        const suffix = labels ? `{${labels}}` : '';
        lines.push(`${name}${suffix} ${value}`);
      }
    }

    for (const [name, byLabel] of this.histograms) {
      lines.push(`# HELP ${name} Duration histogram in milliseconds`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [labels, state] of byLabel) {
        const suffix = labels ? `{${labels}}` : '';
        const bucketSuffix = labels ? `,${labels}` : '';
        lines.push(`${name}_sum${suffix} ${state.sum}`);
        lines.push(`${name}_count${suffix} ${state.count}`);
        for (const [upper, value] of state.buckets) {
          lines.push(`${name}_bucket{le="${upper}"${bucketSuffix}} ${value}`);
        }
        lines.push(`${name}_bucket{le="+Inf"${bucketSuffix}} ${state.count}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }
}
