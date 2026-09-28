import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, List, Popover, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export interface PortalNotificationItem {
  id: string;
  title: string;
  createdAtLabel: string;
}

export interface PortalNotificationBellProps {
  notifications: readonly PortalNotificationItem[];
}

export function PortalNotificationBell({
  notifications,
}: PortalNotificationBellProps) {
  const { t } = useTranslation('common');
  const hasUnread = notifications.length > 0;

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title={
        <Typography.Text strong>
          {t('globalSearch.notifications.title')}
        </Typography.Text>
      }
      content={
        <div className="w-72">
          {notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('globalSearch.notifications.empty')}
            />
          ) : (
            <List
              size="small"
              dataSource={[...notifications]}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={item.title}
                    description={item.createdAtLabel}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      }
    >
      <Button
        type="text"
        aria-label={t('globalSearch.notifications.title')}
        icon={
          <Badge dot={hasUnread} offset={[-2, 2]}>
            <BellOutlined className="text-lg" />
          </Badge>
        }
      />
    </Popover>
  );
}
