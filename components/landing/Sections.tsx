import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BrandImage } from '@/components/BrandImage';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

function HighlightScript({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return <Text style={[styles.script, { color: colors.accent }]}>{children}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.sectionCard,
        Shadows.soft,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

export function Sections() {
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      <View style={styles.statementBlock}>
        <Text style={[styles.statement, { color: colors.foreground }]}>
          you don&apos;t need more matches.
        </Text>
        <Text style={[styles.statementSoft, { color: colors.foregroundSecondary }]}>
          you need to feel <HighlightScript>understood.</HighlightScript>
        </Text>
      </View>

      <SectionCard>
        <Text style={[styles.sectionEyebrow, { color: colors.foregroundSecondary }]}>
          conversations with care
        </Text>
        <View style={styles.chatDemo}>
          <View style={[styles.chatBubble, styles.chatBubbleLeft, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.chatText, { color: colors.foreground }]}>
              i think i struggle with being vulnerable early on.
            </Text>
          </View>
          <View style={[styles.chatBubble, styles.chatBubbleRight, { backgroundColor: colors.bubbleUser }]}>
            <Text style={[styles.chatText, { color: colors.foreground }]}>
              me too. i usually wait until i feel safe.
            </Text>
          </View>
          <View style={[styles.promptBar, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.promptText, { color: colors.foregroundSecondary }]}>
              you both seem to value honesty. would you like a thoughtful question?
            </Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.sectionEyebrow, { color: colors.foregroundSecondary }]}>
          what you share
        </Text>
        <View style={styles.bulletStack}>
          {[
            'you both value emotional honesty',
            'you approach conflict with care',
            'you both need space to recharge',
            'you share a love for deep conversations',
          ].map((line) => (
            <View key={line} style={[styles.bulletRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{line}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <View style={styles.statementBlock}>
        <Text style={[styles.statement, { color: colors.foreground }]}>
          we don&apos;t keep what you share.
        </Text>
        <Text style={[styles.statementSoft, { color: colors.foregroundSecondary }]}>
          only what helps us understand.
        </Text>
      </View>

      <SectionCard>
        <Text style={[styles.privacyLine, { color: colors.foregroundSecondary }]}>
          conversations are temporary
        </Text>
        <Text style={[styles.privacyLine, { color: colors.foregroundSecondary }]}>
          only insights are retained
        </Text>
        <Text style={[styles.privacyLine, { color: colors.foregroundSecondary }]}>
          no personal data stored long-term
        </Text>
      </SectionCard>

      <View style={styles.unlock}>
        <BrandImage style={styles.unlockMark} variant="mark" />
        <Text style={[styles.unlockTitle, { color: colors.foreground }]}>
          you&apos;ve unlocked someone who understands you.
        </Text>
        <HighlightScript>this might feel different</HighlightScript>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bulletRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
  bulletStack: {
    marginTop: Spacing.sm,
  },
  bulletText: {
    ...Typography.body,
  },
  chatBubble: {
    borderRadius: Radius.xl,
    maxWidth: '78%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chatBubbleLeft: {
    alignSelf: 'flex-start',
  },
  chatBubbleRight: {
    alignSelf: 'flex-end',
  },
  chatDemo: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  chatText: {
    ...Typography.body,
  },
  privacyLine: {
    ...Typography.body,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
  },
  promptBar: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  promptText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
  },
  script: {
    fontFamily: Platform.OS === 'web' ? 'Caveat, cursive' : 'DMSans_300Light',
    fontSize: Platform.OS === 'web' ? 34 : 28,
  },
  sectionCard: {
    alignSelf: 'center',
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    maxWidth: 980,
    padding: Spacing.xl,
    width: '100%',
  },
  sectionEyebrow: {
    ...Typography.caption,
    fontSize: 16,
    letterSpacing: 2.4,
    marginBottom: Spacing.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  stack: {
    gap: Spacing.xl,
  },
  statement: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: Platform.OS === 'web' ? 54 : 34,
    lineHeight: Platform.OS === 'web' ? 58 : 40,
    textAlign: 'center',
  },
  statementBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  statementSoft: {
    ...Typography.heading,
    fontFamily: 'DMSans_300Light',
    fontSize: Platform.OS === 'web' ? 54 : 34,
    lineHeight: Platform.OS === 'web' ? 58 : 40,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  unlock: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  unlockMark: {
    height: 62,
    marginBottom: Spacing.lg,
    width: 62,
  },
  unlockTitle: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: Platform.OS === 'web' ? 44 : 32,
    lineHeight: Platform.OS === 'web' ? 50 : 38,
    marginBottom: Spacing.md,
    maxWidth: 560,
    textAlign: 'center',
  },
});
