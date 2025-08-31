import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StatsBarChartProps {
  data: any;
  options?: any;
}

export default function StatsBarChart({ data, options }: StatsBarChartProps) {
  const defaultOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '집중 시간' },
    },
  };
  return <Bar data={data} options={options || defaultOptions} />;
}
