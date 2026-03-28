"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type SupportedGraphType = "bar" | "line" | "scatter";

export interface QuestionGraphData {
  type: SupportedGraphType;
  labels?: string[];
  datasets: Array<{
    label: string;
    data: Array<number | { x: number; y: number }>;
  }>;
  xLabel?: string;
  yLabel?: string;
}

interface QuestionChartProps {
  data: QuestionGraphData;
}

export default function QuestionChart({ data }: QuestionChartProps) {
  if (!data?.datasets?.length) return null;
  if (!["bar", "line", "scatter"].includes(data.type)) return null;

  const labels = (data.labels || []).map((label) => String(label)).slice(0, 30);
  const normalizedDatasets = data.datasets
    .map((dataset, idx) => {
      const label = String(dataset?.label || `Dataset ${idx + 1}`);
      const rawData = Array.isArray(dataset?.data) ? dataset.data : [];
      if (data.type === "scatter") {
        const scatterData = rawData
          .map((point, pointIdx) => {
            if (typeof point === "number" && Number.isFinite(point)) {
              return { x: pointIdx + 1, y: point };
            }
            if (
              point &&
              typeof point === "object" &&
              Number.isFinite((point as { x?: unknown }).x) &&
              Number.isFinite((point as { y?: unknown }).y)
            ) {
              return {
                x: Number((point as { x: number }).x),
                y: Number((point as { y: number }).y),
              };
            }
            return null;
          })
          .filter((point): point is { x: number; y: number } => Boolean(point))
          .slice(0, 60);
        if (!scatterData.length) return null;
        return { label, data: scatterData };
      }

      const numericData = rawData
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .slice(0, labels.length || 30);
      if (!numericData.length) return null;
      return { label, data: numericData };
    })
    .filter(Boolean) as Array<{
      label: string;
      data: Array<number | { x: number; y: number }>;
    }>;

  if (!normalizedDatasets.length) return null;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: data.datasets.length > 1,
        labels: {
          color: "#64748b",
        },
      },
    },
    scales: {
      x: {
        ...(data.type === "scatter" ? { type: "linear" as const } : {}),
        title: data.xLabel ? { display: true, text: data.xLabel, color: "#64748b" } : undefined,
        ticks: { color: "#64748b" },
        grid: { color: "rgba(148,163,184,0.18)" },
      },
      y: {
        title: data.yLabel ? { display: true, text: data.yLabel, color: "#64748b" } : undefined,
        ticks: { color: "#64748b" },
        grid: { color: "rgba(148,163,184,0.18)" },
      },
    },
  };

  const chartData = {
    labels: data.type === "scatter" ? undefined : labels,
    datasets: normalizedDatasets.map((dataset, idx) => ({
      label: dataset.label || `Dataset ${idx + 1}`,
      data: dataset.data,
      borderColor: idx % 2 === 0 ? "#0ea5e9" : "#10b981",
      backgroundColor: idx % 2 === 0 ? "rgba(14,165,233,0.25)" : "rgba(16,185,129,0.25)",
      pointRadius: 4,
      pointHoverRadius: 5,
      borderWidth: 2,
    })),
  };

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-3 sm:p-4">
      <div className="h-[240px] sm:h-[280px]">
        {data.type === "bar" && <Bar data={chartData} options={commonOptions} />}
        {data.type === "line" && <Line data={chartData} options={commonOptions} />}
        {data.type === "scatter" && <Scatter data={chartData} options={commonOptions} />}
      </div>
    </div>
  );
}
