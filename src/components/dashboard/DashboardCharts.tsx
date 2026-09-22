"use client";

import React, { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  LineController,
  DoughnutController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js modules
Chart.register(
  BarController,
  LineController,
  DoughnutController,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

interface TrendChartProps {
  labels: string[];
  tripsData: number[];
  kmData: number[];
}

export const TrendPerformanceChart: React.FC<TrendChartProps> = ({
  labels,
  tripsData,
  kmData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Dispatched Trips",
            data: tripsData,
            backgroundColor: "rgba(37, 99, 235, 0.85)",
            borderColor: "#2563eb",
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Distance Run (KM)",
            data: kmData,
            type: "line",
            borderColor: "#9333ea",
            backgroundColor: "rgba(147, 51, 234, 0.1)",
            borderWidth: 2,
            pointBackgroundColor: "#9333ea",
            pointRadius: 4,
            tension: 0.3,
            fill: true,
            yAxisID: "y1",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: "bold", family: "Inter" },
              color: "#334155",
            },
          },
          tooltip: {
            backgroundColor: "#1e293b",
            padding: 10,
            titleFont: { size: 12, weight: "bold", family: "Inter" },
            bodyFont: { size: 11, family: "Inter" },
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            beginAtZero: true,
            ticks: {
              stepSize: 2,
              font: { size: 10, family: "Inter" },
              color: "#64748b",
            },
            grid: {
              color: "#f1f5f9",
            },
            title: {
              display: true,
              text: "Trips",
              font: { size: 10, weight: "bold", family: "Inter" },
              color: "#64748b",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            beginAtZero: true,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              font: { size: 10, family: "Inter" },
              color: "#64748b",
            },
            title: {
              display: true,
              text: "KM",
              font: { size: 10, weight: "bold", family: "Inter" },
              color: "#64748b",
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: { size: 10, weight: "bold", family: "Inter" },
              color: "#475569",
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [labels, tripsData, kmData]);

  return <canvas ref={canvasRef} />;
};

interface FleetUtilChartProps {
  highlyUtilised: number;
  underUtilised: number;
  unusedVehicles: number;
}

export const FleetUtilDoughnutChart: React.FC<FleetUtilChartProps> = ({
  highlyUtilised,
  underUtilised,
  unusedVehicles,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const total = highlyUtilised + underUtilised + unusedVehicles;
    const data = total > 0 ? [highlyUtilised, underUtilised, unusedVehicles] : [0, 0, 1];
    const bgColors = total > 0 ? ["#10b981", "#f59e0b", "#cbd5e1"] : ["#cbd5e1", "#cbd5e1", "#cbd5e1"];

    chartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "Highly Utilised (>3 trips)",
          "Under Utilised (1-3 trips)",
          "Idle (0 trips)",
        ],
        datasets: [
          {
            data,
            backgroundColor: bgColors,
            hoverOffset: 4,
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#1e293b",
            padding: 8,
            bodyFont: { size: 11, family: "Inter" },
          },
        },
        cutout: "70%",
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [highlyUtilised, underUtilised, unusedVehicles]);

  return <canvas ref={canvasRef} />;
};
