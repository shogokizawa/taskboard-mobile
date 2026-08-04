import { DEFAULT_STATUSES, DEFAULT_TAGS } from './seed';
import { supabase } from './supabaseClient';
import type {
  BoardSnapshot,
  NewTaskInput,
  Status,
  Tag,
  Task,
  TaskPatch,
} from '../types/task';

/**
 * データ操作の入口。画面側はこのインターフェースだけに依存する。
 * 更新系は毎回スナップショット全体を返す。呼び出し側は差分を組み立てる必要がない。
 */
export interface BoardRepository {
  load(): Promise<BoardSnapshot>;

  createTask(input: NewTaskInput): Promise<BoardSnapshot>;
  updateTask(id: string, patch: TaskPatch): Promise<BoardSnapshot>;
  deleteTask(id: string): Promise<BoardSnapshot>;
  /** 列内の並び替え。orderedIds はそのステータスのタスクidを表示順に並べたもの */
  reorderTasks(statusId: string, orderedIds: string[]): Promise<BoardSnapshot>;
  /** 別の列へ移動。移動先の末尾に入る */
  moveTask(id: string, toStatusId: string): Promise<BoardSnapshot>;

  createStatus(name: string, color: string): Promise<BoardSnapshot>;
  updateStatus(id: string, patch: Partial<Pick<Status, 'name' | 'color'>>): Promise<BoardSnapshot>;
  /**
   * ステータスを削除する。
   * @param fallbackStatusId 所属タスクの移動先。null ならタスクごと削除する
   */
  deleteStatus(id: string, fallbackStatusId: string | null): Promise<BoardSnapshot>;
  reorderStatuses(orderedIds: string[]): Promise<BoardSnapshot>;

  createTag(name: string, color: string): Promise<BoardSnapshot>;
  updateTag(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<BoardSnapshot>;
  /** タグを削除し、各タスクからも取り除く */
  deleteTag(id: string): Promise<BoardSnapshot>;

  /** 全消去して初期状態へ戻す */
  clearAll(): Promise<BoardSnapshot>;
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

class SupabaseBoardRepository implements BoardRepository {
  /** 初回ログイン時、まだ何も無ければ既定のステータス・タグを作る */
  private async seedIfEmpty(): Promise<void> {
    const { count } = await supabase
      .from('statuses')
      .select('id', { count: 'exact', head: true });
    if (count && count > 0) return;

    await supabase
      .from('statuses')
      .insert(DEFAULT_STATUSES.map(({ name, color, position }) => ({ name, color, position })));
    await supabase.from('tags').insert(DEFAULT_TAGS.map(({ name, color }) => ({ name, color })));
  }

  async load(): Promise<BoardSnapshot> {
    await this.seedIfEmpty();
    const [statuses, tags, tasks] = await Promise.all([
      supabase.from('statuses').select('*').order('position', { ascending: true }),
      supabase.from('tags').select('*'),
      supabase.from('tasks').select('*').order('position', { ascending: true }),
    ]);
    return {
      statuses: unwrap<Status[]>(statuses),
      tags: unwrap<Tag[]>(tags),
      tasks: unwrap<Task[]>(tasks),
    };
  }

  /** そのステータス列内の position を 0,1,2... に振り直す */
  private async compactStatus(statusId: string): Promise<void> {
    const rows = unwrap<{ id: string; position: number }[]>(
      await supabase
        .from('tasks')
        .select('id, position')
        .eq('status_id', statusId)
        .order('position', { ascending: true }),
    );
    const stale = rows
      .map((row, index) => ({ id: row.id, index, changed: row.position !== index }))
      .filter((r) => r.changed);
    await Promise.all(
      stale.map((r) => supabase.from('tasks').update({ position: r.index }).eq('id', r.id)),
    );
  }

  async createTask(input: NewTaskInput): Promise<BoardSnapshot> {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', input.status_id);

    unwrap(
      await supabase.from('tasks').insert({
        title: input.title,
        memo: input.memo ?? '',
        status_id: input.status_id,
        position: count ?? 0,
        subtasks: input.subtasks ?? [],
        tags: input.tags ?? [],
        links: input.links ?? [],
      }),
    );
    return this.load();
  }

  async updateTask(id: string, patch: TaskPatch): Promise<BoardSnapshot> {
    const target = unwrap<Task>(
      await supabase.from('tasks').select('*').eq('id', id).single(),
    );

    const movedToNewStatus =
      patch.status_id !== undefined && patch.status_id !== target.status_id;

    let position = patch.position ?? target.position;
    if (movedToNewStatus) {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status_id', patch.status_id);
      position = count ?? 0;
    }

    unwrap(await supabase.from('tasks').update({ ...patch, position }).eq('id', id));
    if (movedToNewStatus) await this.compactStatus(target.status_id);
    return this.load();
  }

  async deleteTask(id: string): Promise<BoardSnapshot> {
    const target = unwrap<Task>(
      await supabase.from('tasks').select('*').eq('id', id).single(),
    );
    unwrap(await supabase.from('tasks').delete().eq('id', id));
    await this.compactStatus(target.status_id);
    return this.load();
  }

  async reorderTasks(statusId: string, orderedIds: string[]): Promise<BoardSnapshot> {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('tasks').update({ position: index }).eq('id', id),
      ),
    );
    return this.load();
  }

  async moveTask(id: string, toStatusId: string): Promise<BoardSnapshot> {
    const target = unwrap<Task>(
      await supabase.from('tasks').select('*').eq('id', id).single(),
    );
    if (target.status_id === toStatusId) return this.load();

    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', toStatusId);

    unwrap(
      await supabase
        .from('tasks')
        .update({ status_id: toStatusId, position: count ?? 0 })
        .eq('id', id),
    );
    await this.compactStatus(target.status_id);
    return this.load();
  }

  async createStatus(name: string, color: string): Promise<BoardSnapshot> {
    const { count } = await supabase
      .from('statuses')
      .select('id', { count: 'exact', head: true });
    unwrap(await supabase.from('statuses').insert({ name, color, position: count ?? 0 }));
    return this.load();
  }

  async updateStatus(
    id: string,
    patch: Partial<Pick<Status, 'name' | 'color'>>,
  ): Promise<BoardSnapshot> {
    unwrap(await supabase.from('statuses').update(patch).eq('id', id));
    return this.load();
  }

  async deleteStatus(id: string, fallbackStatusId: string | null): Promise<BoardSnapshot> {
    if (fallbackStatusId === null) {
      // FK は on delete cascade なので、所属タスクごと消える
      unwrap(await supabase.from('statuses').delete().eq('id', id));
    } else {
      const moving = unwrap<{ id: string }[]>(
        await supabase
          .from('tasks')
          .select('id')
          .eq('status_id', id)
          .order('position', { ascending: true }),
      );
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status_id', fallbackStatusId);
      const start = count ?? 0;

      await Promise.all(
        moving.map((t, i) =>
          supabase
            .from('tasks')
            .update({ status_id: fallbackStatusId, position: start + i })
            .eq('id', t.id),
        ),
      );
      unwrap(await supabase.from('statuses').delete().eq('id', id));
    }

    const remaining = unwrap<{ id: string; position: number }[]>(
      await supabase.from('statuses').select('id, position').order('position', { ascending: true }),
    );
    const stale = remaining
      .map((s, index) => ({ id: s.id, index, changed: s.position !== index }))
      .filter((r) => r.changed);
    await Promise.all(
      stale.map((r) => supabase.from('statuses').update({ position: r.index }).eq('id', r.id)),
    );

    return this.load();
  }

  async reorderStatuses(orderedIds: string[]): Promise<BoardSnapshot> {
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('statuses').update({ position: index }).eq('id', id),
      ),
    );
    return this.load();
  }

  async createTag(name: string, color: string): Promise<BoardSnapshot> {
    unwrap(await supabase.from('tags').insert({ name, color }));
    return this.load();
  }

  async updateTag(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<BoardSnapshot> {
    unwrap(await supabase.from('tags').update(patch).eq('id', id));
    // タスク側はタグの実体を埋め込んで持っているので、そちらも更新する
    await this.propagateTagChange(id, (tag) => ({ ...tag, ...patch }));
    return this.load();
  }

  async deleteTag(id: string): Promise<BoardSnapshot> {
    unwrap(await supabase.from('tags').delete().eq('id', id));
    await this.propagateTagChange(id, () => null);
    return this.load();
  }

  /** tasks.tags(jsonb) 内の埋め込みコピーへ、タグの変更・削除を反映する */
  private async propagateTagChange(
    tagId: string,
    transform: (tag: Tag) => Tag | null,
  ): Promise<void> {
    const tasks = unwrap<Task[]>(await supabase.from('tasks').select('*'));
    const affected = tasks.filter((t) => t.tags.some((tag) => tag.id === tagId));
    await Promise.all(
      affected.map((t) => {
        const tags = t.tags
          .map((tag) => (tag.id === tagId ? transform(tag) : tag))
          .filter((tag): tag is Tag => tag !== null);
        return supabase.from('tasks').update({ tags }).eq('id', t.id);
      }),
    );
  }

  async clearAll(): Promise<BoardSnapshot> {
    // FK は on delete cascade なので tasks はステータス削除で一緒に消える
    unwrap(await supabase.from('statuses').delete().not('id', 'is', null));
    unwrap(await supabase.from('tags').delete().not('id', 'is', null));
    return this.load();
  }
}

export const repository: BoardRepository = new SupabaseBoardRepository();
