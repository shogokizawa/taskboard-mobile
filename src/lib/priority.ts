import type { Priority } from '../types/task';

export const PRIORITIES: Priority[] = ['高', '中', '低'];

export const PRIORITY_COLOR: Record<Priority, string> = {
  高: '#F87171',
  中: '#FBBF24',
  低: '#6B7280',
};
