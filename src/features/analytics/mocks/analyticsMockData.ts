export interface ErrorBreakdown {
  code: string;
  label: string;
  count: number;
}

export interface MonthlyTicketTrend {
  month: string;
  tickets: number;
}

export const errorBreakdownMockData: ErrorBreakdown[] = [
  { code: 'ER00051', label: 'Áp suất đầu vào vượt ngưỡng', count: 42 },
  { code: 'ER00058', label: 'Lõi lọc gần hết tuổi thọ', count: 65 },
  { code: 'ER00062', label: 'Mất kết nối cloud quá 24 giờ', count: 28 },
  {
    code: 'ER00070',
    label: 'Nhiệt độ nước ra ngoài dải khuyến nghị',
    count: 15,
  },
  { code: 'ER00074', label: 'Cảm biến TDS báo lỗi hiệu chuẩn', count: 9 },
];

export const monthlyTicketTrendMockData: MonthlyTicketTrend[] = [
  { month: 'T4', tickets: 120 },
  { month: 'T5', tickets: 145 },
  { month: 'T6', tickets: 132 },
  { month: 'T7', tickets: 168 },
  { month: 'T8', tickets: 151 },
  { month: 'T9', tickets: 159 },
];

export const analyticsKpiMockData = {
  activeDevices: 84210,
  openTickets: 159,
  avgResolutionHours: 6.4,
  filterRecallRate: 0.8,
};
