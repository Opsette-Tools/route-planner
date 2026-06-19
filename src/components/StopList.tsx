import { List, Typography, Tag, Button, Alert } from 'antd';
import { DeleteOutlined, HolderOutlined, EnvironmentOutlined, EditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stop } from '@/types/route';

interface Props {
  stops: Stop[];
  onReorder: (stops: Stop[]) => void;
  onDelete: (id: string) => void;
  onEdit: (stop: Stop) => void;
}

function SortableItem({ stop, index, onDelete, onEdit }: {
  stop: Stop; index: number;
  onDelete: (id: string) => void;
  onEdit: (stop: Stop) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stop.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  // Label is the optional headline; the address is the source of truth. No inline
  // pencils — a single Edit button (in the action area) opens the modal that handles
  // label, location, and time window together.
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <List.Item
        actions={[
          <Button
            type="text"
            icon={<EnvironmentOutlined />}
            size="small"
            title="Open in Google Maps"
            onClick={() => window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`,
              '_blank'
            )}
          />,
          <Button type="text" icon={<EditOutlined />} size="small" title="Edit stop" onClick={() => onEdit(stop)} />,
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(stop.id)} size="small" title="Delete stop" />,
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
            {stop.label ? (
              <>
                <Typography.Text style={{ fontSize: 13, fontWeight: 600 }} ellipsis>
                  {stop.label}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 11 }} ellipsis={{ rows: 2 }}>
                  {stop.address}
                </Typography.Text>
              </>
            ) : (
              // No label → the address becomes the headline so the row never reads blank.
              <Typography.Text style={{ fontSize: 13, fontWeight: 500 }} ellipsis={{ rows: 2 }}>
                {stop.address}
              </Typography.Text>
            )}
            {stop.timeWindow && (
              <>
                <br />
                <Tag color="blue" icon={<ClockCircleOutlined />} style={{ fontSize: 10, marginTop: 2 }}>
                  {stop.timeWindow}
                </Tag>
              </>
            )}
          </div>
        </div>
      </List.Item>
    </div>
  );
}

export default function StopList({ stops, onReorder, onDelete, onEdit }: Props) {
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
                onEdit={onEdit}
              />
            )}
          />
        </SortableContext>
      </DndContext>
    </div>
  );
}
