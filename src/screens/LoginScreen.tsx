import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field } from '../components/ui';
import { useAuth } from '../store/AuthContext';
import { colors, spacing } from '../theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const fn = mode === 'signIn' ? signIn : signUp;
    const message = await fn(email.trim(), password);
    setSubmitting(false);
    if (message) {
      setError(message);
      return;
    }
    if (mode === 'signUp') {
      setNotice('確認メールを送信しました。メール内のリンクから認証してください。');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>taskboard</Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn' ? 'ログインしてください' : 'アカウントを作成します'}
        </Text>

        <View style={styles.form}>
          <Field
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
          <Field
            label="パスワード"
            hint="6文字以上"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Button
            label={mode === 'signIn' ? 'ログイン' : '登録する'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
          <Button
            label={mode === 'signIn' ? 'アカウントを作成する' : 'ログインへ戻る'}
            variant="secondary"
            onPress={() => {
              setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
              setError(null);
              setNotice(null);
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  notice: {
    color: colors.success,
    fontSize: 13,
  },
});
