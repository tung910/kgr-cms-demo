import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalPageHeader } from '@/shared/components/portal';
import { randomId } from '@/shared/lib/id';

import { createServicePackage } from '../api/servicePackageApi';
import { ServicePackageForm } from '../components/ServicePackageForm';
import { servicePackageQueries } from '../queries/servicePackageQueries';

export function ServicePackageCreatePage() {
  const { t } = useTranslation('servicePackages');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // One key for the whole "create this draft" attempt (spec §11: the client
  // keeps the same key until it succeeds or a different operation starts).
  // This page is a single-attempt form — there's no separate "open" event —
  // so the key is minted once, lazily, on first render and reused across a
  // validation-failure-then-resubmit (review() rejects, user fixes a field)
  // and a genuine network retry (user clicks "Save draft" again after a
  // timeout). A fresh key is only needed after success, and by then
  // `onCancel()` below has already navigated away and unmounted this page.
  const idempotencyKeyRef = useRef<string | null>(null);
  if (idempotencyKeyRef.current === null) {
    idempotencyKeyRef.current = randomId();
  }
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createServicePackage>[0]) =>
      createServicePackage(input, {
        idempotencyKey: idempotencyKeyRef.current!,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: servicePackageQueries.all,
      });
      void message.success(t('form.success'));
    },
    onError: () => {
      void message.error(t('errors.createError'));
    },
  });
  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('form.title')}
        description={t('create.description')}
      />
      <ServicePackageForm
        isSubmitting={mutation.isPending}
        onSubmit={async (input) => {
          await mutation.mutateAsync(input);
        }}
        onCancel={() =>
          void navigate({
            to: '/service-packages',
            search: { search: '', page: 1, pageSize: 10 },
          })
        }
      />
    </div>
  );
}
