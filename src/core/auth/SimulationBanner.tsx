import { Alert, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from './useAuth';

export function SimulationBanner() {
  const { t } = useTranslation('common');
  const { session, simulate } = useAuth();

  if (!session?.simulatedFrom) return null;

  return (
    <Alert
      banner
      type="warning"
      className="sticky top-0 z-20"
      message={t('simulation.banner', { role: session.roleName })}
      action={
        <Button
          size="small"
          onClick={() =>
            void simulate(null).catch(() =>
              message.error(t('simulation.exitError'))
            )
          }
        >
          {t('simulation.exit')}
        </Button>
      }
    />
  );
}
