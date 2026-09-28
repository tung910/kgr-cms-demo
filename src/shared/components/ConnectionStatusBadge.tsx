import { useTranslation } from 'react-i18next';

import {
  CONNECTION_STATUS_LABEL_KEYS,
  type ConnectionStatus,
} from '@/shared/constants/connectionStatus';

import { PortalBadge, type PortalTone } from './portal';

export type { ConnectionStatus };

export interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

const connectionStatusTone: Record<ConnectionStatus, PortalTone> = {
  online: 'primary',
  warning: 'warning',
  offline: 'danger',
};

// Single rendering of a connection state so every screen uses the same
// label and colour for online / warning / offline.
export function ConnectionStatusBadge({
  status,
  className,
}: ConnectionStatusBadgeProps) {
  const { t } = useTranslation('common');

  return (
    <PortalBadge tone={connectionStatusTone[status]} dot className={className}>
      {t(CONNECTION_STATUS_LABEL_KEYS[status])}
    </PortalBadge>
  );
}
