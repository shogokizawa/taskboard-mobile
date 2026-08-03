import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  BoardSnapshot,
  NewTaskInput,
  Status,
  SubTask,
  Tag,
  Task,
  TaskLink,
  TaskPatch,
} from '../types/task';
import { createInitialSnapshot } from './seed';
import { uid } from './uid';

const STORAGE_KEY = 'taskboard_mobile_v1';

/**
 * データ操作の入口。
 *
 * 画面側はこのインターフェースだけに依存させてある。Supabaseへ移行するときは
 * 同じシグネチャの実装を用意して `repository` の中身を差し替えれば、
 * 画面のコードは一行も変えずに済む。
 *
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

class AsyncStorageBoardRepository implements BoardRepository {
  /**
   * 直近の書き込みを直列化するためのチェーン。
   * 連続タップなどで read-modify-write が重なると片方の更新が消えるため。
   */
  private queue: Promise<unknown> = Promise.resolve();

  async load(): Promise<BoardSnapshot> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const initial = createInitialSnapshot();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return normalizeSnapshot(JSON.parse(raw));
    } catch {
      // 壊れたJSONは初期状態で上書きせず、初期値を返すだけに留める
      return createInitialSnapshot();
    }
  }

  /** read → 変換 → write を直列に実行する */
  private mutate(fn: (snapshot: BoardSnapshot) => BoardSnapshot): Promise<BoardSnapshot> {
    const next = this.queue.then(async () => {
      const current = await this.load();
      const updated = fn(current);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    // 失敗しても後続の操作が止まらないようにチェーン自体は握りつぶす
    this.queue = next.catch(() => undefined);
    return next;
  }

  createTask(input: NewTaskInput): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const now = new Date().toISOString();
      const siblings = s.tasks.filter((t) => t.status_id === input.status_id);
      const task: Task = {
        id: uid(),
        title: input.title,
        memo: input.memo ?? '',
        status_id: input.status_id,
        position: siblings.length,
        subtasks: input.subtasks ?? [],
        tags: input.tags ?? [],
        links: input.links ?? [],
        created_at: now,
        updated_at: now,
        user_id: null,
      };
      return { ...s, tasks: [...s.tasks, task] };
    });
  }

  updateTask(id: string, patch: TaskPatch): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const target = s.tasks.find((t) => t.id === id);
      if (!target) return s;

      // ステータスが変わる場合は移動先の末尾へ置く
      const movedToNewStatus =
        patch.status_id !== undefined && patch.status_id !== target.status_id;
      const position = movedToNewStatus
        ? s.tasks.filter((t) => t.status_id === patch.status_id).length
        : (patch.position ?? target.position);

      const tasks = s.tasks.map((t) =>
        t.id === id
          ? { ...t, ...patch, position, updated_at: new Date().toISOString() }
          : t,
      );
      return { ...s, tasks: movedToNewStatus ? compactPositions(tasks) : tasks };
    });
  }

  deleteTask(id: string): Promise<BoardSnapshot> {
    return this.mutate((s) => ({
      ...s,
      tasks: compactPositions(s.tasks.filter((t) => t.id !== id)),
    }));
  }

  reorderTasks(statusId: string, orderedIds: string[]): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const rank = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        ...s,
        tasks: s.tasks.map((t) => {
          if (t.status_id !== statusId) return t;
          const position = rank.get(t.id);
          return position === undefined ? t : { ...t, position };
        }),
      };
    });
  }

  moveTask(id: string, toStatusId: string): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const target = s.tasks.find((t) => t.id === id);
      if (!target || target.status_id === toStatusId) return s;
      const position = s.tasks.filter((t) => t.status_id === toStatusId).length;
      const tasks = s.tasks.map((t) =>
        t.id === id
          ? { ...t, status_id: toStatusId, position, updated_at: new Date().toISOString() }
          : t,
      );
      return { ...s, tasks: compactPositions(tasks) };
    });
  }

  createStatus(name: string, color: string): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const status: Status = {
        id: uid(),
        name,
        color,
        position: s.statuses.length,
        user_id: null,
      };
      return { ...s, statuses: [...s.statuses, status] };
    });
  }

  updateStatus(
    id: string,
    patch: Partial<Pick<Status, 'name' | 'color'>>,
  ): Promise<BoardSnapshot> {
    return this.mutate((s) => ({
      ...s,
      statuses: s.statuses.map((st) => (st.id === id ? { ...st, ...patch } : st)),
    }));
  }

  deleteStatus(id: string, fallbackStatusId: string | null): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const statuses = s.statuses
        .filter((st) => st.id !== id)
        .map((st, index) => ({ ...st, position: index }));

      const tasks =
        fallbackStatusId === null
          ? s.tasks.filter((t) => t.status_id !== id)
          : s.tasks.map((t) =>
              t.status_id === id
                ? {
                    ...t,
                    status_id: fallbackStatusId,
                    updated_at: new Date().toISOString(),
                  }
                : t,
            );

      return { ...s, statuses, tasks: compactPositions(tasks) };
    });
  }

  reorderStatuses(orderedIds: string[]): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const rank = new Map(orderedIds.map((id, index) => [id, index]));
      const statuses = [...s.statuses]
        .map((st) => ({ ...st, position: rank.get(st.id) ?? st.position }))
        .sort((a, b) => a.position - b.position)
        .map((st, index) => ({ ...st, position: index }));
      return { ...s, statuses };
    });
  }

  createTag(name: string, color: string): Promise<BoardSnapshot> {
    return this.mutate((s) => ({
      ...s,
      tags: [...s.tags, { id: uid(), name, color }],
    }));
  }

  updateTag(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<BoardSnapshot> {
    return this.mutate((s) => {
      const tags = s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t));
      // タスク側はタグの実体を埋め込んで持っているので、そちらも更新する
      const tasks = s.tasks.map((task) => {
        if (!task.tags.some((t) => t.id === id)) return task;
        return { ...task, tags: task.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
      });
      return { ...s, tags, tasks };
    });
  }

  deleteTag(id: string): Promise<BoardSnapshot> {
    return this.mutate((s) => ({
      ...s,
      tags: s.tags.filter((t) => t.id !== id),
      tasks: s.tasks.map((task) => {
        if (!task.tags.some((t) => t.id === id)) return task;
        return { ...task, tags: task.tags.filter((t) => t.id !== id) };
      }),
    }));
  }

  clearAll(): Promise<BoardSnapshot> {
    return this.mutate(() => createInitialSnapshot());
  }
}

/** 各ステータス内の position を 0,1,2... に振り直す */
function compactPositions(tasks: Task[]): Task[] {
  const nextIndex = new Map<string, number>();
  return [...tasks]
    .sort((a, b) => a.position - b.position)
    .map((t) => {
      const index = nextIndex.get(t.status_id) ?? 0;
      nextIndex.set(t.status_id, index + 1);
      return t.position === index ? t : { ...t, position: index };
    });
}

/**
 * 保存済みJSONを現行の型へ寄せる。
 * 手で編集された場合や、将来スキーマを足したときに落ちないようにするための保険。
 */
function normalizeSnapshot(input: unknown): BoardSnapshot {
  const fallback = createInitialSnapshot();
  if (typeof input !== 'object' || input === null) return fallback;
  const raw = input as Partial<Record<keyof BoardSnapshot, unknown>>;

  const statuses = Array.isArray(raw.statuses)
    ? raw.statuses.map(normalizeStatus).filter((s): s is Status => s !== null)
    : [];
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(normalizeTag).filter((t): t is Tag => t !== null)
    : [];
  const validStatusIds = new Set(statuses.map((s) => s.id));
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks
        .map(normalizeTask)
        .filter((t): t is Task => t !== null && validStatusIds.has(t.status_id))
    : [];

  return {
    statuses: statuses.length > 0 ? statuses : fallback.statuses,
    tags,
    tasks: compactPositions(tasks),
  };
}

function normalizeStatus(input: unknown): Status | null {
  const raw = input as Partial<Status> | null;
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    position: typeof raw.position === 'number' ? raw.position : 0,
    color: typeof raw.color === 'string' ? raw.color : '#6B7280',
    user_id: typeof raw.user_id === 'string' ? raw.user_id : null,
  };
}

function normalizeTag(input: unknown): Tag | null {
  const raw = input as Partial<Tag> | null;
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    color: typeof raw.color === 'string' ? raw.color : '#8B93B0',
  };
}

function normalizeTask(input: unknown): Task | null {
  const raw = input as Partial<Task> | null;
  if (!raw || typeof raw.id !== 'string' || typeof raw.status_id !== 'string') return null;
  const now = new Date().toISOString();
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : '',
    memo: typeof raw.memo === 'string' ? raw.memo : '',
    status_id: raw.status_id,
    position: typeof raw.position === 'number' ? raw.position : 0,
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks.map(normalizeSubTask) : [],
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(normalizeTag).filter((t): t is Tag => t !== null)
      : [],
    links: Array.isArray(raw.links)
      ? raw.links.filter((l): l is TaskLink => !!l && typeof l.url === 'string')
      : [],
    created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : now,
    user_id: typeof raw.user_id === 'string' ? raw.user_id : null,
  };
}

function normalizeSubTask(input: unknown): SubTask {
  const raw = input as Partial<SubTask> | null;
  return {
    id: typeof raw?.id === 'string' ? raw.id : uid(),
    title: typeof raw?.title === 'string' ? raw.title : '',
    completed: raw?.completed === true,
    children: Array.isArray(raw?.children) ? raw.children.map(normalizeSubTask) : [],
  };
}

export const repository: BoardRepository = new AsyncStorageBoardRepository();
