export type WarrantyStatus = 'active' | 'expiring' | 'expired';
export type BookingStatus = 'pending' | 'assigned' | 'done';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  region: string;
  address: string;
  joinedAt: string;
  deviceCount: number;
  warrantyStatus: WarrantyStatus;
}

export interface Booking {
  id: string;
  customerName: string;
  deviceId: string;
  issue: string;
  scheduledAt: string;
  status: BookingStatus;
  technician?: string;
}

export const customerMockData: Customer[] = [
  {
    id: 'CUS-2001',
    name: 'Nguyễn Văn A',
    phone: '090xxxx123',
    email: 'nguyenvana@gmail.com',
    region: 'Hà Nội',
    address: 'Số 12 ngõ 45 Kim Giang, Phường Hoàng Mai, Hà Nội',
    joinedAt: '2025-01-01T08:00:00.000Z',
    deviceCount: 2,
    warrantyStatus: 'active',
  },
  {
    id: 'CUS-2002',
    name: 'Trần Thị B',
    phone: '091xxxx456',
    email: 'tranthib@gmail.com',
    region: 'TP. Hồ Chí Minh',
    address: 'Số 88 Nguyễn Trãi, Phường Bến Thành, TP. Hồ Chí Minh',
    joinedAt: '2025-02-01T08:00:00.000Z',
    deviceCount: 1,
    warrantyStatus: 'expiring',
  },
  {
    id: 'CUS-2003',
    name: 'Lê Văn C',
    phone: '093xxxx789',
    email: 'levanc@yahoo.com',
    region: 'Đà Nẵng',
    address: 'Số 5 Lê Duẩn, Phường Hải Châu, Đà Nẵng',
    joinedAt: '2025-03-01T08:00:00.000Z',
    deviceCount: 3,
    warrantyStatus: 'expired',
  },
  {
    id: 'CUS-2004',
    name: 'Phạm Thị D',
    phone: '096xxxx012',
    email: 'phamthid@outlook.com',
    region: 'Cần Thơ',
    address: 'Số 21 Hòa Bình, Phường An Cư, Cần Thơ',
    joinedAt: '2025-04-01T08:00:00.000Z',
    deviceCount: 1,
    warrantyStatus: 'active',
  },
];

export const bookingMockData: Booking[] = [
  {
    id: 'BK-3001',
    customerName: 'Nguyễn Văn A',
    deviceId: 'KGR-000123',
    issue: 'Thay lõi lọc định kỳ',
    scheduledAt: '2026-09-15T02:00:00Z',
    status: 'pending',
  },
  {
    id: 'BK-3002',
    customerName: 'Trần Thị B',
    deviceId: 'KGR-000456',
    issue: 'Kiểm tra rò rỉ nước',
    scheduledAt: '2026-09-13T07:00:00Z',
    status: 'assigned',
    technician: 'Đỗ Văn E',
  },
  {
    id: 'BK-3003',
    customerName: 'Lê Văn C',
    deviceId: 'KGR-000789',
    issue: 'Bảo hành mainboard',
    scheduledAt: '2026-09-10T03:30:00Z',
    status: 'done',
    technician: 'Đỗ Văn E',
  },
];
