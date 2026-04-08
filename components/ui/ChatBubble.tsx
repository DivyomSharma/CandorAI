import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Radius, Spacing, Shadows } from '@/utils/theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  const { colors } = useTheme();
  
  // Fade-in animation for new bubbles
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAI,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser 
            ? { backgroundColor: colors.bubbleUser, borderBottomRightRadius: Radius.sm }
            : { backgroundColor: colors.bubbleAI, borderBottomLeftRadius: Radius.sm },
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser 
              ? { color: colors.bubbleUserText } 
              : { color: colors.bubbleAIText },
          ]}
        >
          {message}
        </Text>
      </View>
      {timestamp && (
        <Text
          style={[
            styles.timestamp,
            isUser && styles.timestampUser,
            { color: colors.mutedForeground },
          ]}
        >
          {timestamp}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAI: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius['2xl'],
  },
  text: {
    ...Typography.body,
    lineHeight: 24, // leading-relaxed
  },
  timestamp: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  timestampUser: {
    textAlign: 'right',
  },
});
