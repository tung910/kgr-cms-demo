import { useMemo, useState } from 'react';
import { Input, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalCard, PortalPageHeader } from '@/shared/components/portal';

import { BookingList } from '../components/BookingList';
import { CustomerTable } from '../components/CustomerTable';
import { WarrantyPanel } from '../components/WarrantyPanel';
import { bookingMockData, customerMockData } from '../mocks/customerMockData';

export function CustomersPage() {
  const { t } = useTranslation('customers');
  const [activeTab, setActiveTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState(bookingMockData);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customerMockData;
    return customerMockData.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query)
    );
  }, [search]);

  const assignBooking = (id: string) =>
    setBookings((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'assigned',
              technician: t('booking.assignedToYou'),
            }
          : item
      )
    );

  const completeBooking = (id: string) =>
    setBookings((items) =>
      items.map((item) => (item.id === id ? { ...item, status: 'done' } : item))
    );

  const tabItems = [
    {
      key: 'customers',
      label: t('tabs.customers'),
      children: (
        <div className="space-y-4">
          <Input.Search
            placeholder={t('page.searchPlaceholder')}
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <CustomerTable customers={filteredCustomers} />
        </div>
      ),
    },
    {
      key: 'warranty',
      label: t('tabs.warranty'),
      children: <WarrantyPanel customers={customerMockData} />,
    },
    {
      key: 'bookings',
      label: t('tabs.bookings'),
      children: (
        <BookingList
          bookings={bookings}
          onAssign={assignBooking}
          onComplete={completeBooking}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('page.title')}
        description={t('page.description')}
      />
      <PortalCard padded={false} className="p-4">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </PortalCard>
    </div>
  );
}
