import type { PortalTone } from '@/shared/components/portal';

import type {
  BillingType,
  PackageStatus,
  ServicePackageGroup,
} from '../schemas/servicePackageSchemas';

// Ordered value sets for the add-on service packages, each as an immutable
// { value, labelKey } list. `labelKey` is an i18n key in the `servicePackages`
// namespace, translated at render time — never store translated text here.

export const SERVICE_PACKAGE_GROUPS = [
  { value: 'installation', labelKey: 'groups.installation' },
  { value: 'warranty', labelKey: 'groups.warranty' },
  { value: 'maintenance', labelKey: 'groups.maintenance' },
  { value: 'care', labelKey: 'groups.care' },
  { value: 'bundle', labelKey: 'groups.bundle' },
] as const satisfies ReadonlyArray<{
  value: ServicePackageGroup;
  labelKey: string;
}>;

export const BILLING_TYPES = [
  { value: 'one_time', labelKey: 'billingTypes.one_time' },
  { value: 'recurring', labelKey: 'billingTypes.recurring' },
  { value: 'subscription', labelKey: 'billingTypes.subscription' },
] as const satisfies ReadonlyArray<{ value: BillingType; labelKey: string }>;

export const PACKAGE_STATUSES = [
  { value: 'draft', labelKey: 'statuses.draft' },
  { value: 'active', labelKey: 'statuses.active' },
  { value: 'archived', labelKey: 'statuses.archived' },
] as const satisfies ReadonlyArray<{ value: PackageStatus; labelKey: string }>;

export const PACKAGE_GROUP_TONE: Record<ServicePackageGroup, PortalTone> = {
  installation: 'info',
  warranty: 'primary',
  maintenance: 'water',
  care: 'warning',
  bundle: 'danger',
};

export const PACKAGE_STATUS_TONE: Record<PackageStatus, PortalTone> = {
  draft: 'warning',
  active: 'primary',
  archived: 'danger',
};
