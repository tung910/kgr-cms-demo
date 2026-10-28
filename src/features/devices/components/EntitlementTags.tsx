import { Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalBadge } from '@/shared/components/portal';

import type { EntitlementSummary } from '../schemas/entitlementSchemas';
import {
  ENTITLEMENT_STATUS_TONE,
  daysRemaining,
} from '../utils/entitlementDisplay';

export interface EntitlementTagsProps {
  items: EntitlementSummary[];
  /** `in_use` = Đang sử dụng tab; `inventory` = Trong kho tab (§8.1). */
  variant: 'in_use' | 'inventory';
}

// §8.1 — device list column "Gói dịch vụ". `entitlementsSummary` already
// excludes `expired`/`revoked` server-side (§11); filtered again here
// defensively since the spec calls it out explicitly.
export function EntitlementTags({ items, variant }: EntitlementTagsProps) {
  const { t } = useTranslation('devices');

  const visible = items.filter(
    (item) => item.status !== 'expired' && item.status !== 'revoked'
  );

  if (visible.length === 0) {
    return <span className="text-xs text-[#9A9B9C]">—</span>;
  }

  const label = (item: EntitlementSummary): string => {
    if (item.status === 'exhausted') {
      return t('entitlements.statuses.exhausted');
    }
    if (item.status === 'expiring') {
      return t('entitlements.tags.expiringDays', {
        count: daysRemaining(item.endsAt),
      });
    }
    if (item.status === 'active' && item.quota !== null) {
      return t('entitlements.tags.quota', {
        used: item.used,
        quota: item.quota,
      });
    }
    if (item.status === 'pending') {
      // §15.2: an install-type (one_time) entitlement not yet used shows
      // "Chưa sử dụng" even before activation; every other package type
      // shows the generic "Chưa bắt đầu".
      return item.kind === 'one_time'
        ? t('entitlements.tags.notUsedYet')
        : t('entitlements.tags.notStarted');
    }
    return item.name;
  };

  const tooltip = (item: EntitlementSummary): string => {
    const term = item.termMonths
      ? t('entitlements.tags.tooltipTerm', { count: item.termMonths })
      : t('entitlements.tags.tooltipNoTerm');
    const source = t('entitlements.tags.tooltipSource', {
      reference: item.sourceReference,
    });
    return [item.name, term, source].filter(Boolean).join(' · ');
  };

  const shown = visible.slice(0, 2);
  const overflow = visible.slice(2);

  // Tab Trong kho: grey "not started" tags; never override a real server
  // status (e.g. an already-exhausted install entitlement) just because
  // it's rendered on the inventory tab.
  const isGreyTag = (item: EntitlementSummary) =>
    variant === 'inventory' && item.status === 'pending';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((item) => (
        <Tooltip key={item.id} title={tooltip(item)}>
          {isGreyTag(item) ? (
            <Tag className="m-0">{label(item)}</Tag>
          ) : (
            <PortalBadge tone={ENTITLEMENT_STATUS_TONE[item.status]}>
              {label(item)}
            </PortalBadge>
          )}
        </Tooltip>
      ))}
      {overflow.length > 0 ? (
        <Tooltip title={overflow.map((item) => item.name).join(', ')}>
          <Tag className="m-0">
            {t('entitlements.tags.overflow', { count: overflow.length })}
          </Tag>
        </Tooltip>
      ) : null}
    </div>
  );
}
