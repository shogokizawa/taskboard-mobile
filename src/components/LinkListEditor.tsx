import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { TaskLink } from '../types/task';

type Props = {
  links: TaskLink[];
  onChange: (links: TaskLink[]) => void;
};

/** URL＋任意ラベルのリンク一覧を編集する。タスク本体・サブタスクの両方で使う */
export function LinkListEditor({ links, onChange }: Props) {
  const updateLink = (index: number, patch: Partial<TaskLink>) => {
    onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };
  const addLink = () => {
    onChange([...links, { url: '', label: '' }]);
  };

  return (
    <View style={styles.container}>
      {links.map((link, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={index} style={styles.row}>
          <View style={styles.inputs}>
            <TextInput
              value={link.url}
              onChangeText={(v) => updateLink(index, { url: v })}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.urlInput}
            />
            <TextInput
              value={link.label ?? ''}
              onChangeText={(v) => updateLink(index, { label: v })}
              placeholder="ラベル（任意）"
              placeholderTextColor={colors.textMuted}
              style={styles.labelInput}
            />
          </View>
          <Pressable
            onPress={() => removeLink(index)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="リンクを削除"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={addLink}
        accessibilityRole="button"
        accessibilityLabel="リンクを追加"
        style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={16} color={colors.accent} />
        <Text style={styles.addLabel}>リンクを追加</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  inputs: {
    flex: 1,
    gap: spacing.xs,
  },
  urlInput: {
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
  labelInput: {
    minHeight: 36,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
});
