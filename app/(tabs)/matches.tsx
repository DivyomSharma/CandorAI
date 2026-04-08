import React, { useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

interface Match {
  compatibility_score: number;
  conversation_id: string | null;
  created_at: string;
  id: string;
  match_reason: string | null;
  user_a_id: string;
  user_b_id: string;
}

function GlowingCircle() {
  const { colors } = useTheme();
  const [scale] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          duration: 2000,
          toValue: 1.1,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          duration: 2000,
          toValue: 1,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scale]);

  return (
    <View style={styles.glowContainer}>
      <Animated.View
        style={[
          styles.glowOuter,
          { backgroundColor: colors.bubbleUser, transform: [{ scale }] },
        ]}
      >
        <View style={[styles.glowInner, { backgroundColor: colors.surface }]}>
          <BrandImage resizeMode="contain" style={styles.glowMark} variant="mark" />
        </View>
      </Animated.View>
    </View>
  );
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadMatches();

    const channel = supabase
      .channel(`matches:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          void loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadMatches = async () => {
    if (!user) {
      return;
    }

    const { data } = await supabase
      .from('matches')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('compatibility_score', { ascending: false });

    if (data) {
      setMatches(data);
    }
  };

  const openMatchChat = async (match: Match) => {
    if (match.conversation_id) {
      router.push(`/conversation/${match.conversation_id}`);
      return;
    }

    if (!user) {
      return;
    }

    const otherId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

    const { data } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [user.id, otherId],
        type: 'user',
      })
      .select('id')
      .single();

    if (data) {
      await supabase
        .from('matches')
        .update({ conversation_id: data.id })
        .eq('id', match.id);

      router.push(`/conversation/${data.id}`);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openMatchChat(item)}
      style={[
        styles.matchCard,
        Shadows.md,
        { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}
    >
      <GlowingCircle />
      <View style={styles.matchInfo}>
        <Text style={[styles.matchName, { color: colors.foreground }]}>
          someone who understands you
        </Text>
        <Text style={[styles.matchReason, { color: colors.foregroundSecondary }]}>
          {item.match_reason || 'something quiet connects you'}
        </Text>
      </View>
      <Text style={[styles.chatArrow, { color: colors.foregroundSecondary }]}>{"\u2192"}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <FlatList
        contentContainerStyle={styles.list}
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandImage resizeMode="contain" style={styles.wordmark} variant="wordmark" />
            {matches.length > 0 ? (
              <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                you've unlocked someone who understands you
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.foregroundSecondary }]}>
                open the thread when you're ready
              </Text>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>matches appear here</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.foregroundSecondary }]}>
                  keep talking and candor will let the right person through.
                </Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <BrandImage resizeMode="contain" style={styles.emptyMark} variant="mark" />
            <Text style={[styles.emptySubtitle, { color: colors.foregroundSecondary }]}>
              no one has unlocked yet. keep talking.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chatArrow: {
    fontSize: 24,
    opacity: 0.5,
  },
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyMark: {
    height: 72,
    marginBottom: Spacing.xl,
    width: 72,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  glowContainer: {
    alignItems: 'center',
    height: 80,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    width: 80,
  },
  glowInner: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  glowMark: {
    height: 24,
    width: 24,
  },
  glowOuter: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  list: {
    padding: Spacing.xl,
  },
  matchCard: {
    alignItems: 'center',
    borderRadius: Radius['3xl'],
    marginBottom: Spacing.md,
    padding: Spacing.xl,
  },
  matchInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  matchName: {
    ...Typography.subheading,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  matchReason: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  wordmark: {
    height: 52,
    marginBottom: Spacing.lg,
    width: 180,
  },
});
