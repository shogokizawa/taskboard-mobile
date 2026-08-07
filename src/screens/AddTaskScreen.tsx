import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinkListEditor } from '../components/LinkListEditor';
import { SubTaskEmpty, SubTaskItem } from '../components/SubTaskItem';
import { TagChip } from '../components/TagChip';
import { Button, Field, Section } from '../components/ui';
import { PRIORITIES, PRIORITY_COLOR } from '../lib/priority';
import {
  addSubTask,
  canAddChildAt,
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
import type { Priority, SubTask, TaskLink } from '../types/task';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;

export function AddTaskScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { statuses, tags, createTask } = useBoard();

  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [statusId, setStatusId] = useState<string>(
    // カンバン画面で開いていた列を初期値にする
    route.params?.statusId ?? statuses[0]?.id ?? '',
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && statusId !== '' && !saving;

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedTagIds.includes(t.id)),
    [tags, selectedTagIds],
  );

  const flat = useMemo(() => flattenSubTasks(subtasks), [subtasks]);
  const counts = useMemo(() => countSubtasks(subtasks), [subtasks]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        memo: memo.trim(),
        status_id: statusId,
        tags: selectedTags,
        priority,
        subtasks: pruneEmpty(subtasks),
        links: pruneLinks(links),
      });
      navigation.goBack();
    } catch {
      setSaving(false);
    }
  };

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
          hint="必須"
          value={title}
          onChangeText={setTitle}
          placeholder="やることを入力"
          autoFocus
          returnKeyType="next"
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

        <Section title="優先度">
          <View style={styles.row}>
            {PRIORITIES.map((p) => {
              const selected = p === priority;
              const color = PRIORITY_COLOR[p];
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriority(selected ? null : p)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`優先度 ${p}`}
                  style={({ pressed }) => [
                    styles.statusOption,
                    selected && {
                      backgroundColor: withAlpha(color, 0.16),
                      borderColor: withAlpha(color, 0.5),
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={[styles.statusLabel, selected && styles.statusLabelSelected]}>
                    {p}
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
                  onPress={() => toggleTag(tag.id)}
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
                  canAddChild={canAddChildAt(depth)}
                  onToggle={() => setSubtasks((prev) => toggleSubTask(prev, node.id))}
                  onChangeTitle={(value) =>
                    setSubtasks((prev) => updateSubTask(prev, node.id, { title: value }))
                  }
                  onChangeMemo={(value) =>
                    setSubtasks((prev) => updateSubTask(prev, node.id, { memo: value }))
                  }
                  onChangeLinks={(value) =>
                    setSubtasks((prev) => updateSubTask(prev, node.id, { links: value }))
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

        <Section title="リンク">
          <LinkListEditor links={links} onChange={setLinks} />
        </Section>

        <Field
          label="メモ"
          value={memo}
          onChangeText={setMemo}
          placeholder="補足があれば"
          multiline
          style={styles.memoInput}
        />

        <Button label="保存" icon="checkmark" onPress={handleSave} disabled={!canSave} />
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

/** URLが空のリンクは保存時に捨てる */
function pruneLinks(links: TaskLink[]): TaskLink[] {
  return links
    .filter((l) => l.url.trim().length > 0)
    .map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined }));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
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
  memoInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
});
