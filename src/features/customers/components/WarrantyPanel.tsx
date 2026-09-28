import { useTranslation } from 'react-i18next';

import { PortalStatCard } from '@/shared/components/portal';

import type { Customer } from '../mocks/customerMockData';

export interface WarrantyPanelProps {
  customers: Customer[];
}

export function WarrantyPanel({ customers }: WarrantyPanelProps) {
  const { t } = useTranslation('customers');
  const activeCount = customers.filter(
    (customer) => customer.warrantyStatus === 'active'
  ).length;
  const expiringCount = customers.filter(
    (customer) => customer.warrantyStatus === 'expiring'
  ).length;
  const expiredCount = customers.filter(
    (customer) => customer.warrantyStatus === 'expired'
  ).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <PortalStatCard label={t('warranty.activeLabel')} value={activeCount} />
      <PortalStatCard label={t('warranty.expiring')} value={expiringCount} />
      <PortalStatCard label={t('warranty.expired')} value={expiredCount} />
    </div>
  );
}
