import type { SubTask } from '../types/task';
import { uid } from './uid';

export type SubTaskCounts = { total: number; done: number };

/** ネストした子孫も含めて数える */
export function countSubtasks(subtasks: SubTask[]): SubTaskCounts {
  let total = 0;
  let done = 0;
  for (const st of subtasks) {
    total += 1;
    if (st.completed) done += 1;
    const child = countSubtasks(st.children);
    total += child.total;
    done += child.done;
  }
  return { total, done };
}

export function createSubTask(title = ''): SubTask {
  return { id: uid(), title, completed: false, children: [] };
}

/** id に一致するノードへ patch を当てた新しいツリーを返す */
export function updateSubTask(
  subtasks: SubTask[],
  id: string,
  patch: Partial<Pick<SubTask, 'title' | 'completed'>>,
): SubTask[] {
  return subtasks.map((st) =>
    st.id === id
      ? { ...st, ...patch }
      : { ...st, children: updateSubTask(st.children, id, patch) },
  );
}

/**
 * チェックを付け外しする。
 * 親をチェックしたら子孫もすべて追従させる（Webアプリと同じ挙動）。
 */
export function toggleSubTask(subtasks: SubTask[], id: string): SubTask[] {
  return subtasks.map((st) => {
    if (st.id === id) {
      const completed = !st.completed;
      return { ...st, completed, children: setAllCompleted(st.children, completed) };
    }
    return { ...st, children: toggleSubTask(st.children, id) };
  });
}

function setAllCompleted(subtasks: SubTask[], completed: boolean): SubTask[] {
  return subtasks.map((st) => ({
    ...st,
    completed,
    children: setAllCompleted(st.children, completed),
  }));
}

/** parentId が null ならトップレベルへ追加 */
export function addSubTask(
  subtasks: SubTask[],
  parentId: string | null,
  node: SubTask,
): SubTask[] {
  if (parentId === null) return [...subtasks, node];
  return subtasks.map((st) =>
    st.id === parentId
      ? { ...st, children: [...st.children, node] }
      : { ...st, children: addSubTask(st.children, parentId, node) },
  );
}

/** 子孫ごと削除する */
export function removeSubTask(subtasks: SubTask[], id: string): SubTask[] {
  return subtasks
    .filter((st) => st.id !== id)
    .map((st) => ({ ...st, children: removeSubTask(st.children, id) }));
}

export type FlatSubTask = {
  node: SubTask;
  depth: number;
};

/** ツリーを描画用に一次元へ潰す */
export function flattenSubTasks(subtasks: SubTask[], depth = 0): FlatSubTask[] {
  const out: FlatSubTask[] = [];
  for (const node of subtasks) {
    out.push({ node, depth });
    out.push(...flattenSubTasks(node.children, depth + 1));
  }
  return out;
}
