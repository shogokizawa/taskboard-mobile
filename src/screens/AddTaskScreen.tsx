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

import { TagChip } from '../components/TagChip';
import { Button, Field, Section } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useBoard } from '../store/BoardContext';
import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';

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
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && statusId !== '' && !saving;

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedTagIds.includes(t.id)),
    [tags, selectedTagIds],
  );

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
});
