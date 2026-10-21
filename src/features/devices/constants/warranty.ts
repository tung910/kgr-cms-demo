import type { PortalTone } from '@/shared/components/portal';

import type { DeviceWarrantyStatus } from '../schemas/deviceSchemas';

export const WARRANTY_STATUS_TONES: Record<DeviceWarrantyStatus, PortalTone> = {
  active: 'primary',
  expiring: 'warning',
  expired: 'danger',
  none: 'info',
};
