import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBoard } from '../store/BoardContext';
import { colors, spacing } from '../theme';
import type { Status, Task } from '../types/task';
import { TaskCard } from './TaskCard';

type Props = {
  status: Status;
  onPressTask: (taskId: string) => void;
  onRequestMove: (task: Task) => void;
};

/** カンバンの1列分。タスク一覧の表示・並び替え・削除を担当する */
export function KanbanColumn({ status, onPressTask, onRequestMove }: Props) {
  const insets = useSafeAreaInsets();
  const { tasksByStatus, reorderTasks, deleteTask } = useBoard();
  const tasks = tasksByStatus(status.id);

  /**
   * ドラッグ直後の並びをローカルに持つ。
   * 保存が反映されるまで一瞬元の順序に戻って見えるのを防ぐため。
   */
  const [dragOrder, setDragOrder] = useState<Task[] | null>(null);
  useEffect(() => {
    setDragOrder(null);
  }, [tasks]);

  const data = dragOrder ?? tasks;

  const handleDragEnd = useCallback(
    ({ data: next }: { data: Task[] }) => {
      setDragOrder(next);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void reorderTasks(
        status.id,
        next.map((t) => t.id),
      );
    },
    [status.id, reorderTasks],
  );

  const confirmDelete = useCallback(
    (task: Task) => {
      Alert.alert('タスクを削除', `「${task.title || '無題のタスク'}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => void deleteTask(task.id),
        },
      ]);
    },
    [deleteTask],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Task>) => (
      <View style={styles.cardWrapper}>
        <TaskCard
          task={item}
          isActive={isActive}
          onPress={() => onPressTask(item.id)}
          onLongPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          onMove={() => onRequestMove(item)}
          onDelete={() => confirmDelete(item)}
        />
      </View>
    ),
    [onPressTask, onRequestMove, confirmDelete],
  );

  return (
    <DraggableFlatList
      data={data}
      onDragEnd={handleDragEnd}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      activationDistance={12}
      containerStyle={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="documents-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>タスクがありません</Text>
          <Text style={styles.emptyBody}>右下の＋から追加できます。</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cardWrapper: {
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
