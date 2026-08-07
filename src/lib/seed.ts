/**
 * 初回ログイン時に作成する既定のステータス・タグ。既存Webアプリの構成に合わせてある。
 * id・user_id はDB側（gen_random_uuid() / auth.uid()）が採番するのでここでは持たない。
 */
export const DEFAULT_STATUSES: { name: string; color: string; position: number }[] = [
  { name: '未着手', position: 0, color: '#6B7280' },
  { name: '進行中', position: 1, color: '#3B82F6' },
  { name: '完了', position: 2, color: '#10B981' },
];

export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: '趣味', color: '#F472B6' },
  { name: '仕事', color: '#60A5FA' },
  { name: 'メモ', color: '#4ADE80' },
];
