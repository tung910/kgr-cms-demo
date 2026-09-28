export type AlertStatus = 'new' | 'assigned' | 'resolved';
export type AlertSeverity = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  errorCode: string;
  deviceId: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  assignee?: string;
  raisedAt: string;
}

export const alertMockData: Alert[] = [
  {
    id: 'ALT-1001',
    errorCode: 'ER00051',
    deviceId: 'KGR-000123',
    message: 'Áp suất đầu vào vượt ngưỡng an toàn',
    severity: 'high',
    status: 'new',
    raisedAt: '2026-09-10T02:15:00Z',
  },
  {
    id: 'ALT-1002',
    errorCode: 'ER00058',
    deviceId: 'KGR-000456',
    message: 'Lõi lọc gần hết tuổi thọ',
    severity: 'medium',
    status: 'assigned',
    assignee: 'Nguyễn Văn A',
    raisedAt: '2026-09-11T07:40:00Z',
  },
  {
    id: 'ALT-1003',
    errorCode: 'ER00062',
    deviceId: 'KGR-000789',
    message: 'Mất kết nối cloud quá 24 giờ',
    severity: 'high',
    status: 'new',
    raisedAt: '2026-09-11T22:05:00Z',
  },
  {
    id: 'ALT-1004',
    errorCode: 'ER00070',
    deviceId: 'KGR-000234',
    message: 'Nhiệt độ nước ra ngoài dải khuyến nghị',
    severity: 'low',
    status: 'resolved',
    assignee: 'Trần Thị B',
    raisedAt: '2026-09-09T13:30:00Z',
  },
  {
    id: 'ALT-1005',
    errorCode: 'ER00074',
    deviceId: 'KGR-000567',
    message: 'Cảm biến TDS báo lỗi hiệu chuẩn',
    severity: 'medium',
    status: 'new',
    raisedAt: '2026-09-12T01:00:00Z',
  },
];
