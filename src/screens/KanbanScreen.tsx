import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KanbanColumn } from '../components/KanbanColumn';
import { StatusPickerSheet } from '../components/StatusPickerSheet';
import { StatusTab } from '../components/StatusTab';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useBoard } from '../store/BoardContext';
import { colors, radius, spacing } from '../theme';
import type { Task } from '../types/task';

// タブ画面から親スタックの TaskDetail / AddTask へ遷移するため合成する
type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Kanban'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** これ以上スワイプしても列が動かないときの、指に対する追従率(ラバーバンド) */
const EDGE_RESISTANCE = 0.3;
/** 指を離したときにページ送りとみなす移動量の閾値(画面幅に対する比率) */
const SWIPE_DISTANCE_RATIO = 0.25;
const SWIPE_VELOCITY_THRESHOLD = 600;

export function KanbanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { ready, statuses, tasksByStatus, moveTask } = useBoard();

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

  const activeIndex = Math.max(
    0,
    statuses.findIndex((s) => s.id === activeStatusId),
  );

  const translateX = useSharedValue(0);

  // タブタップなど、スワイプ以外の要因で activeIndex が変わったときも列位置を追従させる
  useEffect(() => {
    translateX.value = withTiming(-activeIndex * screenWidth, { duration: 220 });
  }, [activeIndex, screenWidth, translateX]);

  const setIndex = useCallback(
    (index: number) => {
      const status = statuses[index];
      if (status) setActiveStatusId(status.id);
    },
    [statuses],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const base = -activeIndex * screenWidth;
      const min = -(statuses.length - 1) * screenWidth;
      const max = 0;
      let next = base + e.translationX;
      if (next > max) next = max + (next - max) * EDGE_RESISTANCE;
      else if (next < min) next = min + (next - min) * EDGE_RESISTANCE;
      translateX.value = next;
    })
    .onEnd((e) => {
      const passedThreshold =
        Math.abs(e.translationX) > screenWidth * SWIPE_DISTANCE_RATIO ||
        Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD;

      let targetIndex = activeIndex;
      if (passedThreshold) {
        targetIndex = e.translationX < 0 ? activeIndex + 1 : activeIndex - 1;
      }
      targetIndex = Math.max(0, Math.min(statuses.length - 1, targetIndex));

      translateX.value = withTiming(-targetIndex * screenWidth, { duration: 220 });
      if (targetIndex !== activeIndex) runOnJS(setIndex)(targetIndex);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePressTask = useCallback(
    (taskId: string) => navigation.navigate('TaskDetail', { taskId }),
    [navigation],
  );

  const handleRequestMove = useCallback((task: Task) => setMovingTask(task), []);

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

      <GestureDetector gesture={pan}>
        <View style={styles.pagerViewport}>
          <Animated.View
            style={[styles.pagerRow, { width: screenWidth * statuses.length }, rowStyle]}
          >
            {statuses.map((status) => (
              <View key={status.id} style={{ width: screenWidth }}>
                <KanbanColumn
                  status={status}
                  onPressTask={handlePressTask}
                  onRequestMove={handleRequestMove}
                />
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

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
  pagerViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerRow: {
    flex: 1,
    flexDirection: 'row',
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
