import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubTaskEmpty, SubTaskItem } from '../components/SubTaskItem';
import { TagChip } from '../components/TagChip';
import { Button, Field, Section } from '../components/ui';
import {
  addSubTask,
  countSubtasks,
  createSubTask,
  flattenSubTasks,
  removeSubTask,
  toggleSubTask,
  updateSubTask,
} from '../lib/subtasks';
import type { RootStackParamList } from '../navigation/types';
import { useBoard } from '../store/BoardContext';
import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';
import type { SubTask } from '../types/task';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

export function TaskDetailScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const insets = useSafeAreaInsets();
  const { statuses, tags, taskById, updateTask, deleteTask } = useBoard();
  const task = taskById(taskId);

  // 編集内容は下書きとして持ち、「保存」を押すまで反映しない
  const [title, setTitle] = useState(task?.title ?? '');
  const [memo, setMemo] = useState(task?.memo ?? '');
  const [statusId, setStatusId] = useState(task?.status_id ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task?.tags.map((t) => t.id) ?? [],
  );
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks ?? []);
  /** 保存/削除の実行中。beforeRemove の確認を抑止するのにも使う */
  const [committing, setCommitting] = useState(false);

  const dirty = useMemo(() => {
    if (!task) return false;
    return (
      title !== task.title ||
      memo !== task.memo ||
      statusId !== task.status_id ||
      JSON.stringify(selectedTagIds) !== JSON.stringify(task.tags.map((t) => t.id)) ||
      JSON.stringify(subtasks) !== JSON.stringify(task.subtasks)
    );
  }, [task, title, memo, statusId, selectedTagIds, subtasks]);

  // 未保存のまま戻ろうとしたら引き止める
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!dirty || committing) return;
      event.preventDefault();
      Alert.alert('変更を破棄しますか？', '保存していない変更があります。', [
        { text: '編集を続ける', style: 'cancel' },
        {
          text: '破棄',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, dirty, committing]);

  const flat = useMemo(() => flattenSubTasks(subtasks), [subtasks]);
  const counts = useMemo(() => countSubtasks(subtasks), [subtasks]);

  const handleSave = useCallback(async () => {
    if (!task) return;
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      Alert.alert('タイトルが空です', 'タイトルを入力してください。');
      return;
    }
    setCommitting(true);
    try {
      await updateTask(task.id, {
        title: trimmed,
        memo: memo.trim(),
        status_id: statusId,
        tags: tags.filter((t) => selectedTagIds.includes(t.id)),
        // 空のサブタスクは保存時に捨てる
        subtasks: pruneEmpty(subtasks),
      });
      navigation.goBack();
    } catch {
      setCommitting(false);
    }
  }, [task, title, memo, statusId, tags, selectedTagIds, subtasks, updateTask, navigation]);

  const handleDelete = useCallback(() => {
    if (!task) return;
    Alert.alert('タスクを削除', `「${task.title || '無題のタスク'}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          setCommitting(true);
          void deleteTask(task.id).then(() => navigation.goBack());
        },
      },
    ]);
  }, [task, deleteTask, navigation]);

  if (!task) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text style={styles.missing}>このタスクは削除されています</Text>
        <Button label="戻る" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="タイトル"
          value={title}
          onChangeText={setTitle}
          placeholder="やることを入力"
          multiline
        />

        <Section title="ステータス">
          <View style={styles.row}>
            {statuses.map((status) => {
              const selected = status.id === statusId;
              return (
                <Pressable
                  key={status.id}
                  onPress={() => setStatusId(status.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={status.name}
                  style={({ pressed }) => [
                    styles.statusOption,
                    selected && {
                      backgroundColor: withAlpha(status.color, 0.16),
                      borderColor: withAlpha(status.color, 0.5),
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusLabel, selected && styles.statusLabelSelected]}>
                    {status.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="タグ">
          {tags.length === 0 ? (
            <Text style={styles.hintText}>タグは設定画面から追加できます。</Text>
          ) : (
            <View style={styles.row}>
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  size="md"
                  selected={selectedTagIds.includes(tag.id)}
                  onPress={() =>
                    setSelectedTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id],
                    )
                  }
                />
              ))}
            </View>
          )}
        </Section>

        <Section
          title={counts.total > 0 ? `サブタスク（${counts.done}/${counts.total}）` : 'サブタスク'}
          action={
            <Pressable
              onPress={() => setSubtasks((prev) => addSubTask(prev, null, createSubTask()))}
              accessibilityRole="button"
              accessibilityLabel="サブタスクを追加"
              hitSlop={8}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={styles.addLabel}>追加</Text>
            </Pressable>
          }
        >
          {flat.length === 0 ? (
            <SubTaskEmpty />
          ) : (
            <View>
              {flat.map(({ node, depth }) => (
                <SubTaskItem
                  key={node.id}
                  node={node}
                  depth={depth}
                  onToggle={() => setSubtasks((prev) => toggleSubTask(prev, node.id))}
                  onChangeTitle={(value) =>
                    setSubtasks((prev) => updateSubTask(prev, node.id, { title: value }))
                  }
                  onAddChild={() =>
                    setSubtasks((prev) => addSubTask(prev, node.id, createSubTask()))
                  }
                  onRemove={() => setSubtasks((prev) => removeSubTask(prev, node.id))}
                />
              ))}
            </View>
          )}
        </Section>

        <Field
          label="メモ"
          value={memo}
          onChangeText={setMemo}
          placeholder="補足があれば"
          multiline
          style={styles.memoInput}
        />

        <View style={styles.footer}>
          <Button label="保存" icon="checkmark" onPress={handleSave} disabled={committing} />
          <Button
            label="このタスクを削除"
            icon="trash-outline"
            variant="danger"
            onPress={handleDelete}
            disabled={committing}
          />
        </View>

        <Text style={styles.timestamps}>
          作成: {formatDate(task.created_at)}　更新: {formatDate(task.updated_at)}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** タイトルが空のサブタスクを、子ごと落とす */
function pruneEmpty(subtasks: SubTask[]): SubTask[] {
  return subtasks
    .filter((st) => st.title.trim().length > 0)
    .map((st) => ({ ...st, title: st.title.trim(), children: pruneEmpty(st.children) }));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  missing: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusLabelSelected: {
    color: colors.textPrimary,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  memoInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  footer: {
    gap: spacing.md,
  },
  timestamps: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
