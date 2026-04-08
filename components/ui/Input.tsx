import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius, Spacing } from '@/utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isMultiline = !!props.multiline;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.foregroundSecondary }]}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: focused
              ? colors.primary
              : error
              ? '#ef4444'
              : colors.border,
            color: colors.foreground,
            borderRadius: isMultiline ? Radius['2xl'] : Radius.full,
            minHeight: isMultiline ? 112 : 56,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
    fontFamily: 'DMSans_400Regular',
    textTransform: 'lowercase',
  },
  input: {
    ...Typography.body,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    ...Typography.caption,
    color: '#ef4444',
    marginTop: Spacing.xs,
  },
});
