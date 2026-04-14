import { Button, Space, Popconfirm, Badge, Modal, Input, message } from 'antd';
import {
  ThunderboltOutlined, SaveOutlined, ShareAltOutlined, ClearOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { Stop, RouteResult, HomeBase } from '@/types/route';

interface Props {
  stops: Stop[];
  routeResult: RouteResult | null;
  homeBase: HomeBase | null;
  optimizing: boolean;
  isOptimized: boolean;
  onOptimize: () => void;
  onClear: () => void;
  onSave: (name: string) => void;
  onTryDemo: () => void;
}

export default function RouteActions({
  stops, routeResult, homeBase, optimizing, isOptimized,
  onOptimize, onClear, onSave, onTryDemo,
}: Props) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');

  const handleShare = () => {
    if (!routeResult) return;
    const lines = stops.map((s, i) => `${i + 1}. ${s.address}${s.label ? ` (${s.label})` : ''}`);
    const text = `Route: ${stops.length} stops | ${routeResult.totalDistance} mi | ~${routeResult.totalDuration} min\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => message.success('Copied to clipboard'));
  };

  const handleSave = () => {
    onSave(routeName || `Route ${new Date().toLocaleDateString()}`);
    setSaveModalOpen(false);
    setRouteName('');
  };

  const showOptimizeBadge = stops.length >= 3 && !isOptimized;

  return (
    <>
      <Space wrap className="mt-3">
        <Badge dot={showOptimizeBadge}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={optimizing}
            disabled={stops.length < 2 || !homeBase}
            onClick={onOptimize}
          >
            Optimize Route
          </Button>
        </Badge>
        <Button icon={<SaveOutlined />} disabled={!routeResult} onClick={() => setSaveModalOpen(true)}>
          Save
        </Button>
        <Button icon={<ShareAltOutlined />} disabled={!routeResult} onClick={handleShare}>
          Share
        </Button>
        <Popconfirm title="Clear all stops?" onConfirm={onClear} disabled={stops.length === 0}>
          <Button icon={<ClearOutlined />} disabled={stops.length === 0}>Clear</Button>
        </Popconfirm>
        {stops.length === 0 && (
          <Button type="dashed" icon={<ExperimentOutlined />} onClick={onTryDemo}>
            Try Demo
          </Button>
        )}
      </Space>

      <Modal
        title="Save Route"
        open={saveModalOpen}
        onOk={handleSave}
        onCancel={() => setSaveModalOpen(false)}
        okText="Save"
      >
        <Input
          placeholder="Route name (optional)"
          value={routeName}
          onChange={e => setRouteName(e.target.value)}
        />
      </Modal>
    </>
  );
}
