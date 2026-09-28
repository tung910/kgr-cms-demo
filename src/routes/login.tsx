/* eslint-disable react-refresh/only-export-components */

import { LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Spin, Typography } from 'antd';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { router } from '@/app/router/router';
import { ApiError, getApiErrorCode } from '@/core/api/error';
import { env } from '@/core/config/env';
import { useAuth } from '@/core/auth/useAuth';

interface DemoAccount {
  phone: string;
  role: string;
  label?: string | undefined;
}

interface FormValues {
  phone: string;
  password: string;
}

function safeRedirect(redirect: string | undefined): string {
  return redirect?.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/';
}

function LoginPage() {
  const { status, signIn } = useAuth();
  const { t } = useTranslation('common');
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [demo, setDemo] = useState<{
    accounts: DemoAccount[];
    password: string;
  } | null>(null);
  const [postSignInRedirect, setPostSignInRedirect] = useState<string | null>(
    null
  );
  const navigationStarted = useRef(false);

  // Seeded accounts are offered only against the MSW mock backend in dev.
  useEffect(() => {
    if (!import.meta.env.DEV || !env.enableMocks) return;
    void import('@/features/system/mocks/systemFixtures').then((fixtures) =>
      setDemo({
        accounts: fixtures.demoMemberSeeds.map((seed) => ({
          phone: seed.phone,
          role: seed.roleId,
          label: seed.demoLabel,
        })),
        password: fixtures.mockPassword,
      })
    );
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || navigationStarted.current) return;

    navigationStarted.current = true;
    const destination = postSignInRedirect ?? '/';

    void router.invalidate().then(() => navigate({ to: destination as '/' }));
  }, [navigate, postSignInRedirect, status]);

  if (status === 'loading') {
    return (
      <Spin
        className="flex min-h-screen items-center justify-center"
        size="large"
      />
    );
  }

  const handleSubmit = async (values: FormValues) => {
    setErrorText(null);
    setPostSignInRedirect(safeRedirect(redirect));
    setSubmitting(true);
    try {
      await signIn({ phone: values.phone.trim(), password: values.password });
    } catch (error) {
      const code = getApiErrorCode(error);
      // Wrong phone and wrong password share one message on purpose.
      setErrorText(
        code === 'account_locked' || code === 'attempts_locked'
          ? t(`login.errors.${code}`, {
              minutes: error instanceof ApiError ? error.message : '',
            })
          : t(
              code === 'invalid_credentials'
                ? 'login.errors.invalid_credentials'
                : 'login.errors.generic'
            )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="mb-6 text-center">
          <Typography.Title level={2}>KGR CMS Portal</Typography.Title>
          <Typography.Text type="secondary">
            {t('login.subtitle')}
          </Typography.Text>
        </div>
        {errorText ? (
          <Alert type="error" showIcon className="mb-4" message={errorText} />
        ) : null}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="phone"
            label={t('login.phone')}
            rules={[{ required: true }]}
          >
            <Input
              size="large"
              inputMode="tel"
              autoComplete="username"
              prefix={<PhoneOutlined />}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('login.password')}
            rules={[{ required: true }]}
          >
            <Input.Password
              size="large"
              autoComplete="current-password"
              prefix={<LockOutlined />}
            />
          </Form.Item>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
          >
            {t('login.submit')}
          </Button>
        </Form>
        {demo ? (
          <div className="mt-6 border-t border-[#E7E8E9] pt-4">
            <Typography.Text type="secondary">
              {t('login.demoHint')}
            </Typography.Text>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {demo.accounts.map((account) => (
                <Button
                  key={account.phone}
                  size="small"
                  onClick={() =>
                    form.setFieldsValue({
                      phone: account.phone,
                      password: demo.password,
                    })
                  }
                >
                  {account.label ?? t(`roles.${account.role}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});
