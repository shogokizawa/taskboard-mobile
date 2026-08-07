import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';

import { repository } from '../lib/storage';
import type { BoardSnapshot, NewTaskInput, Status, Tag, Task, TaskPatch } from '../types/task';

type BoardContextValue = {
  ready: boolean;
  statuses: Status[];
  tags: Tag[];
  tasks: Task[];

  /** 指定ステータスのタスクを表示順で返す */
  tasksByStatus: (statusId: string) => Task[];
  taskById: (id: string) => Task | undefined;

  createTask: (input: NewTaskInput) => Promise<void>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (statusId: string, orderedIds: string[]) => Promise<void>;
  moveTask: (id: string, toStatusId: string) => Promise<void>;

  createStatus: (name: string, color: string) => Promise<void>;
  updateStatus: (id: string, patch: Partial<Pick<Status, 'name' | 'color'>>) => Promise<void>;
  deleteStatus: (id: string, fallbackStatusId: string | null) => Promise<void>;
  reorderStatuses: (orderedIds: string[]) => Promise<void>;

  createTag: (name: string, color: string) => Promise<void>;
  updateTag: (id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  clearAll: () => Promise<void>;
};

const BoardContext = createContext<BoardContextValue | null>(null);

const EMPTY: BoardSnapshot = { statuses: [], tags: [], tasks: [] };

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  /** アンマウント後に setState しないためのフラグ */
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    repository
      .load()
      .then((loaded) => {
        if (alive.current) setSnapshot(loaded);
      })
      .catch((err) => {
        console.error(err);
        Alert.alert('読み込みエラー', err instanceof Error ? err.message : 'データの読み込みに失敗しました。');
      })
      .finally(() => {
        if (alive.current) setReady(true);
      });
    return () => {
      alive.current = false;
    };
  }, []);

  const apply = useCallback(async (op: Promise<BoardSnapshot>) => {
    try {
      const next = await op;
      if (alive.current) setSnapshot(next);
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', err instanceof Error ? err.message : '操作に失敗しました。');
      throw err;
    }
  }, []);

  const value = useMemo<BoardContextValue>(() => {
    // ステータスは position 順、タスクはステータスごとに position 順で持っておく
    const statuses = [...snapshot.statuses].sort((a, b) => a.position - b.position);
    const byStatus = new Map<string, Task[]>();
    for (const task of snapshot.tasks) {
      const list = byStatus.get(task.status_id);
      if (list) list.push(task);
      else byStatus.set(task.status_id, [task]);
    }
    for (const list of byStatus.values()) list.sort((a, b) => a.position - b.position);

    return {
      ready,
      statuses,
      tags: snapshot.tags,
      tasks: snapshot.tasks,

      tasksByStatus: (statusId) => byStatus.get(statusId) ?? [],
      taskById: (id) => snapshot.tasks.find((t) => t.id === id),

      createTask: (input) => apply(repository.createTask(input)),
      updateTask: (id, patch) => apply(repository.updateTask(id, patch)),
      deleteTask: (id) => apply(repository.deleteTask(id)),
      reorderTasks: (statusId, orderedIds) =>
        apply(repository.reorderTasks(statusId, orderedIds)),
      moveTask: (id, toStatusId) => apply(repository.moveTask(id, toStatusId)),

      createStatus: (name, color) => apply(repository.createStatus(name, color)),
      updateStatus: (id, patch) => apply(repository.updateStatus(id, patch)),
      deleteStatus: (id, fallbackStatusId) =>
        apply(repository.deleteStatus(id, fallbackStatusId)),
      reorderStatuses: (orderedIds) => apply(repository.reorderStatuses(orderedIds)),

      createTag: (name, color) => apply(repository.createTag(name, color)),
      updateTag: (id, patch) => apply(repository.updateTag(id, patch)),
      deleteTag: (id) => apply(repository.deleteTag(id)),

      clearAll: () => apply(repository.clearAll()),
    };
  }, [snapshot, ready, apply]);

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard は BoardProvider の内側で呼ぶこと');
  return ctx;
}
