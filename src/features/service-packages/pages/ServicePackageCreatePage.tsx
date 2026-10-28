import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

import { PortalPageHeader } from '@/shared/components/portal';

import { createServicePackage } from '../api/servicePackageApi';
import { ServicePackageForm } from '../components/ServicePackageForm';
import { servicePackageQueries } from '../queries/servicePackageQueries';

export function ServicePackageCreatePage() {
  const { t } = useTranslation('servicePackages');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createServicePackage>[0]) =>
      // A fresh key per submit attempt: every click of "Save draft" is its
      // own idempotent operation (spec §11).
      createServicePackage(input, { idempotencyKey: crypto.randomUUID() }),
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
