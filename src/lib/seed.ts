import type { BoardSnapshot, Status, Tag } from '../types/task';

/** 初回起動時の既定ステータス。既存Webアプリの4列に合わせてある */
export const DEFAULT_STATUSES: Status[] = [
  { id: 'todo', name: '未着手', position: 0, color: '#6B7280', user_id: null },
  { id: 'doing', name: '進行中', position: 1, color: '#3B82F6', user_id: null },
  { id: 'review', name: 'レビュー', position: 2, color: '#F59E0B', user_id: null },
  { id: 'done', name: '完了', position: 3, color: '#10B981', user_id: null },
];

/** 初回起動時の既定タグ。既存Webアプリの TAG_STYLES と同じ5種 */
export const DEFAULT_TAGS: Tag[] = [
  { id: 'feature', name: '機能', color: '#60A5FA' },
  { id: 'bug', name: 'バグ', color: '#F87171' },
  { id: 'docs', name: 'ドキュメント', color: '#4ADE80' },
  { id: 'design', name: 'デザイン', color: '#F472B6' },
  { id: 'infra', name: 'インフラ', color: '#FBBF24' },
];

export function createInitialSnapshot(): BoardSnapshot {
  return {
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    tags: DEFAULT_TAGS.map((t) => ({ ...t })),
    tasks: [],
  };
}
