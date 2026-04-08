import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { Button } from '@/components/ui';
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        void loadMatches();
      })
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
      await supabase.from('matches').update({ conversation_id: data.id }).eq('id', match.id);
      router.push(`/conversation/${data.id}`);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => openMatchChat(item)}
      style={[
        styles.card,
        Shadows.soft,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.markWrap, { backgroundColor: colors.surfaceSecondary }]}>
        <BrandImage style={styles.mark} variant="mark" />
      </View>
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>someone who understands you</Text>
        <Text style={[styles.cardReason, { color: colors.foregroundSecondary }]}>
          {item.match_reason || 'something quiet connects you.'}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.foregroundSecondary }]}>{"\u2192"}</Text>
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
            <BrandImage style={styles.wordmark} variant="wordmark" />
            <Text style={[styles.title, { color: colors.foreground }]}>matches</Text>
            <Text style={[styles.subtitle, { color: colors.foregroundSecondary }]}>
              when candor finds a strong enough signal, the connection appears here.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <BrandImage style={styles.emptyMark} variant="mark" />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>nothing unlocked yet</Text>
            <Text style={[styles.emptyCopy, { color: colors.foregroundSecondary }]}>
              keep talking with candor. the app needs more signal before it lets someone through.
            </Text>
            <View style={styles.emptyAction}>
              <Button onPress={() => router.push('/(tabs)')} title="go to home" variant="secondary" />
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  cardCopy: {
    flex: 1,
  },
  cardReason: {
    ...Typography.bodySmall,
    lineHeight: 21,
    marginTop: 4,
  },
  cardTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  chevron: {
    fontSize: 22,
    marginLeft: Spacing.sm,
  },
  container: {
    flex: 1,
  },
  emptyAction: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    marginTop: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyCopy: {
    ...Typography.body,
    maxWidth: 380,
    textAlign: 'center',
  },
  emptyMark: {
    height: 54,
    marginBottom: Spacing.lg,
    width: 54,
  },
  emptyTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.sm,
    textTransform: 'lowercase',
  },
  header: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  mark: {
    height: 20,
    width: 20,
  },
  markWrap: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: Spacing.md,
    width: 44,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
    maxWidth: 420,
  },
  title: {
    ...Typography.heading,
    fontFamily: 'DMSans_400Regular',
    fontSize: 30,
    marginTop: Spacing.md,
    textTransform: 'lowercase',
  },
  wordmark: {
    alignSelf: 'flex-start',
    height: 34,
    width: 118,
  },
});
