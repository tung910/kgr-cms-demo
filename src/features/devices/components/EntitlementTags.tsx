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

  // Status-only part of the tag text (spec §8.1: "tên ngắn + thông tin theo
  // trạng thái" — short name + status-based info). Returns `null` when there
  // is no extra status info to add beyond the name (an `active`, no-quota /
  // time-only entitlement — its validity is already implied by the tag's
  // tone, and the term is in the tooltip).
  const statusInfo = (item: EntitlementSummary): string | null => {
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
    return null;
  };

  // Fix for the final whole-branch review: the tag used to show ONLY the
  // status text ("0/2 uses"), leaving the package name in the hover tooltip
  // only — an operator looking at several tags on one row couldn't tell which
  // package was which without hovering each one. Prefix with the (possibly
  // truncated, see the `truncate` wrapper below) package name whenever there
  // is status info to attach; otherwise fall back to the bare name.
  const label = (item: EntitlementSummary): string => {
    const status = statusInfo(item);
    return status
      ? t('entitlements.tags.withName', { name: item.name, status })
      : item.name;
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
            <Tag className="m-0 max-w-[220px]">
              <span className="block truncate">{label(item)}</span>
            </Tag>
          ) : (
            <PortalBadge
              tone={ENTITLEMENT_STATUS_TONE[item.status]}
              className="min-w-0 max-w-[220px]"
            >
              <span className="min-w-0 truncate">{label(item)}</span>
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
