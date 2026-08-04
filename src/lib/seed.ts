/**
 * 初回ログイン時に作成する既定のステータス・タグ。既存Webアプリの構成に合わせてある。
 * id・user_id はDB側（gen_random_uuid() / auth.uid()）が採番するのでここでは持たない。
 */
export const DEFAULT_STATUSES: { name: string; color: string; position: number }[] = [
  { name: '未着手', position: 0, color: '#6B7280' },
  { name: '進行中', position: 1, color: '#3B82F6' },
  { name: 'レビュー', position: 2, color: '#F59E0B' },
  { name: '完了', position: 3, color: '#10B981' },
];

export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: '機能', color: '#60A5FA' },
  { name: 'バグ', color: '#F87171' },
  { name: 'ドキュメント', color: '#4ADE80' },
  { name: 'デザイン', color: '#F472B6' },
  { name: 'インフラ', color: '#FBBF24' },
];
