import type { Project, Variant } from '../shared/types';

let key = localStorage.getItem('persona-workspace');
if (!key) { key = crypto.randomUUID(); localStorage.setItem('persona-workspace', key); }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Workspace-Key': key! }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '目前無法完成操作，請重試。');
  return data as T;
}
export const money = (value: number | null) => value === null ? '價格未提供' : `NT$ ${value.toLocaleString('zh-TW')}`;
export const expiration = (project: Project) => new Date(project.expiresAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
export type Draft = Pick<Variant, 'title' | 'description'>;
export function readDrafts(): Record<string, Draft & { expiresAt: number }> {
  try { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('persona-drafts') || '{}')).filter(([, value]) => (value as { expiresAt: number }).expiresAt > Date.now())) as Record<string, Draft & { expiresAt: number }>; } catch { return {}; }
}
