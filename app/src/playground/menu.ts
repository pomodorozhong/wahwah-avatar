// A small dropdown menu that replaces the browser's native select popups: one
// menu is open at a time, placed under its anchor and kept inside the window.

export interface MenuItem {
  label?: string;
  /** A small section heading row. */
  heading?: string;
  divider?: boolean;
  selected?: boolean;
  accent?: boolean;
  onPick?: () => void;
  /** Adds a trailing delete button to the row. */
  onRemove?: () => void;
  /** Custom content for a row, such as the grid size picker. */
  node?: HTMLElement;
}

let open: { el: HTMLElement; anchor: HTMLElement } | null = null;

export function closeMenu(): void {
  if (!open) return;
  open.anchor.setAttribute('aria-expanded', 'false');
  open.el.remove();
  open = null;
}

/** Open a menu under `anchor`; opening it again from the same anchor closes it. */
export function openMenu(anchor: HTMLElement, items: MenuItem[]): void {
  const same = open?.anchor === anchor;
  closeMenu();
  if (same) return;
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  for (const item of items) el.append(row(item));
  document.body.append(el);
  anchor.setAttribute('aria-expanded', 'true');
  const box = anchor.getBoundingClientRect();
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8));
  const below = box.bottom + 4;
  const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, box.top - height - 4);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  open = { el, anchor };
}

function row(item: MenuItem): HTMLElement {
  if (item.divider) return Object.assign(document.createElement('hr'), { className: 'divider' });
  if (item.heading !== undefined) return Object.assign(document.createElement('div'), { className: 'heading', textContent: item.heading });
  if (item.node) return item.node;
  const el = document.createElement('div');
  el.className = 'item' + (item.selected ? ' selected' : '') + (item.accent ? ' accent' : '');
  el.setAttribute('role', 'menuitem');
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = item.label ?? '';
  const check = document.createElement('span');
  check.className = 'check';
  check.textContent = item.selected ? '✓' : '';
  el.append(label, check);
  if (item.onRemove) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = '✕';
    remove.setAttribute('aria-label', `Delete ${item.label ?? 'item'}`);
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      item.onRemove?.();
    });
    el.append(remove);
  }
  el.addEventListener('click', () => {
    closeMenu();
    item.onPick?.();
  });
  return el;
}

document.addEventListener('pointerdown', (e) => {
  if (open && !open.el.contains(e.target as Node) && !open.anchor.contains(e.target as Node)) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
