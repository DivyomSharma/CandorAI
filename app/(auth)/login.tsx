import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const { signInWithOtp, verifyOtp } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await signInWithOtp(email.trim());

    setLoading(false);

    if (authError) {
      setError(authError.message.toLowerCase());
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await verifyOtp(email.trim(), otp.trim());

    setLoading(false);

    if (authError) {
      setError(authError.message.toLowerCase());
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.foreground }]}>{"\u2726"}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>candor</Text>
          <Text style={[styles.subtitle, { color: colors.foregroundSecondary }]}>
            honest connection through{'\n'}authentic conversation
          </Text>
        </View>

        <View
          style={[
            styles.card,
            Shadows.md,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {step === 'email' ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>welcome</Text>
              <Text style={[styles.cardSubtitle, { color: colors.foregroundSecondary }]}>
                enter your email to get started
              </Text>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                error={error}
                keyboardType="email-address"
                label="email"
                onChangeText={setEmail}
                placeholder="you@example.com"
                value={email}
              />
              <Button loading={loading} onPress={handleSendOtp} title="continue" />
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>check your email</Text>
              <Text style={[styles.cardSubtitle, { color: colors.foregroundSecondary }]}>
                we sent a code to {email}
              </Text>
              <Input
                error={error}
                keyboardType="number-pad"
                label="verification code"
                maxLength={6}
                onChangeText={setOtp}
                placeholder="000000"
                value={otp}
              />
              <Button loading={loading} onPress={handleVerifyOtp} title="verify" />
              <View style={styles.secondaryAction}>
                <Button
                  onPress={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  title="use a different email"
                  variant="ghost"
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  secondaryAction: {
    marginTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  title: {
    ...Typography.heading,
    marginBottom: Spacing.xs,
  },
});
