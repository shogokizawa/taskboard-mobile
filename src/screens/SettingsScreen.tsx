import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusPickerSheet } from '../components/StatusPickerSheet';
import { Button, Section } from '../components/ui';
import { countSubtasks } from '../lib/subtasks';
import { useBoard } from '../store/BoardContext';
import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';

/** 色選択で出す固定パレット */
const PALETTE = [
  '#6B7280',
  '#3B82F6',
  '#F59E0B',
  '#10B981',
  '#F87171',
  '#F472B6',
  '#A78BFA',
  '#4ADE80',
  '#FBBF24',
  '#60A5FA',
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    statuses,
    tags,
    tasks,
    tasksByStatus,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    createTag,
    updateTag,
    deleteTag,
    clearAll,
  } = useBoard();

  /** 名前の編集中バッファ。確定するまでは保存しない */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** パレットを開いている項目のid */
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  /** 削除しようとしているステータス（移動先を選ばせる） */
  const [reassignFrom, setReassignFrom] = useState<string | null>(null);

  const subtaskTotals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const task of tasks) {
      const c = countSubtasks(task.subtasks);
      total += c.total;
      done += c.done;
    }
    return { total, done };
  }, [tasks]);

  const draftValue = (id: string, fallback: string) => drafts[id] ?? fallback;

  const setDraft = (id: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: value }));

  const clearDraft = (id: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const commitStatusName = (id: string, original: string) => {
    const value = (drafts[id] ?? original).trim();
    clearDraft(id);
    if (value.length > 0 && value !== original) void updateStatus(id, { name: value });
  };

  const commitTagName = (id: string, original: string) => {
    const value = (drafts[id] ?? original).trim();
    clearDraft(id);
    if (value.length > 0 && value !== original) void updateTag(id, { name: value });
  };

  const handleDeleteStatus = (id: string, name: string) => {
    if (statuses.length <= 1) {
      Alert.alert('削除できません', 'ステータスは最低1つ必要です。');
      return;
    }
    const count = tasksByStatus(id).length;
    if (count === 0) {
      Alert.alert('ステータスを削除', `「${name}」を削除しますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => void deleteStatus(id, null) },
      ]);
      return;
    }
    Alert.alert('ステータスを削除', `「${name}」には${count}件のタスクがあります。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '他の列へ移動', onPress: () => setReassignFrom(id) },
      {
        text: 'タスクも削除',
        style: 'destructive',
        onPress: () => void deleteStatus(id, null),
      },
    ]);
  };

  const handleDeleteTag = (id: string, name: string) => {
    const used = tasks.filter((t) => t.tags.some((tag) => tag.id === id)).length;
    Alert.alert(
      'タグを削除',
      used === 0
        ? `「${name}」を削除しますか？`
        : `「${name}」は${used}件のタスクで使われています。削除するとそれらからも外れます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => void deleteTag(id) },
      ],
    );
  };

  const move = (index: number, delta: number) => {
    const next = [...statuses];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void reorderStatuses(next.map((s) => s.id));
  };

  const handleClearAll = () => {
    Alert.alert(
      'すべてのデータを削除',
      'タスク・ステータス・タグをすべて消して初期状態に戻します。元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: () => void clearAll() },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="保存データ">
        <View style={styles.card}>
          <InfoRow label="タスク" value={`${tasks.length} 件`} />
          <InfoRow
            label="サブタスク"
            value={`${subtaskTotals.done} / ${subtaskTotals.total} 完了`}
          />
          <InfoRow label="ステータス" value={`${statuses.length} 件`} />
          <InfoRow label="タグ" value={`${tags.length} 件`} />
          <InfoRow label="保存先" value="この端末内" last />
        </View>
        <Text style={styles.note}>
          データは端末内にのみ保存されます。アプリを削除すると消えるため、大切な内容は別途控えを取ってください。
        </Text>
      </Section>

      <Section
        title="ステータス"
        action={
          <AddInline
            label="ステータスを追加"
            onAdd={() => void createStatus('新しいステータス', PALETTE[0])}
          />
        }
      >
        <View style={styles.card}>
          {statuses.map((status, index) => (
            <View key={status.id}>
              <View style={styles.editRow}>
                <ColorDot
                  color={status.color}
                  onPress={() =>
                    setPaletteFor((prev) => (prev === status.id ? null : status.id))
                  }
                />
                <TextInput
                  value={draftValue(status.id, status.name)}
                  onChangeText={(v) => setDraft(status.id, v)}
                  onEndEditing={() => commitStatusName(status.id, status.name)}
                  onBlur={() => commitStatusName(status.id, status.name)}
                  style={styles.nameInput}
                  placeholder="ステータス名"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.count}>{tasksByStatus(status.id).length}</Text>
                <IconButton
                  icon="chevron-up"
                  label={`${status.name}を上へ`}
                  disabled={index === 0}
                  onPress={() => move(index, -1)}
                />
                <IconButton
                  icon="chevron-down"
                  label={`${status.name}を下へ`}
                  disabled={index === statuses.length - 1}
                  onPress={() => move(index, 1)}
                />
                <IconButton
                  icon="trash-outline"
                  label={`${status.name}を削除`}
                  danger
                  onPress={() => handleDeleteStatus(status.id, status.name)}
                />
              </View>
              {paletteFor === status.id && (
                <Palette
                  selected={status.color}
                  onSelect={(color) => {
                    void updateStatus(status.id, { color });
                    setPaletteFor(null);
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </Section>

      <Section
        title="タグ"
        action={
          <AddInline
            label="タグを追加"
            onAdd={() => void createTag('新しいタグ', PALETTE[9])}
          />
        }
      >
        <View style={styles.card}>
          {tags.length === 0 ? (
            <Text style={styles.empty}>タグがありません</Text>
          ) : (
            tags.map((tag) => (
              <View key={tag.id}>
                <View style={styles.editRow}>
                  <ColorDot
                    color={tag.color}
                    onPress={() => setPaletteFor((prev) => (prev === tag.id ? null : tag.id))}
                  />
                  <TextInput
                    value={draftValue(tag.id, tag.name)}
                    onChangeText={(v) => setDraft(tag.id, v)}
                    onEndEditing={() => commitTagName(tag.id, tag.name)}
                    onBlur={() => commitTagName(tag.id, tag.name)}
                    style={styles.nameInput}
                    placeholder="タグ名"
                    placeholderTextColor={colors.textMuted}
                  />
                  <IconButton
                    icon="trash-outline"
                    label={`${tag.name}を削除`}
                    danger
                    onPress={() => handleDeleteTag(tag.id, tag.name)}
                  />
                </View>
                {paletteFor === tag.id && (
                  <Palette
                    selected={tag.color}
                    onSelect={(color) => {
                      void updateTag(tag.id, { color });
                      setPaletteFor(null);
                    }}
                  />
                )}
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="データ管理">
        <Button
          label="すべてのデータを削除"
          icon="trash-outline"
          variant="danger"
          onPress={handleClearAll}
        />
      </Section>

      <StatusPickerSheet
        visible={reassignFrom !== null}
        title="タスクの移動先"
        statuses={statuses.filter((s) => s.id !== reassignFrom)}
        onSelect={(toStatusId) => {
          if (reassignFrom !== null) void deleteStatus(reassignFrom, toStatusId);
          setReassignFrom(null);
        }}
        onClose={() => setReassignFrom(null)}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last !== true && styles.divider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ColorDot({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="色を変更"
      hitSlop={8}
      style={({ pressed }) => [styles.colorDotWrap, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.colorDot, { backgroundColor: color }]} />
    </Pressable>
  );
}

function Palette({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <View style={styles.palette}>
      {PALETTE.map((color) => (
        <Pressable
          key={color}
          onPress={() => onSelect(color)}
          accessibilityRole="button"
          accessibilityLabel={`色 ${color}`}
          accessibilityState={{ selected: color === selected }}
          style={({ pressed }) => [
            styles.swatchWrap,
            color === selected && { borderColor: colors.textPrimary },
            pressed && { opacity: 0.6 },
          ]}
        >
          <View style={[styles.swatch, { backgroundColor: color }]} />
        </Pressable>
      ))}
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: colors.elevated },
        disabled && { opacity: 0.25 },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? colors.danger : colors.textSecondary}
      />
    </Pressable>
  );
}

function AddInline({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.addInline, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="add" size={16} color={colors.accent} />
      <Text style={styles.addInlineLabel}>追加</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  infoRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  editRow: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorDotWrap: {
    width: 32,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  nameInput: {
    flex: 1,
    minHeight: MIN_TOUCH,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    minWidth: 20,
    textAlign: 'right',
  },
  iconButton: {
    width: 34,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingLeft: 32,
  },
  swatchWrap: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  addInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.accent, 0.12),
  },
  addInlineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
});
