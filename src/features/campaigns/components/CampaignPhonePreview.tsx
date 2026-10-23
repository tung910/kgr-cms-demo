import { WifiOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { DisplayType } from '../constants/campaignEnums';
import {
  PERSONALIZATION_VARIABLES,
  personalize,
} from '../constants/campaignCta';

export interface CampaignPhonePreviewProps {
  displayType: DisplayType;
  title: string;
  content: string;
  buttonLabels: string[];
  offerLabel: string | null;
}

// Live mock of how the notification looks in the OneKangaroo app, rendered from
// the wizard values. Personalisation tokens show sample values (spec 7.1).
export function CampaignPhonePreview({
  displayType,
  title,
  content,
  buttonLabels,
  offerLabel,
}: CampaignPhonePreviewProps) {
  const { t } = useTranslation('campaigns');
  const shownTitle = personalize(title) || t('preview.emptyTitle');
  const shownContent = personalize(content) || t('preview.emptyContent');

  const card = (
    <>
      <strong className="block break-words text-sm">{shownTitle}</strong>
      <p className="mb-0 mt-1 whitespace-pre-wrap break-words text-xs">
        {shownContent}
      </p>
      {offerLabel ? (
        <span className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
          {offerLabel}
        </span>
      ) : null}
      {buttonLabels.map((label, index) => (
        <span
          key={index}
          className={`mt-3 block rounded-lg py-1.5 text-center text-xs font-medium ${
            index === 0
              ? 'bg-emerald-700 text-white'
              : 'border border-emerald-700 bg-white text-emerald-700'
          }`}
        >
          {label}
        </span>
      ))}
    </>
  );

  return (
    <section aria-label={t('preview.title')} className="min-w-0">
      <div className="mb-2 text-sm font-medium">{t('preview.title')}</div>
      <div className="mx-auto w-full max-w-[290px] overflow-hidden rounded-[32px] border-[6px] border-slate-900 bg-slate-100 shadow-xl">
        <div className="flex items-center justify-between bg-white px-5 py-2 text-xs">
          <span>9:41</span>
          <div
            aria-hidden="true"
            className="h-3.5 w-16 rounded-full bg-slate-900"
          />
          <WifiOutlined aria-hidden="true" />
        </div>
        <div className="relative min-h-[340px] p-3" aria-live="polite">
          <div className="mb-3 text-base font-bold text-emerald-700">
            OneKangaroo
          </div>
          {displayType === 'push' ? (
            <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-md">
              <span className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>OneKangaroo</span>
                <span>{t('preview.now')}</span>
              </span>
              {card}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-2.5 rounded bg-slate-200" />
              <div className="h-2.5 w-2/3 rounded bg-slate-200" />
              <div className="h-2.5 rounded bg-slate-200" />
              {displayType === 'banner' ? (
                <div className="absolute inset-x-3 top-12 rounded-xl bg-emerald-800 p-3 text-white shadow-lg [&_span]:text-white">
                  {card}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full rounded-2xl bg-white p-4 text-center text-slate-900">
                    {card}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-[#636466]">
        {t('preview.sample', {
          values: PERSONALIZATION_VARIABLES.map(
            (item) => `${item.token}=${item.sample}`
          ).join(' · '),
        })}
      </p>
    </section>
  );
}
