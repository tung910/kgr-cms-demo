import { Descriptions } from 'antd';
import { useTranslation } from 'react-i18next';

import { formatDate, formatDateTime } from '@/shared/lib/format';

import type {
  CampaignDraftInput,
  CoreOption,
} from '../schemas/campaignSchemas';
import { describeButtonTarget } from '../utils/buttonText';
import { offerText } from '../utils/offerText';
import { AudienceSummary } from './AudienceSummary';

// Everything the review step and the detail page both show about a campaign.
export type CampaignSummaryData = Omit<
  CampaignDraftInput,
  'reason' | 'tenantId' | 'testRecipients'
>;

export function CampaignSummary({
  data,
  cores = [],
}: {
  data: CampaignSummaryData;
  // Core catalogue used to name targeted SKUs; SKU codes show without it.
  cores?: readonly CoreOption[];
}) {
  const { t } = useTranslation('campaigns');
  const trigger = data.triggerConfig;

  const mechanism =
    data.kind === 'trigger'
      ? [
          data.triggerPreset === 'core_due' && trigger?.coreDays
            ? t('summary.coreDays', { count: trigger.coreDays })
            : data.triggerPreset
              ? t(`trigger.${data.triggerPreset}`)
              : '—',
          trigger
            ? t('summary.cooldown', {
                days: trigger.cooldownDays,
                max: trigger.maxSends,
              })
            : null,
          trigger
            ? t('summary.quiet', {
                from: trigger.quietFrom,
                to: trigger.quietTo,
              })
            : null,
          data.startsAt
            ? t('summary.window', {
                from: formatDate(data.startsAt),
                to: data.endsAt ? formatDate(data.endsAt) : t('summary.noEnd'),
              })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : data.scheduleType === 'scheduled' && data.startsAt
        ? t('summary.scheduledAt', { time: formatDateTime(data.startsAt) })
        : t('schedule.send_now');

  const exclusions = [
    t('fields.suppressOptOut'),
    data.suppression.recentCampaign ? t('fields.suppressRecent') : null,
    data.suppression.testAccounts ? t('fields.suppressTest') : null,
  ]
    .filter(Boolean)
    .join('; ');

  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={t('fields.kind')}>
        {t(`kind.${data.kind}`)}
      </Descriptions.Item>
      <Descriptions.Item label={t('fields.name')}>
        {data.name}
      </Descriptions.Item>
      <Descriptions.Item label={t('fields.displayType')}>
        {t(`displayType.${data.displayType}`)} ·{' '}
        {t(`group.${data.notificationGroup}`)}
      </Descriptions.Item>
      <Descriptions.Item label={t('fields.priority')}>
        {t('summary.priority', { tier: data.priority })}
      </Descriptions.Item>
      <Descriptions.Item label={t('summary.mechanism')}>
        {mechanism}
      </Descriptions.Item>
      <Descriptions.Item label={t('summary.audience')}>
        <AudienceSummary conditions={data.audience} />
        <div className="mt-1 text-xs text-[#636466]">
          {t(`dedupe.${data.dedupe}`)} · {t('summary.exclusions')}: {exclusions}
        </div>
        <div className="mt-1 text-xs text-[#636466]">
          {data.audienceCount === null
            ? t('detail.notPreviewed')
            : t('audience.countText', { count: data.audienceCount })}
        </div>
      </Descriptions.Item>
      <Descriptions.Item label={t('summary.content')}>
        <b>{data.title || '—'}</b>
        <div className="whitespace-pre-wrap break-words">
          {data.content || '—'}
        </div>
        {data.buttons.length === 0 ? (
          <div className="mt-1 text-xs text-[#636466]">{t('button.none')}</div>
        ) : (
          data.buttons.map((button, index) => (
            <div key={index} className="mt-1 text-xs text-[#636466]">
              {t('summary.button', {
                label: button.label,
                target: describeButtonTarget(button, cores, t),
              })}
            </div>
          ))
        )}
        {data.abTest ? (
          <div className="mt-1 text-xs text-[#636466]">
            {t('summary.abTest', { percent: data.abTest.splitB })}
          </div>
        ) : null}
      </Descriptions.Item>
      <Descriptions.Item label={t('summary.offer')}>
        {offerText(data.offer, t) ?? t('wizard.noOfferShort')}
        {data.offer?.appliesTo ? ` · ${data.offer.appliesTo}` : ''}
      </Descriptions.Item>
    </Descriptions>
  );
}
