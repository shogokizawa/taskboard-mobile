/**
 * データモデル。
 *
 * ステータス・タグを可変（ユーザーが追加/削除できる）にした構成。
 * `user_id` はローカル保存では常に null。将来Supabaseへ移行したときに
 * そのままカラムへマッピングできるようフィールドだけ用意してある。
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
  /** 再帰ツリー。ネスト段数の制限なし */
  children: SubTask[];
};

export type TaskLink = {
  url: string;
  label?: string;
};

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
};

/** 更新可能なフィールドのみ。id / created_at / user_id は変更しない */
export type TaskPatch = Partial<
  Pick<Task, 'title' | 'memo' | 'status_id' | 'tags' | 'subtasks' | 'links' | 'position'>
>;
