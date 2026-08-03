import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { MIN_TOUCH, colors, radius, spacing, withAlpha } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  const tint =
    variant === 'primary'
      ? colors.textPrimary
      : variant === 'danger'
        ? colors.danger
        : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && {
          backgroundColor: pressed ? colors.accentPressed : colors.accent,
        },
        variant === 'secondary' && {
          backgroundColor: pressed ? colors.elevated : colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        variant === 'danger' && {
          backgroundColor: withAlpha(colors.danger, pressed ? 0.28 : 0.14),
          borderWidth: 1,
          borderColor: withAlpha(colors.danger, 0.4),
        },
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={tint} />}
      <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  /** ラベル横に出す補足（「必須」など） */
  hint?: string;
};

export function Field({ label, hint, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  /** 見出しの右端に置く要素（「追加」ボタンなど） */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  input: {
    minHeight: MIN_TOUCH,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
