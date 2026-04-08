import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '@/components/ui';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

type Step = 'email' | 'sent';

function readAuthUrlError() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return '';
  }

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = hash.get('error_description') || search.get('error_description');
  const code = hash.get('error_code') || search.get('error_code');

  if (!description && !code) {
    return '';
  }

  if (code === 'otp_expired') {
    return 'that sign-in link expired. request a fresh one.';
  }

  return decodeURIComponent((description || 'something went wrong').replace(/\+/g, ' ')).toLowerCase();
}

export default function LoginScreen() {
  const { loading: authLoading, sendMagicLink, session } = useAuth();
  const { colors, mode } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const urlError = readAuthUrlError();
    if (urlError) {
      setError(urlError);
      setStep('email');
    }
  }, []);

  const isCompletingMagicLink = useMemo(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return false;
    }

    return (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token') ||
      window.location.search.includes('code=')
    );
  }, []);

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      setError('please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    const { error: authError } = await sendMagicLink(email.trim().toLowerCase());

    setLoading(false);

    if (authError) {
      setError(authError.message.toLowerCase());
      return;
    }

    setStep('sent');
    setInfo(`a sign-in link is on its way to ${email.trim().toLowerCase()}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <BrandBackdrop />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandImage style={styles.mark} variant="mark" />
          <BrandImage style={styles.wordmark} variant="wordmark" />
          <Text style={[styles.subtitle, { color: colors.foregroundSecondary }]}>
            honest connection through{'\n'}authentic conversation
          </Text>
        </View>

        <View
          style={[
            styles.card,
            Shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {isCompletingMagicLink || (authLoading && !session) ? (
            <View style={styles.statusBlock}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                finishing your sign in
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.foregroundSecondary }]}>
                just a moment while we open candor
              </Text>
            </View>
          ) : step === 'email' ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                sign in or create your account
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.foregroundSecondary }]}>
                we&apos;ll email you a magic link. no code to type.
              </Text>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                error={error}
                keyboardType="email-address"
                label="email"
                onChangeText={setEmail}
                onSubmitEditing={handleSendMagicLink}
                placeholder="your email"
                returnKeyType="go"
                textContentType="emailAddress"
                value={email}
              />
              <Button
                loading={loading}
                onPress={handleSendMagicLink}
                title="send magic link"
              />
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>check your email</Text>
              <Text style={[styles.cardSubtitle, { color: colors.foregroundSecondary }]}>
                {info || 'your sign-in link is ready.'}
              </Text>
              <View
                style={[
                  styles.notice,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.noticeText, { color: colors.foregroundSecondary }]}>
                  open the link on this device and you&apos;ll be signed in automatically.
                </Text>
              </View>
              {!!error && (
                <Text style={[styles.inlineError, { color: '#ef4444' }]}>{error}</Text>
              )}
              <Button loading={loading} onPress={handleSendMagicLink} title="resend link" />
              <View style={styles.secondaryAction}>
                <Button
                  onPress={() => {
                    setError('');
                    setInfo('');
                    setStep('email');
                  }}
                  title="use a different email"
                  variant="ghost"
                />
              </View>
            </>
          )}
        </View>

        <Text
          style={[
            styles.footerNote,
            { color: mode === 'dark' ? 'rgba(176, 163, 151, 0.72)' : colors.foregroundSecondary },
          ]}
        >
          if a previous link opens an old localhost address, ignore it and request a fresh one here.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    padding: Spacing.xl,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  cardTitle: {
    ...Typography.subheading,
    fontFamily: 'DMSans_400Regular',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  footerNote: {
    ...Typography.caption,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 56,
  },
  inlineError: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  mark: {
    height: 92,
    marginBottom: 4,
    width: 92,
  },
  notice: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  noticeText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  secondaryAction: {
    marginTop: Spacing.sm,
  },
  statusBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  subtitle: {
    ...Typography.body,
    lineHeight: 32,
    textAlign: 'center',
  },
  wordmark: {
    height: 92,
    marginBottom: Spacing.md,
    width: 320,
  },
});
