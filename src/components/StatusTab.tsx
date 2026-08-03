import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';
import type { Status } from '../types/task';

type Props = {
  status: Status;
  count: number;
  selected: boolean;
  onPress: () => void;
};

export function StatusTab({ status, count, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${status.name} ${count}件`}
      style={({ pressed }) => [
        styles.tab,
        selected && {
          backgroundColor: withAlpha(status.color, 0.16),
          borderColor: withAlpha(status.color, 0.5),
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: status.color }]} />
      <Text
        style={[styles.name, selected && styles.nameSelected]}
        numberOfLines={1}
      >
        {status.name}
      </Text>
      <View style={[styles.badge, selected && { backgroundColor: withAlpha(status.color, 0.22) }]}>
        <Text style={[styles.count, selected && { color: status.color }]}>{count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
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
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    maxWidth: 140,
  },
  nameSelected: {
    color: colors.textPrimary,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
    alignItems: 'center',
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
