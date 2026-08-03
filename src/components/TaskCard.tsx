import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { countSubtasks } from '../lib/subtasks';
import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';
import type { Task } from '../types/task';
import { TagChip } from './TagChip';

type Props = {
  task: Task;
  onPress: () => void;
  /** ロングプレスでD&Dを開始する（DraggableFlatList の drag を渡す） */
  onLongPress?: () => void;
  /** ドラッグ中は浮き上がって見えるようにする */
  isActive?: boolean;
  /** 左スワイプで出る「移動」。列間の移動に使う */
  onMove?: () => void;
  onDelete?: () => void;
};

export function TaskCard({ task, onPress, onLongPress, isActive, onMove, onDelete }: Props) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const counts = countSubtasks(task.subtasks);
  const percent = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  const complete = counts.total > 0 && counts.done === counts.total;
  const memoPreview = task.memo.split('\n')[0];

  const handleAction = (action?: () => void) => {
    swipeableRef.current?.close();
    action?.();
  };

  const card = (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      accessibilityRole="button"
      accessibilityLabel={task.title || '無題のタスク'}
      accessibilityHint="タップで詳細、長押しで並び替え、左スワイプで移動と削除"
      style={({ pressed }) => [
        styles.card,
        isActive === true && styles.cardActive,
        pressed && !isActive && styles.cardPressed,
      ]}
    >
      <Text style={styles.title} numberOfLines={2}>
        {task.title || '無題のタスク'}
      </Text>

      {memoPreview.length > 0 && (
        <Text style={styles.memo} numberOfLines={1}>
          {memoPreview}
        </Text>
      )}

      {task.tags.length > 0 && (
        <View style={styles.tags}>
          {task.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </View>
      )}

      {counts.total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${percent}%`,
                  backgroundColor: complete ? colors.success : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, complete && { color: colors.success }]}>
            {counts.done}/{counts.total}
          </Text>
        </View>
      )}
    </Pressable>
  );

  // 移動も削除も無いときはスワイプ不要なのでラップしない
  if (!onMove && !onDelete) return card;

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      renderRightActions={() => (
        <View style={styles.actions}>
          {onMove && (
            <SwipeAction
              icon="swap-horizontal"
              label="移動"
              color={colors.accent}
              onPress={() => handleAction(onMove)}
            />
          )}
          {onDelete && (
            <SwipeAction
              icon="trash-outline"
              label="削除"
              color={colors.danger}
              onPress={() => handleAction(onDelete)}
            />
          )}
        </View>
      )}
    >
      {card}
    </ReanimatedSwipeable>
  );
}

function SwipeAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: withAlpha(color, pressed ? 0.34 : 0.18) },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: radius.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.elevated,
  },
  cardActive: {
    backgroundColor: colors.elevated,
    borderColor: colors.accent,
    // ドラッグ中の浮き上がり
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  memo: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  action: {
    width: 72,
    minHeight: MIN_TOUCH,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
