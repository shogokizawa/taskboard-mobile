import type { SubTask } from '../types/task';
import { uid } from './uid';

export type SubTaskCounts = { total: number; done: number };

/** サブタスクの最大ネスト段数（トップレベルを1段目として数える） */
export const MAX_SUBTASK_DEPTH = 5;

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
  return { id: uid(), title, completed: false, memo: '', links: [], children: [] };
}

/** DBの旧データ(memo/links追加前に作成されたサブタスク)を補完する */
export function normalizeSubTasks(subtasks: SubTask[]): SubTask[] {
  return subtasks.map((st) => ({
    ...st,
    memo: st.memo ?? '',
    links: st.links ?? [],
    children: normalizeSubTasks(st.children ?? []),
  }));
}

/** id に一致するノードへ patch を当てた新しいツリーを返す */
export function updateSubTask(
  subtasks: SubTask[],
  id: string,
  patch: Partial<Pick<SubTask, 'title' | 'completed' | 'memo' | 'links'>>,
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

/** parentId が null ならトップレベルへ追加。MAX_SUBTASK_DEPTH を超える追加は無視する */
export function addSubTask(
  subtasks: SubTask[],
  parentId: string | null,
  node: SubTask,
): SubTask[] {
  if (parentId === null) return [...subtasks, node];
  return addSubTaskAt(subtasks, parentId, node, 0);
}

function addSubTaskAt(
  subtasks: SubTask[],
  parentId: string,
  node: SubTask,
  depth: number,
): SubTask[] {
  return subtasks.map((st) => {
    if (st.id === parentId) {
      if (depth + 1 >= MAX_SUBTASK_DEPTH) return st;
      return { ...st, children: [...st.children, node] };
    }
    return { ...st, children: addSubTaskAt(st.children, parentId, node, depth + 1) };
  });
}

/** そのノードにこれ以上子を追加できるか（現在の depth は 0 始まり） */
export function canAddChildAt(depth: number): boolean {
  return depth + 1 < MAX_SUBTASK_DEPTH;
}

/** 子孫ごと削除する */
export function removeSubTask(subtasks: SubTask[], id: string): SubTask[] {
  return subtasks
    .filter((st) => st.id !== id)
    .map((st) => ({ ...st, children: removeSubTask(st.children, id) }));
}

/** 子を持つノードのidを再帰的に集める（初期表示を全て畳んだ状態にするため） */
export function collectParentIds(subtasks: SubTask[]): Set<string> {
  const ids = new Set<string>();
  for (const st of subtasks) {
    if (st.children.length > 0) {
      ids.add(st.id);
      for (const id of collectParentIds(st.children)) ids.add(id);
    }
  }
  return ids;
}

export type FlatSubTask = {
  node: SubTask;
  depth: number;
};

/**
 * ツリーを描画用に一次元へ潰す。
 * collapsedIds に含まれるノードの子孫はスキップする（畳んで隠す）。
 */
export function flattenSubTasks(
  subtasks: SubTask[],
  collapsedIds: Set<string> = new Set(),
  depth = 0,
): FlatSubTask[] {
  const out: FlatSubTask[] = [];
  for (const node of subtasks) {
    out.push({ node, depth });
    if (!collapsedIds.has(node.id)) {
      out.push(...flattenSubTasks(node.children, collapsedIds, depth + 1));
    }
  }
  return out;
}
