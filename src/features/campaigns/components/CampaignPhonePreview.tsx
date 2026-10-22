import { useState } from 'react';
import { BellOutlined, WifiOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  APP_DEEPLINK_TARGETS,
  isDeviceScopedDeeplink,
} from '../constants/deeplinkTargets';
import { effectiveOffer } from '../constants/triggerOffers';
import type { Campaign } from '../schemas/campaignSchemas';

export function CampaignPhonePreview({
  campaign,
  received,
  language,
  onLanguageChange,
}: {
  campaign: Campaign;
  received: boolean;
  language: string;
  onLanguageChange: (language: string) => void;
}) {
  const { t } = useTranslation('campaigns');
  const [opened, setOpened] = useState(false);
  const [targetOpened, setTargetOpened] = useState(false);
  const content =
    language === 'en' && campaign.contentEn
      ? campaign.contentEn
      : campaign.contentVi;
  const target = APP_DEEPLINK_TARGETS.find(
    (item) => item.value === campaign.deeplink
  );
  const secondaryTarget = APP_DEEPLINK_TARGETS.find(
    (item) => item.value === campaign.secondaryDeeplink
  );
  const deviceScoped =
    isDeviceScopedDeeplink(campaign.deeplink) ||
    isDeviceScopedDeeplink(campaign.secondaryDeeplink);
  // What actually ships: the author's offer, or the trigger's automatic upsell.
  const { offer, auto: autoOffer } = effectiveOffer(campaign);

  return (
    <section aria-label={t('phonePreview.title')} className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('phonePreview.title')}</span>
        <Select
          aria-label={t('phonePreview.language')}
          value={language}
          onChange={onLanguageChange}
          options={[
            { value: 'vi', label: t('phonePreview.vi') },
            { value: 'en', label: t('phonePreview.en') },
          ]}
        />
      </div>
      <div className="mx-auto w-full max-w-[310px] overflow-hidden rounded-[36px] border-[7px] border-slate-900 bg-slate-100 shadow-xl">
        <div className="flex items-center justify-between bg-white px-5 py-3 text-xs">
          <span>9:41</span>
          <div
            aria-hidden="true"
            className="h-4 w-20 rounded-full bg-slate-900"
          />
          <WifiOutlined aria-hidden="true" />
        </div>
        <div className="min-h-[410px] p-4" aria-live="polite">
          <div className="mb-6 text-lg font-bold text-emerald-700">
            OneKangaroo
          </div>
          {!received ? (
            <div className="mt-20 text-center text-sm text-slate-500">
              <BellOutlined className="mb-3 text-3xl" />
              <p>{t('phonePreview.waiting')}</p>
            </div>
          ) : campaign.channel === 'push' && !opened ? (
            <button
              type="button"
              onClick={() => setOpened(true)}
              className="w-full cursor-pointer rounded-2xl border border-white bg-white/90 p-4 text-left shadow-md focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              <span className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>OneKangaroo</span>
                <span>{t('phonePreview.now')}</span>
              </span>
              <strong className="block break-words">{campaign.name}</strong>
              <p className="mb-0 mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm">
                {content}
              </p>
              <span className="mt-3 block text-xs text-emerald-700">
                {t('phonePreview.tap')}
              </span>
            </button>
          ) : (
            <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {campaign.imageUrl ? (
                <img
                  src={campaign.imageUrl}
                  alt={campaign.name}
                  className="max-h-44 w-full object-cover"
                />
              ) : null}
              <div className="space-y-3 p-4">
                <h3 className="m-0 break-words text-base font-semibold">
                  {campaign.name}
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {content}
                </p>
                {offer ? (
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                    {autoOffer ? (
                      <p className="mb-1 text-xs font-medium text-emerald-700">
                        {t('offer.autoUpsellBadge')}
                      </p>
                    ) : null}
                    {offer.type === 'loyalty_points' ? (
                      t('phonePreview.points', {
                        count: offer.points ?? 0,
                      })
                    ) : (
                      <>
                        <strong>{t('offer.type.voucher')}</strong>
                        <p className="mb-0 break-words">
                          {offer.codeMode === 'shared'
                            ? offer.voucherCode
                            : t('phonePreview.personalCode')}
                        </p>
                      </>
                    )}
                  </div>
                ) : null}
                {target ? (
                  <Button
                    block
                    type="primary"
                    onClick={() => setTargetOpened(true)}
                  >
                    {t(target.labelKey)}
                  </Button>
                ) : null}
                {secondaryTarget ? (
                  <Button block onClick={() => setTargetOpened(true)}>
                    {t(secondaryTarget.labelKey)}
                  </Button>
                ) : null}
                {targetOpened && target ? (
                  <p role="status" className="text-xs text-slate-500">
                    {t('phonePreview.target', { screen: t(target.labelKey) })}
                  </p>
                ) : null}
                {deviceScoped ? (
                  <p className="text-xs text-slate-500">
                    {t('phonePreview.deviceScoped', {
                      deeplink: `${campaign.deeplink}?device=…`,
                    })}
                  </p>
                ) : null}
              </div>
            </article>
          )}
        </div>
        <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-slate-900" />
      </div>
      <p className="mt-3 text-center text-xs text-[#636466]">
        {t('phonePreview.disclaimer')}
      </p>
    </section>
  );
}
