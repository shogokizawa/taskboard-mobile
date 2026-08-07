import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { SubTask, TaskLink } from '../types/task';
import { LinkListEditor } from './LinkListEditor';

const INDENT = 20;

type Props = {
  node: SubTask;
  /** ネストの深さ。0 がトップレベル */
  depth: number;
  /** これ以上子サブタスクを追加できるか */
  canAddChild: boolean;
  /** 子サブタスクを持つか（開閉トグルの表示要否） */
  hasChildren: boolean;
  /** 子サブタスクを畳んで隠しているか */
  collapsed: boolean;
  onToggle: () => void;
  onToggleCollapse: () => void;
  onChangeTitle: (title: string) => void;
  onChangeMemo: (memo: string) => void;
  onChangeLinks: (links: TaskLink[]) => void;
  onAddChild: () => void;
  onRemove: () => void;
};

export function SubTaskItem({
  node,
  depth,
  canAddChild,
  hasChildren,
  collapsed,
  onToggle,
  onToggleCollapse,
  onChangeTitle,
  onChangeMemo,
  onChangeLinks,
  onAddChild,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = node.memo.trim().length > 0 || node.links.length > 0;

  // 画面を離れて戻ってきたときは、常に畳んだ状態からやり直す
  useFocusEffect(
    useCallback(() => {
      setExpanded(false);
    }, []),
  );

  return (
    <View style={{ marginLeft: depth * INDENT }}>
      <View style={styles.row}>
        {depth > 0 && <View style={styles.branch} />}

        {hasChildren ? (
          <Pressable
            onPress={onToggleCollapse}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="子サブタスクの表示切り替え"
            accessibilityState={{ expanded: !collapsed }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons
              name={collapsed ? 'chevron-forward' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}

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
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="メモ・リンクを表示"
          accessibilityState={{ expanded }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={hasDetail ? colors.accent : colors.textMuted}
          />
        </Pressable>

        <Pressable
          onPress={onAddChild}
          disabled={!canAddChild}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="子サブタスクを追加"
          accessibilityState={{ disabled: !canAddChild }}
          style={({ pressed }) => [styles.iconButton, pressed && canAddChild && styles.pressed]}
        >
          <Ionicons
            name="add"
            size={18}
            color={canAddChild ? colors.textSecondary : colors.textMuted}
          />
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

      {expanded && (
        <View style={styles.detail}>
          <TextInput
            value={node.memo}
            onChangeText={onChangeMemo}
            placeholder="メモ"
            placeholderTextColor={colors.textMuted}
            style={styles.memoInput}
            multiline
          />
          <LinkListEditor links={node.links} onChange={onChangeLinks} />
        </View>
      )}
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
  detail: {
    marginLeft: 34,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  memoInput: {
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: 13,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
});
