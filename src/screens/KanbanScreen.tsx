import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPickerSheet } from '../components/StatusPickerSheet';
import { StatusTab } from '../components/StatusTab';
import { TaskCard } from '../components/TaskCard';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useBoard } from '../store/BoardContext';
import { colors, radius, spacing } from '../theme';
import type { Task } from '../types/task';

// タブ画面から親スタックの TaskDetail / AddTask へ遷移するため合成する
type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Kanban'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function KanbanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { ready, statuses, tasksByStatus, reorderTasks, moveTask, deleteTask } = useBoard();

  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  /** 移動シートを開いているタスク */
  const [movingTask, setMovingTask] = useState<Task | null>(null);

  // ステータスが増減してもタブの選択が迷子にならないようにする
  useEffect(() => {
    if (statuses.length === 0) {
      setActiveStatusId(null);
      return;
    }
    if (activeStatusId === null || !statuses.some((s) => s.id === activeStatusId)) {
      setActiveStatusId(statuses[0].id);
    }
  }, [statuses, activeStatusId]);

  const tasks = useMemo(
    () => (activeStatusId === null ? [] : tasksByStatus(activeStatusId)),
    [activeStatusId, tasksByStatus],
  );

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
      if (activeStatusId === null) return;
      setDragOrder(next);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void reorderTasks(
        activeStatusId,
        next.map((t) => t.id),
      );
    },
    [activeStatusId, reorderTasks],
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
          onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          onLongPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          onMove={() => setMovingTask(item)}
          onDelete={() => confirmDelete(item)}
        />
      </View>
    ),
    [navigation, confirmDelete],
  );

  if (!ready) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (statuses.length === 0) {
    return (
      <View style={[styles.screen, styles.center, { padding: spacing.xl }]}>
        <Text style={styles.emptyTitle}>ステータスがありません</Text>
        <Text style={styles.emptyBody}>設定画面からステータスを追加してください。</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsRow}
      >
        {statuses.map((status) => (
          <StatusTab
            key={status.id}
            status={status}
            count={tasksByStatus(status.id).length}
            selected={status.id === activeStatusId}
            onPress={() => setActiveStatusId(status.id)}
          />
        ))}
      </ScrollView>

      <DraggableFlatList
        data={data}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        activationDistance={12}
        containerStyle={styles.list}
        contentContainerStyle={[
          styles.listContent,
          // FABと重ならないように下を空ける
          { paddingBottom: insets.bottom + 96 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>タスクがありません</Text>
            <Text style={styles.emptyBody}>右下の＋から追加できます。</Text>
          </View>
        }
      />

      <Pressable
        onPress={() =>
          navigation.navigate('AddTask', { statusId: activeStatusId ?? undefined })
        }
        accessibilityRole="button"
        accessibilityLabel="タスクを追加"
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + spacing.lg },
          pressed && { backgroundColor: colors.accentPressed, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Ionicons name="add" size={30} color={colors.textPrimary} />
      </Pressable>

      <StatusPickerSheet
        visible={movingTask !== null}
        statuses={statuses}
        currentStatusId={movingTask?.status_id}
        onSelect={(statusId) => {
          if (movingTask) {
            void Haptics.selectionAsync();
            void moveTask(movingTask.id, statusId);
          }
          setMovingTask(null);
        }}
        onClose={() => setMovingTask(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tabsRow: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
