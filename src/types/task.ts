/**
 * データモデル。Supabase の statuses / tags / tasks テーブルにそのままマッピングする。
 * ステータス・タグを可変（ユーザーが追加/削除できる）にした構成。
 * `user_id` は行の所有者。DB側で auth.uid() を既定値にし、RLSで本人の行のみに絞る。
 */

export type Tag = {
  id: string;
  name: string;
  /** チップの文字色。背景は withAlpha() で生成する */
  color: string;
};

export type Status = {
  id: string;
  name: string;
  /** 表示順。小さいほど左 */
  position: number;
  /** タブのドット色 */
  color: string;
  user_id: string | null;
};

export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
  /** 再帰ツリー。最大ネスト段数は MAX_SUBTASK_DEPTH（lib/subtasks.ts） */
  children: SubTask[];
};

export type TaskLink = {
  url: string;
  label?: string;
};

/** タグとは別枠の専用フィールド。未設定は null */
export type Priority = '高' | '中' | '低';

export type Task = {
  id: string;
  title: string;
  memo: string;
  status_id: string;
  /** 同一ステータス内での表示順。小さいほど上 */
  position: number;
  subtasks: SubTask[];
  tags: Tag[];
  links: TaskLink[];
  priority: Priority | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

/** 保存されるデータ全体 */
export type BoardSnapshot = {
  statuses: Status[];
  tags: Tag[];
  tasks: Task[];
};

export type NewTaskInput = {
  title: string;
  status_id: string;
  memo?: string;
  tags?: Tag[];
  subtasks?: SubTask[];
  links?: TaskLink[];
  priority?: Priority | null;
};

/** 更新可能なフィールドのみ。id / created_at / user_id は変更しない */
export type TaskPatch = Partial<
  Pick<
    Task,
    'title' | 'memo' | 'status_id' | 'tags' | 'subtasks' | 'links' | 'position' | 'priority'
  >
>;
