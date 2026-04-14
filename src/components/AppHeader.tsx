import { Typography, Button, Space } from 'antd';
import { SettingOutlined, HistoryOutlined, EnvironmentOutlined } from '@ant-design/icons';

interface AppHeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export default function AppHeader({ onOpenSettings, onOpenHistory }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <Space>
        <EnvironmentOutlined style={{ fontSize: 22, color: '#2563EB' }} />
        <Typography.Title level={4} style={{ margin: 0 }}>Route Planner</Typography.Title>
      </Space>
      <Space>
        <Button type="text" shape="circle" icon={<HistoryOutlined />} onClick={onOpenHistory} />
        <Button type="text" shape="circle" icon={<SettingOutlined />} onClick={onOpenSettings} />
      </Space>
    </div>
  );
}
