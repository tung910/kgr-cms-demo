import { useState, type ReactNode } from 'react';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Button, Descriptions, Empty, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PortalCard, PortalPageHeader } from '@/shared/components/portal';
import { formatDate } from '@/shared/lib/format';

import { CampaignApprovalActions } from '../components/CampaignApprovalActions';
import { CampaignAuditPanel } from '../components/CampaignAuditPanel';
import { CampaignMetricsPanel } from '../components/CampaignMetricsPanel';
import { CampaignStatusTag } from '../components/CampaignStatusTag';
import { CampaignWizard } from '../components/CampaignWizard';
import { TestSendDialog } from '../components/TestSendDialog';
import { campaignQueries } from '../queries/campaignQueries';
import type { AudienceConditions } from '../schemas/audienceSchemas';

export interface CampaignDetailPageProps {
  campaignId: string;
}

function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PortalCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold text-[#020204]">{title}</h2>
        {extra}
      </div>
      {children}
    </PortalCard>
  );
}

function rangeText(range?: { min?: number; max?: number }): string | null {
  if (!range) return null;
  if (range.min != null && range.max != null)
    return `${range.min} – ${range.max}`;
  if (range.min != null) return `≥ ${range.min}`;
  if (range.max != null) return `≤ ${range.max}`;
  return null;
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const { t } = useTranslation('campaigns');
  const navigate = useNavigate();
  const { data: campaign } = useSuspenseQuery(
    campaignQueries.detail(campaignId)
  );
  const [editOpen, setEditOpen] = useState(false);

  const editable = campaign.status !== 'ended';
  const showMetrics =
    campaign.status === 'running' ||
    campaign.status === 'paused' ||
    campaign.status === 'ended' ||
    campaign.status === 'pending_approval';

  const audience = campaign.audience;
  const audienceRows = buildAudienceRows(audience, t);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={campaign.name}
        description={`${campaign.id} · ${t(`kind.${campaign.kind}`)} · ${t(
          `channel.${campaign.channel}`
        )}`}
        actions={
          <Space wrap>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() =>
                void navigate({
                  to: '/campaigns',
                  search: { search: '', page: 1, pageSize: 10 },
                })
              }
            >
              {t('detail.back')}
            </Button>
            {editable ? (
              <PermissionGuard capability="campaign.write">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditOpen(true)}
                >
                  {t('detail.edit')}
                </Button>
              </PermissionGuard>
            ) : null}
            {campaign.status !== 'ended' ? (
              <PermissionGuard capability="campaign.write">
                <TestSendDialog campaign={campaign} />
              </PermissionGuard>
            ) : null}
            <CampaignApprovalActions campaign={campaign} />
          </Space>
        }
      />

      <Section
        title={t('detail.sections.overview')}
        extra={<CampaignStatusTag status={campaign.status} />}
      >
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label={t('fields.priority')}>
            {campaign.priority}
          </Descriptions.Item>
          <Descriptions.Item label={t('fields.tenant')}>
            {t(`tenant.${campaign.tenantId}`)}
          </Descriptions.Item>
          <Descriptions.Item label={t('fields.contentVi')} span={2}>
            {campaign.contentVi}
          </Descriptions.Item>
          {campaign.contentEn ? (
            <Descriptions.Item label={t('fields.contentEn')} span={2}>
              {campaign.contentEn}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item label={t('fields.scheduleType')}>
            {campaign.kind === 'trigger'
              ? t('wizard.triggerAlways')
              : t(`schedule.${campaign.scheduleType}`)}
          </Descriptions.Item>
          <Descriptions.Item label={t('fields.runWindow')}>
            {campaign.startsAt && campaign.endsAt
              ? `${formatDate(campaign.startsAt)} – ${formatDate(
                  campaign.endsAt
                )}`
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('fields.deeplink')}>
            {campaign.deeplink ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label={t('fields.frequencyCap')}>
            {t('detail.frequencyCapValue', {
              count: campaign.frequencyCapPerCustomer,
            })}
          </Descriptions.Item>
        </Descriptions>
      </Section>

      <Section
        title={t('detail.sections.audience')}
        extra={
          <Tag color="blue">
            {campaign.audienceCount === null
              ? t('detail.notPreviewed')
              : t('wizard.previewResult', { count: campaign.audienceCount })}
          </Tag>
        }
      >
        {audienceRows.length === 0 ? (
          <span className="text-sm text-[#636466]">
            {t('detail.allCustomers')}
          </span>
        ) : (
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            {audienceRows.map((row) => (
              <Descriptions.Item key={row.label} label={row.label}>
                {row.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Section>

      <Section
        title={
          campaign.kind === 'trigger'
            ? t('detail.sections.trigger')
            : t('detail.sections.offer')
        }
      >
        {campaign.kind === 'trigger' && campaign.triggerPreset ? (
          <p className="mb-4 text-sm">
            <Tag color="purple">{t(`trigger.${campaign.triggerPreset}`)}</Tag>
            <span className="text-[#636466]">
              {t(`trigger.hint.${campaign.triggerPreset}`)}
            </span>
          </p>
        ) : null}
        {campaign.offer ? (
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label={t('fields.offerType')}>
              {t(`offer.type.${campaign.offer.type}`)}
            </Descriptions.Item>
            {campaign.offer.type === 'voucher' ? (
              <>
                <Descriptions.Item label={t('fields.codeMode')}>
                  {t(
                    `offer.codeMode.${campaign.offer.codeMode ?? 'per_customer'}`
                  )}
                </Descriptions.Item>
                <Descriptions.Item label={t('fields.voucherCode')}>
                  {campaign.offer.voucherCode ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label={t('fields.discountValue')}>
                  {campaign.offer.discountValue != null
                    ? campaign.offer.discountType === 'percent'
                      ? `${campaign.offer.discountValue}%`
                      : `${campaign.offer.discountValue}`
                    : '—'}
                </Descriptions.Item>
              </>
            ) : (
              <Descriptions.Item label={t('fields.points')}>
                {campaign.offer.points ?? '—'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('fields.usageLimitPerCustomer')}>
              {campaign.offer.usageLimitPerCustomer ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('fields.validUntil')}>
              {campaign.offer.validUntil
                ? formatDate(campaign.offer.validUntil)
                : '—'}
            </Descriptions.Item>
          </Descriptions>
        ) : campaign.kind !== 'trigger' ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('wizard.noOffer')}
          />
        ) : null}
      </Section>

      {showMetrics ? (
        <Section title={t('detail.sections.metrics')}>
          <CampaignMetricsPanel campaign={campaign} />
        </Section>
      ) : null}

      <Section title={t('detail.sections.history')}>
        <CampaignAuditPanel campaign={campaign} />
      </Section>

      {editable ? (
        <CampaignWizard
          open={editOpen}
          campaign={campaign}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}

function buildAudienceRows(
  audience: AudienceConditions,
  t: (key: string, options?: Record<string, unknown>) => string
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (audience.regions.length) {
    rows.push({
      label: t('fields.regions'),
      value: audience.regions.join(', '),
    });
  }
  if (audience.models.length) {
    rows.push({ label: t('fields.models'), value: audience.models.join(', ') });
  }
  if (audience.firmwareVersions.length) {
    rows.push({
      label: t('fields.firmwareVersions'),
      value: audience.firmwareVersions.join(', '),
    });
  }
  if (audience.warrantyStatuses.length) {
    rows.push({
      label: t('fields.warrantyStatuses'),
      value: audience.warrantyStatuses
        .map((status) => t(`warranty.${status}`))
        .join(', '),
    });
  }
  if (audience.connectivities.length) {
    rows.push({
      label: t('fields.connectivities'),
      value: audience.connectivities
        .map((value) => t(`productConnectivity.${value}`, { ns: 'common' }))
        .join(', '),
    });
  }
  const ranges: Array<[string, { min?: number; max?: number } | undefined]> = [
    [t('fields.coreRemainingDays'), audience.coreRemainingDays],
    [t('fields.loyaltyPoints'), audience.loyaltyPoints],
    [t('fields.regionTds'), audience.regionTds],
    [t('fields.tenureDays'), audience.tenureDays],
  ];
  for (const [label, range] of ranges) {
    const text = rangeText(range);
    if (text) rows.push({ label, value: text });
  }
  return rows;
}
