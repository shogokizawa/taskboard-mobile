import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, withAlpha } from '../theme';
import type { Tag } from '../types/task';

type Props = {
  tag: Tag;
  /** 選択トグルとして使う場合に渡す。省略すると表示専用 */
  onPress?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
};

export function TagChip({ tag, onPress, selected, size = 'sm' }: Props) {
  const selectable = onPress !== undefined;
  // 表示専用のときは常に色付き。選択式のときは未選択をグレーに落とす
  const active = !selectable || selected === true;

  const body = (
    <View
      style={[
        styles.chip,
        size === 'md' && styles.chipMd,
        {
          backgroundColor: active ? withAlpha(tag.color, 0.16) : colors.elevated,
          borderColor: active ? withAlpha(tag.color, 0.45) : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'md' && styles.labelMd,
          { color: active ? tag.color : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {tag.name}
      </Text>
    </View>
  );

  if (!selectable) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`タグ ${tag.name}`}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  chipMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelMd: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
