import { randomUUID } from 'node:crypto';
import type { Variant } from '../shared/types.js';

/** Keep unselected variants so revisiting an audience restores its edits and ID. */
export function reconcileVariants(current: Variant[], archived: Variant[], selected: string[]) {
  const saved = new Map([...archived, ...current].map(variant => [variant.buyerId, variant]));
  const variants: Variant[] = selected.map(buyerId => saved.get(buyerId) || {
    id: randomUUID(), buyerId, title: '', description: '', originalTitle: '', originalDescription: '', favorite: false, status: 'pending', provider: 'template',
  });
  const active = new Set(selected);
  return { variants, archivedVariants: [...saved.values()].filter(variant => !active.has(variant.buyerId)) };
}
