import { useTranslation } from 'react-i18next';

import {
  CONNECTION_STATUS_LABEL_KEYS,
  type ConnectionStatus,
} from '@/shared/constants/connectionStatus';

import { PortalBadge, type PortalTone } from './portal';

export type { ConnectionStatus };

export interface ConnectionStatusBadgeProps {
  /** `null` = non-IoT product, which never reports a connection. */
  status: ConnectionStatus | null;
  className?: string;
}

const connectionStatusTone: Record<ConnectionStatus, PortalTone> = {
  online: 'primary',
  warning: 'warning',
  offline: 'danger',
};

// Single rendering of a connection state so every screen uses the same
// label and colour for online / warning / offline (and non-IoT).
export function ConnectionStatusBadge({
  status,
  className,
}: ConnectionStatusBadgeProps) {
  const { t } = useTranslation('common');

  if (status === null) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F4] px-2.5 py-1 text-xs font-medium text-[#636466] ${className ?? ''}`}
      >
        {t('productConnectivity.non_iot')}
      </span>
    );
  }

  return (
    <PortalBadge tone={connectionStatusTone[status]} dot className={className}>
      {t(CONNECTION_STATUS_LABEL_KEYS[status])}
    </PortalBadge>
  );
}
