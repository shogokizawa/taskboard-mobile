import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { SubTask } from '../types/task';

const INDENT = 20;

type Props = {
  node: SubTask;
  /** ネストの深さ。0 がトップレベル */
  depth: number;
  onToggle: () => void;
  onChangeTitle: (title: string) => void;
  onAddChild: () => void;
  onRemove: () => void;
};

export function SubTaskItem({
  node,
  depth,
  onToggle,
  onChangeTitle,
  onAddChild,
  onRemove,
}: Props) {
  return (
    <View style={[styles.row, { marginLeft: depth * INDENT }]}>
      {depth > 0 && <View style={styles.branch} />}

      <Pressable
        onPress={onToggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: node.completed }}
        accessibilityLabel={node.title || 'サブタスク'}
        style={styles.checkbox}
      >
        <Ionicons
          name={node.completed ? 'checkbox' : 'square-outline'}
          size={22}
          color={node.completed ? colors.accent : colors.textMuted}
        />
      </Pressable>

      <TextInput
        value={node.title}
        onChangeText={onChangeTitle}
        placeholder="サブタスク名"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, node.completed && styles.inputDone]}
        multiline
      />

      <Pressable
        onPress={onAddChild}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="子サブタスクを追加"
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={18} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="サブタスクを削除"
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

/** サブタスクが1件も無いときの表示 */
export function SubTaskEmpty() {
  return <Text style={styles.empty}>サブタスクはまだありません</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  branch: {
    width: 8,
    height: 1,
    backgroundColor: colors.borderStrong,
    marginRight: 2,
  },
  checkbox: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  iconButton: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  pressed: {
    backgroundColor: colors.elevated,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
});
