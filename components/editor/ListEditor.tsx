import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

/** Generic add/update/remove chrome for arrays of `{ id: string }` items — used
 * by every resume section (experience, projects, education, skills, certs)
 * so each section only has to describe its own field layout. */
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
  function update(id: string, patch: Partial<T>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }
  function add() {
    onChange([...items, newItem()]);
  }

  return (
    <div className="space-y-md">
      {items.length === 0 && <p className="font-sans text-body-lg text-on-surface-variant">{emptyLabel}</p>}
      {items.map((item, index) => (
        <div key={item.id} className="relative rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="absolute right-md top-md text-on-surface-variant hover:text-error"
            aria-label="Remove"
          >
            <Icon name="delete" size={16} />
          </button>
          {renderItem(item, (patch) => update(item.id, patch), index)}
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Icon name="plus" size={14} />
        {addLabel}
      </Button>
    </div>
  );
}

/** Simpler add/remove/edit list for plain-text bullets. */
export function BulletListEditor({
  bullets,
  onChange,
}: {
  bullets: { id: string; text: string }[];
  onChange: (next: { id: string; text: string }[]) => void;
}) {
  function updateText(id: string, text: string) {
    onChange(bullets.map((b) => (b.id === id ? { ...b, text } : b)));
  }
  function remove(id: string) {
    onChange(bullets.filter((b) => b.id !== id));
  }
  function add() {
    onChange([...bullets, { id: crypto.randomUUID(), text: "" }]);
  }

  return (
    <div className="space-y-2">
      {bullets.map((bullet) => (
        <div key={bullet.id} className="flex items-start gap-2">
          <span className="mt-2.5 text-on-surface-variant">&bull;</span>
          <textarea
            value={bullet.text}
            onChange={(e) => updateText(bullet.id, e.target.value)}
            rows={2}
            className="flex-1 resize-y rounded border border-outline-variant bg-surface-container-lowest px-2 py-1.5 font-sans text-body-lg text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            type="button"
            onClick={() => remove(bullet.id)}
            className="mt-1.5 text-on-surface-variant hover:text-error"
            aria-label="Remove bullet"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="font-sans text-xs font-medium text-secondary hover:underline">
        + Add bullet
      </button>
    </div>
  );
}
