import { Button, Space, Popconfirm, Badge, Modal, Input, Dropdown, message } from 'antd';
import {
  ThunderboltOutlined, SaveOutlined, ShareAltOutlined, ClearOutlined, ExperimentOutlined,
  DownloadOutlined, CompassOutlined, PrinterOutlined, CopyOutlined, DownOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import type { Stop, RouteResult, HomeBase } from '@/types/route';
import { buildGoogleMapsRoute } from '@/lib/mapsLink';
import { printRouteSheet } from '@/lib/printRoute';

interface Props {
  stops: Stop[];
  routeResult: RouteResult | null;
  homeBase: HomeBase | null;
  optimizing: boolean;
  isOptimized: boolean;
  /** Departure time (min-from-midnight) for the printed sheet's arrival clocks. */
  departureMins: number;
  dwellMins: number;
  onOptimize: () => void;
  onClear: () => void;
  onSave: (name: string) => void;
  onTryDemo: () => void;
}

export default function RouteActions({
  stops, routeResult, homeBase, optimizing, isOptimized, departureMins, dwellMins,
  onOptimize, onClear, onSave, onTryDemo,
}: Props) {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');

  const handleExport = () => {
    if (!routeResult) return;
    const header = 'Stop #,Label,Address,Leg Distance (mi),Leg Duration (min)\n';
    const rows = stops.map((s, i) => {
      const leg = routeResult.legs[i];
      return `${i + 1},"${(s.label || '').replace(/"/g, '""')}","${s.address.replace(/"/g, '""')}",${leg?.distance ?? ''},${leg?.duration ?? ''}`;
    }).join('\n');
    const footer = `\nTotal,,,${routeResult.totalDistance},${routeResult.totalDuration}`;
    const blob = new Blob([header + rows + footer], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleOpenInMaps = () => {
    if (!homeBase || stops.length === 0) return;
    const { url, truncated } = buildGoogleMapsRoute(homeBase, stops);
    if (truncated) {
      message.warning('Google Maps supports ~9 stops per link; opening the first 9 in order.');
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    if (!homeBase || !routeResult) return;
    printRouteSheet({ homeBase, stops, routeResult, departureMins, dwellMins });
  };

  const showOptimizeBadge = stops.length >= 3 && !isOptimized;

  // Share groups the "get this route out of the app" actions — copy as text, print
  // the driver sheet, export CSV — so the main row stays just the verbs a rep does
  // every run (optimize, open in nav, save).
  const shareItems = [
    { key: 'copy', icon: <CopyOutlined />, label: 'Copy as text', onClick: handleShare },
    { key: 'print', icon: <PrinterOutlined />, label: 'Print driver sheet', onClick: handlePrint },
    { key: 'csv', icon: <DownloadOutlined />, label: 'Export CSV', onClick: handleExport },
  ];

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
        <Button
          icon={<CompassOutlined />}
          disabled={!homeBase || stops.length === 0}
          onClick={handleOpenInMaps}
        >
          Open in Maps
        </Button>
        <Button icon={<SaveOutlined />} disabled={!routeResult} onClick={() => setSaveModalOpen(true)}>
          Save
        </Button>
        <Dropdown
          menu={{ items: shareItems }}
          disabled={!routeResult}
          trigger={['click']}
        >
          <Button icon={<ShareAltOutlined />} disabled={!routeResult}>
            Share <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
        <Popconfirm title="Clear all stops?" onConfirm={onClear} disabled={stops.length === 0}>
          <Button type="text" icon={<ClearOutlined />} disabled={stops.length === 0} aria-label="Clear all stops" title="Clear all stops" />
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
