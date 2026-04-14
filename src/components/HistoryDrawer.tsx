import { Drawer, List, Button, Tag, Typography, Popconfirm, Empty, Space } from 'antd';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import type { SavedRoute } from '@/types/route';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  open: boolean;
  onClose: () => void;
  savedRoutes: SavedRoute[];
  onLoad: (route: SavedRoute) => void;
  onReuse: (route: SavedRoute) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryDrawer({ open, onClose, savedRoutes, onLoad, onReuse, onDelete, onClearAll }: Props) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      title="Route History"
      open={open}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '70vh' : undefined}
      width={isMobile ? undefined : 400}
    >
      {savedRoutes.length === 0 ? (
        <Empty description="No saved routes yet" />
      ) : (
        <>
          <List
            dataSource={savedRoutes}
            renderItem={(route) => (
              <List.Item
                actions={[
                  <Button type="text" icon={<CopyOutlined />} size="small" onClick={() => onReuse(route)} title="Reuse" />,
                  <Popconfirm title="Delete this route?" onConfirm={() => onDelete(route.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>,
                ]}
                onClick={() => onLoad(route)}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  title={route.name}
                  description={
                    <Space size="small" wrap>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>{route.date}</Typography.Text>
                      <Tag>{route.stops.length} stops</Tag>
                      <Typography.Text strong style={{ fontSize: 12 }}>{route.totalDistance} mi</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
          <Popconfirm title="Clear all saved routes?" onConfirm={onClearAll}>
            <Button danger block className="mt-3">Clear All</Button>
          </Popconfirm>
        </>
      )}
    </Drawer>
  );
}
