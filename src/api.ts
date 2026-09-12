import type { Product, Project, Variant } from '../shared/types';
import { formatProductPrice } from '../shared/product-price';
import { createWorkspaceKey } from './workspace-key';

let key = localStorage.getItem('persona-workspace');
if (!key || !/^[a-f0-9-]{36}$/.test(key)) {
  key = createWorkspaceKey(globalThis.crypto);
  localStorage.setItem('persona-workspace', key);
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Workspace-Key': key! }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '目前無法完成操作，請重試。');
  return data as T;
}
export async function realtimeApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/realtime${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Workspace-Key': key! }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Realtime Persona mapping 暫時無法執行。');
  return data as T;
}
export const money = (product: Product) => formatProductPrice(product);
export const expiration = (project: Project) => new Date(project.expiresAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
export type Draft = Pick<Variant, 'title' | 'description'>;
export function readDrafts(): Record<string, Draft & { expiresAt: number }> {
  try { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('persona-drafts') || '{}')).filter(([, value]) => (value as { expiresAt: number }).expiresAt > Date.now())) as Record<string, Draft & { expiresAt: number }>; } catch { return {}; }
}
