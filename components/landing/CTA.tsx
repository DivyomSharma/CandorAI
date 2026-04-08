import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase';
import { Radius, Spacing, Typography } from '@/utils/theme';

export type LandingMode = 'waitlist' | 'app';

interface CTAProps {
  mode: LandingMode;
  onEnter?: () => void;
}

export function CTA({ mode, onEnter }: CTAProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (mode === 'app') {
    return (
      <View style={styles.wrap}>
        <Button onPress={() => onEnter?.()} title="enter candor" />
      </View>
    );
  }

  const joinWaitlist = async () => {
    if (!email.trim()) {
      setMessage('enter your email');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('waitlist').insert({
      email: email.trim().toLowerCase(),
    });

    setLoading(false);

    if (error) {
      setMessage('you might already be on the list');
      return;
    }

    setEmail('');
    setMessage('you are on the list');
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.waitlistRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="email address"
          placeholderTextColor={colors.foregroundSecondary}
          style={[styles.input, { color: colors.foreground }]}
          value={email}
        />
        <Button loading={loading} onPress={joinWaitlist} title="join the waitlist" />
      </View>
      {!!message && <Text style={[styles.message, { color: colors.foregroundSecondary }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    ...Typography.body,
    flex: 1,
    minWidth: 220,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  message: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  waitlistRow: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
});
