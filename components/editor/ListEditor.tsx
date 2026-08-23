"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { cn } from "@/lib/cn";

function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** Generic add/update/remove/reorder chrome for arrays of `{ id: string }`
 * items — used by every resume section (experience, projects, education,
 * skills, certs) so each section only has to describe its own field layout. */
export function ListEditor<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel,
  emptyLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  newItem: () => T;
  addLabel: string;
  emptyLabel: string;
}) {
  const sensors = useReorderSensors();
  const dndContextId = useId();

  function update(id: string, patch: Partial<T>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }
  function add() {
    onChange([...items, newItem()]);
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div className="space-y-md">
      {items.length === 0 && <p className="font-sans text-body-lg text-on-surface-variant">{emptyLabel}</p>}
      <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableCard key={item.id} id={item.id} onRemove={() => remove(item.id)}>
              {renderItem(item, (patch) => update(item.id, patch), index)}
            </SortableCard>
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Icon name="plus" size={14} />
        {addLabel}
      </Button>
    </div>
  );
}

function SortableCard({ id, onRemove, children }: { id: string; onRemove: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative rounded-lg border border-outline-variant bg-surface-container-lowest p-md",
        isDragging && "z-10 shadow-[var(--shadow-crisp)]",
      )}
    >
      <div className="absolute right-md top-md flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-on-surface-variant hover:text-on-surface active:cursor-grabbing"
          aria-label="Reorder"
        >
          <Icon name="menu" size={16} />
        </button>
        <button type="button" onClick={onRemove} className="text-on-surface-variant hover:text-error" aria-label="Remove">
          <Icon name="delete" size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Simpler add/remove/edit/reorder list for plain-text bullets. */
export function BulletListEditor({
  bullets,
  onChange,
}: {
  bullets: { id: string; text: string }[];
  onChange: (next: { id: string; text: string }[]) => void;
}) {
  const sensors = useReorderSensors();
  const dndContextId = useId();

  function updateText(id: string, text: string) {
    onChange(bullets.map((b) => (b.id === id ? { ...b, text } : b)));
  }
  function remove(id: string) {
    onChange(bullets.filter((b) => b.id !== id));
  }
  function add() {
    onChange([...bullets, { id: crypto.randomUUID(), text: "" }]);
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bullets.findIndex((b) => b.id === active.id);
    const newIndex = bullets.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(bullets, oldIndex, newIndex));
  }

  return (
    <div className="space-y-2">
      <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet) => (
            <SortableBullet key={bullet.id} id={bullet.id} text={bullet.text} onChange={(text) => updateText(bullet.id, text)} onRemove={() => remove(bullet.id)} />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" onClick={add} className="font-sans text-xs font-medium text-secondary hover:underline">
        + Add bullet
      </button>
    </div>
  );
}

function SortableBullet({
  id,
  text,
  onChange,
  onRemove,
}: {
  id: string;
  text: string;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-start gap-2", isDragging && "z-10")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1.5 cursor-grab touch-none text-on-surface-variant hover:text-on-surface active:cursor-grabbing"
        aria-label="Reorder bullet"
      >
        <Icon name="menu" size={14} />
      </button>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="flex-1 resize-y rounded border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-sans text-body-lg text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
      />
      <button type="button" onClick={onRemove} className="mt-1.5 text-on-surface-variant hover:text-error" aria-label="Remove bullet">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
