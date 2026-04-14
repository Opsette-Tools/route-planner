import { List, Typography, Tag, Button, Alert } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stop } from '@/types/route';

interface Props {
  stops: Stop[];
  onReorder: (stops: Stop[]) => void;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateTimeWindow: (id: string, timeWindow: string) => void;
}

function SortableItem({ stop, index, onDelete, onUpdateLabel }: {
  stop: Stop; index: number;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stop.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <List.Item
        actions={[
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(stop.id)} size="small" />
        ]}
      >
        <div className="flex items-center gap-2 w-full">
          <span {...listeners} style={{ cursor: 'grab', touchAction: 'none' }}>
            <HolderOutlined style={{ color: '#bbb', fontSize: 16 }} />
          </span>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: '#2563EB',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <Typography.Text
              editable={{ onChange: (val) => onUpdateLabel(stop.id, val) }}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              {stop.label || 'Add label...'}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 11 }} ellipsis>
              {stop.address}
            </Typography.Text>
            {stop.timeWindow && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>{stop.timeWindow}</Tag>}
          </div>
        </div>
      </List.Item>
    </div>
  );
}

export default function StopList({ stops, onReorder, onDelete, onUpdateLabel }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex(s => s.id === active.id);
      const newIndex = stops.findIndex(s => s.id === over.id);
      onReorder(arrayMove(stops, oldIndex, newIndex));
    }
  };

  return (
    <div>
      {stops.length >= 15 && (
        <Alert type="warning" message="Maximum 15 stops reached. Consider rate limits." showIcon className="mb-2" />
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <List
            size="small"
            dataSource={stops}
            renderItem={(stop, index) => (
              <SortableItem
                key={stop.id}
                stop={stop}
                index={index}
                onDelete={onDelete}
                onUpdateLabel={onUpdateLabel}
              />
            )}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
}
