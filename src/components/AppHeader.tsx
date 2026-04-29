import { Typography, Button, Space } from 'antd';
import { SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import { ShareAppButton } from '@/components/opsette-share';

interface AppHeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

function AppLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 512 512" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="headerBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#headerBg)" />
      <path
        d="M 128 369 Q 153 230, 256 215 T 384 153"
        fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="18" strokeLinecap="round"
      />
      <g transform="translate(256, 215)">
        <ellipse cx="0" cy="113" rx="41" ry="13" fill="black" opacity="0.15" />
        <path
          d="M 0 102 C -20 61, -77 31, -77 -20
             C -77 -74, -42 -115, 0 -115
             C 42 -115, 77 -74, 77 -20
             C 77 31, 20 61, 0 102 Z"
          fill="white"
        />
        <circle cx="0" cy="-20" r="33" fill="url(#headerBg)" />
        <circle cx="-15" cy="-46" r="13" fill="white" opacity="0.5" />
      </g>
      <circle cx="128" cy="369" r="18" fill="white" opacity="0.9" />
      <circle cx="384" cy="153" r="18" fill="white" opacity="0.9" />
      <circle cx="179" cy="266" r="8" fill="white" opacity="0.5" />
      <circle cx="317" cy="194" r="8" fill="white" opacity="0.5" />
    </svg>
  );
}

export default function AppHeader({ onOpenSettings, onOpenHistory }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <Space>
        <AppLogo />
        <Typography.Title level={4} style={{ margin: 0 }}>Route Planner</Typography.Title>
      </Space>
      <Space>
        <ShareAppButton size={32} />
        <Button type="text" shape="circle" icon={<HistoryOutlined />} onClick={onOpenHistory} />
        <Button type="text" shape="circle" icon={<SettingOutlined />} onClick={onOpenSettings} />
      </Space>
    </div>
  );
}
