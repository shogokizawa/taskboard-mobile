import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';
import type { Status } from '../types/task';

type Props = {
  visible: boolean;
  title?: string;
  statuses: Status[];
  /** 現在のステータス。チェックを付けて選択不可にする */
  currentStatusId?: string;
  onSelect: (statusId: string) => void;
  onClose: () => void;
};

/** 列間の移動先を選ぶボトムシート */
export function StatusPickerSheet({
  visible,
  title = '移動先のステータス',
  statuses,
  currentStatusId,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>

        {statuses.map((status) => {
          const current = status.id === currentStatusId;
          return (
            <Pressable
              key={status.id}
              onPress={() => {
                if (!current) onSelect(status.id);
              }}
              disabled={current}
              accessibilityRole="button"
              accessibilityLabel={status.name}
              accessibilityState={{ disabled: current, selected: current }}
              style={({ pressed }) => [
                styles.option,
                pressed && !current && { backgroundColor: colors.elevated },
                current && { backgroundColor: withAlpha(status.color, 0.1) },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: status.color }]} />
              <Text style={[styles.optionLabel, current && { color: colors.textMuted }]}>
                {status.name}
              </Text>
              {current && (
                <Text style={styles.currentBadge}>現在</Text>
              )}
              {!current && (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg * 1.4,
    borderTopRightRadius: radius.lg * 1.4,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  option: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  currentBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
