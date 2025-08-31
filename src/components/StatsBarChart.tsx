import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const data = {
  labels: ['월', '화', '수', '목', '금', '토', '일'],
  datasets: [
    {
      label: '집중 시간',
      data: [3, 4, 2, 5, 6, 1, 2],
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: { position: 'top' as const },
    title: { display: true, text: '주간 집중 시간' },
  },
};

interface StatsBarChartProps {
  data: any;
  options?: any;
}

export default function StatsBarChart({ data, options }: StatsBarChartProps) {
  // 기본 옵션 제공
  const defaultOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '주간 집중 시간' },
    },
  };
  return <Bar data={data} options={options || defaultOptions} />;
}
