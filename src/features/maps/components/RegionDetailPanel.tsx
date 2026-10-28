import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { PageState } from '@/shared/components/PageState';
import { PortalBadge } from '@/shared/components/portal';

import type { MapRegion, MapSite } from '../schemas/mapSchemas';

export interface RegionDetailPanelProps {
  region?: MapRegion;
  sites: MapSite[];
  exactLocation: boolean;
  tdsThreshold: number;
  loading: boolean;
  failed: boolean;
  onClear: () => void;
}

export function RegionDetailPanel({
  region,
  sites,
  exactLocation,
  tdsThreshold,
  loading,
  failed,
  onClear,
}: RegionDetailPanelProps) {
  const { t } = useTranslation('maps');

  if (!region) {
    return (
      <div className="rounded-lg border border-[#E7E8E9] p-4">
        <PageState kind="empty" description={t('empty.selectRegion')} />
      </div>
    );
  }

  const tone = region.status === 'warning' ? 'danger' : 'primary';

  return (
    <div className="space-y-3 rounded-lg border border-[#E7E8E9] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-xs text-[#636466]">{t('detail.title')}</p>
          <h3 className="m-0 text-base font-semibold">{region.name}</h3>
        </div>
        <Button size="small" type="link" onClick={onClear}>
          {t('detail.close')}
        </Button>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[#636466]">{t('detail.status')}</dt>
        <dd className="m-0">
          <PortalBadge tone={tone}>
            {t(`mapRegionStatus.${region.status}`, { ns: 'common' })}
          </PortalBadge>
        </dd>
        <dt className="text-[#636466]">{t('detail.devices')}</dt>
        <dd className="m-0 font-semibold tabular-nums">
          {region.deviceCount.toLocaleString()}
        </dd>
        <dt className="text-[#636466]">{t('detail.avgTds')}</dt>
        <dd className="m-0 font-semibold tabular-nums">
          {region.avgTds} {t('stats.tdsUnit')}
        </dd>
      </dl>
      <div>
        <p className="m-0 text-xs font-semibold text-[#636466]">
          {t('detail.insightTitle')}
        </p>
        <p className="m-0 mt-1 text-sm">
          {t(`detail.insight.${region.insight}`, { threshold: tdsThreshold })}
        </p>
      </div>
      {failed ? (
        <Alert type="error" showIcon message={t('errors.detail')} />
      ) : !exactLocation ? (
        <p className="m-0 text-xs text-[#636466]">{t('detail.sitesHidden')}</p>
      ) : loading ? (
        <PageState kind="loading" />
      ) : sites.length > 0 ? (
        <div>
          <p className="m-0 text-xs font-semibold text-[#636466]">
            {t('detail.sites')}
          </p>
          <ul className="m-0 mt-1 list-disc space-y-1 pl-4 text-sm">
            {sites.map((site) => (
              <li key={site.id}>{site.address}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
