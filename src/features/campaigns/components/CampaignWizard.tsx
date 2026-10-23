import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Form, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { PortalCard } from '@/shared/components/portal';
import { referenceColors } from '@/theme/tokens';

import {
  createCampaign,
  previewAudience,
  testSendCampaign,
  transitionCampaign,
  updateCampaign,
} from '../api/campaignApi';
import type { AudiencePreview } from '../schemas/audienceSchemas';
import { campaignQueries } from '../queries/campaignQueries';
import { suggestButtonLabel } from '../utils/buttonText';
import type { Campaign } from '../schemas/campaignSchemas';
import { CampaignPhonePreview } from './CampaignPhonePreview';
import { offerText } from '../utils/offerText';
import { StepAudience } from './wizard/StepAudience';
import { StepInfo, StepMechanism, StepType } from './wizard/StepBasics';
import { StepContent, StepOffer } from './wizard/StepContentOffer';
import { StepReview } from './wizard/StepReview';
import {
  buildAudienceDefinition,
  buildButtons,
  buildDraftInput,
  buildOffer,
  DEFAULT_WIZARD_VALUES,
  fromCampaign,
  type ButtonValues,
  type WizardValues,
} from './wizard/wizardValues';

type StepKey =
  'type' | 'info' | 'mechanism' | 'audience' | 'content' | 'offer' | 'review';

// `fields` are the form names each step owns, used to validate before moving
// on and to jump to the first step with an error on submit.
const STEPS: ReadonlyArray<{
  key: StepKey;
  fields: ReadonlyArray<keyof WizardValues>;
}> = [
  { key: 'type', fields: ['kind'] },
  { key: 'info', fields: ['name', 'displayType', 'notificationGroup'] },
  {
    key: 'mechanism',
    fields: [
      'scheduleType',
      'scheduledAt',
      'triggerPreset',
      'coreDays',
      'cooldownDays',
      'maxSends',
      'quietFrom',
      'quietTo',
    ],
  },
  { key: 'audience', fields: ['dedupe'] },
  {
    key: 'content',
    fields: ['title', 'content', 'buttons', 'titleB', 'bodyB'],
  },
  {
    key: 'offer',
    fields: [
      'offerKind',
      'voucherCode',
      'discountValue',
      'points',
      'usageLimitTotal',
    ],
  },
  { key: 'review', fields: ['approverId'] },
];

export interface CampaignWizardProps {
  campaign?: Campaign;
}

export function CampaignWizard({ campaign }: CampaignWizardProps) {
  const { t } = useTranslation('campaigns');
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<WizardValues>();
  const cores = useQuery(campaignQueries.coreOptions());
  const coreOptions = cores.data ?? [];
  const labelFor = (button: ButtonValues) =>
    suggestButtonLabel(button, coreOptions, t);

  // The offer step only exists for roles allowed to attach vouchers (7.4).
  const canOffer =
    !!session && hasCapability(session.role, 'campaign.voucher.create');
  const steps = STEPS.filter((step) => step.key !== 'offer' || canOffer);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex] ?? steps[0]!;
  const isLast = stepIndex === steps.length - 1;

  const initial = useMemo(
    () => (campaign ? fromCampaign(campaign) : DEFAULT_WIZARD_VALUES),
    [campaign]
  );
  const watched = Form.useWatch([], form);
  const values: WizardValues = { ...initial, ...watched };

  // ---- reach preview (B3) --------------------------------------------------
  const definition = buildAudienceDefinition(values);
  const definitionKey = JSON.stringify(definition);
  const definitionRef = useRef(definition);
  useEffect(() => {
    definitionRef.current = definition;
  });
  const [preview, setPreview] = useState<{
    key: string;
    data: AudiencePreview;
  } | null>(null);
  const previewMutation = useMutation({
    mutationFn: ({
      definition: next,
    }: {
      definition: typeof definition;
      key: string;
    }) => previewAudience(next),
    onSuccess: (data, variables) => setPreview({ key: variables.key, data }),
  });
  const { mutate: runPreview } = previewMutation;
  const previewFresh = preview?.key === definitionKey;
  const onAudienceStep = step.key === 'audience';

  useEffect(() => {
    if (!onAudienceStep || previewFresh) return;
    const timer = window.setTimeout(
      () =>
        runPreview({ definition: definitionRef.current, key: definitionKey }),
      400
    );
    return () => window.clearTimeout(timer);
  }, [onAudienceStep, previewFresh, definitionKey, runPreview]);

  const audienceCount = previewFresh
    ? (preview?.data.matched ?? null)
    : (preview?.data.matched ?? campaign?.audienceCount ?? null);

  // ---- save / submit -------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const merged: WizardValues = {
        ...initial,
        ...form.getFieldsValue(true),
      };
      const reason = t(
        submit
          ? 'wizard.reason.submit'
          : campaign
            ? 'wizard.reason.update'
            : 'wizard.reason.create'
      );
      const input = buildDraftInput(merged, audienceCount, reason, labelFor);
      const saved = campaign
        ? await updateCampaign(campaign.id, input)
        : await createCampaign(input);
      if (submit)
        return transitionCampaign(saved.id, {
          action: 'submit',
          reason,
          approverId: merged.approverId,
        });
      return saved;
    },
    onSuccess: (saved, submit) => {
      void message.success(
        submit ? t('wizard.submitted') : t('wizard.savedDraft')
      );
      void queryClient.invalidateQueries({ queryKey: campaignQueries.all });
      void navigate({
        to: '/campaigns/$campaignId',
        params: { campaignId: saved.id },
      });
    },
    onError: (error: Error) =>
      void message.error(error.message || t('errors.saveFailed')),
  });

  const testSendMutation = useMutation({
    mutationFn: (recipients: string[]) =>
      testSendCampaign({
        recipients,
        title: values.title,
        content: values.content,
      }),
    onSuccess: () => void message.success(t('wizard.testSent')),
    onError: () => void message.error(t('wizard.testFailed')),
  });

  const goToErrorStep = () => {
    const firstError = form
      .getFieldsError()
      .find((entry) => entry.errors.length > 0);
    const name = firstError?.name[0];
    const index = steps.findIndex((item) =>
      item.fields.some((field) => field === name)
    );
    if (index >= 0) setStepIndex(index);
  };

  const saveDraft = async () => {
    try {
      await form.validateFields(['name']);
    } catch {
      setStepIndex(steps.findIndex((item) => item.key === 'info'));
      return;
    }
    saveMutation.mutate(false);
  };

  const submit = async () => {
    try {
      await form.validateFields();
    } catch {
      goToErrorStep();
      return;
    }
    if (preview === null && campaign?.audienceCount == null) {
      void message.warning(t('wizard.previewRequired'));
      setStepIndex(steps.findIndex((item) => item.key === 'audience'));
      return;
    }
    saveMutation.mutate(true);
  };

  const next = async () => {
    try {
      await form.validateFields([...step.fields]);
    } catch {
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  // ---- render --------------------------------------------------------------
  const draft = buildDraftInput(values, audienceCount, '', labelFor);
  const stepBody: Record<StepKey, ReactNode> = {
    type: <StepType />,
    info: <StepInfo />,
    mechanism: <StepMechanism />,
    audience: (
      <StepAudience
        preview={{
          loading: previewMutation.isPending,
          failed: previewMutation.isError,
          data: previewFresh ? (preview?.data ?? null) : null,
          onRefresh: () =>
            runPreview({
              definition: definitionRef.current,
              key: definitionKey,
            }),
        }}
      />
    ),
    content: <StepContent />,
    offer: <StepOffer />,
    review: (
      <StepReview
        draft={draft}
        cores={coreOptions}
        testSending={testSendMutation.isPending}
        onTestSend={(recipients) => testSendMutation.mutate(recipients)}
      />
    ),
  };

  const busy = saveMutation.isPending;
  const nextBlocked = onAudienceStep && !previewFresh;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <PortalCard>
          <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
            {steps.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  aria-current={index === stepIndex ? 'step' : undefined}
                  onClick={() => setStepIndex(index)}
                  style={
                    index <= stepIndex
                      ? {
                          borderColor: referenceColors.primary,
                          color:
                            index === stepIndex
                              ? '#fff'
                              : referenceColors.primary,
                          backgroundColor:
                            index === stepIndex
                              ? referenceColors.primary
                              : '#fff',
                        }
                      : undefined
                  }
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    index > stepIndex
                      ? 'border-[#D5D7D8] bg-white text-[#636466]'
                      : ''
                  }`}
                >
                  {index + 1}. {t(`steps.${item.key}.title`)}
                </button>
              </li>
            ))}
          </ol>
        </PortalCard>
        <PortalCard title={t(`steps.${step.key}.title`)}>
          <Form<WizardValues>
            form={form}
            layout="vertical"
            initialValues={initial}
          >
            {steps.map((item) => (
              <div
                key={item.key}
                className={item.key === step.key ? '' : 'hidden'}
              >
                {stepBody[item.key]}
              </div>
            ))}
          </Form>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E8E9] pt-4">
            <Button
              disabled={stepIndex === 0 || busy}
              onClick={() => setStepIndex((index) => index - 1)}
            >
              {t('wizard.back')}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void saveDraft()}>
                {t('wizard.saveDraft')}
              </Button>
              {isLast ? (
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() => void submit()}
                >
                  {t('wizard.submit')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  disabled={nextBlocked}
                  onClick={() => void next()}
                >
                  {t('wizard.next')}
                </Button>
              )}
            </div>
          </div>
        </PortalCard>
      </div>
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <PortalCard>
          <CampaignPhonePreview
            displayType={values.displayType}
            title={values.title ?? ''}
            content={values.content ?? ''}
            buttonLabels={buildButtons(values, labelFor).map(
              (button) => button.label
            )}
            offerLabel={offerText(buildOffer(values), t)}
          />
        </PortalCard>
      </aside>
    </div>
  );
}
