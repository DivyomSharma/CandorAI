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

interface Conversation {
  created_at: string;
  id: string;
  last_message?: string;
  participant_ids: string[];
  type: 'ai' | 'user';
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) {
      return;
    }

    const { data } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [user.id])
      .order('created_at', { ascending: false });

    if (data) {
      setConversations(data);
    }
  };

  const startNewAIChat = async () => {
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_ids: [user.id], type: 'ai' })
      .select('id')
      .single();

    if (data && !error) {
      router.push(`/conversation/${data.id}`);
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => router.push(`/conversation/${item.id}`)}
      style={[
        styles.row,
        Shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSecondary }]}>
        {item.type === 'ai' ? (
          <BrandImage style={styles.mark} variant="mark" />
        ) : (
          <Text style={[styles.personIcon, { color: colors.foreground }]}>{"\u25CB"}</Text>
        )}
      </View>

      <View style={styles.copy}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>
            {item.type === 'ai' ? 'candor' : 'match conversation'}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: item.type === 'ai' ? colors.surfaceSecondary : colors.bubbleUser },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.foregroundSecondary }]}>
              {item.type === 'ai' ? 'ai' : 'match'}
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} style={[styles.preview, { color: colors.foregroundSecondary }]}>
          {item.last_message ?? 'open the thread when you are ready.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <FlatList
        contentContainerStyle={styles.list}
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandImage style={styles.wordmark} variant="wordmark" />
            <Text style={[styles.title, { color: colors.foreground }]}>conversations</Text>
            <Text style={[styles.subtitle, { color: colors.foregroundSecondary }]}>
              one place for candor and every unlocked connection.
            </Text>
            <View style={styles.headerAction}>
              <Button onPress={startNewAIChat} title="new conversation" />
            </View>
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
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>nothing here yet</Text>
            <Text style={[styles.emptyCopy, { color: colors.foregroundSecondary }]}>
              start with candor and your first thread will appear here.
            </Text>
            <View style={styles.emptyAction}>
              <Button onPress={startNewAIChat} title="start with candor" />
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...Typography.caption,
    textTransform: 'lowercase',
  },
  container: {
    flex: 1,
  },
  copy: {
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
    maxWidth: 360,
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
  headerAction: {
    marginTop: Spacing.lg,
    maxWidth: 240,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: Spacing.md,
    width: 44,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  mark: {
    height: 20,
    width: 20,
  },
  personIcon: {
    fontSize: 16,
  },
  preview: {
    ...Typography.bodySmall,
    lineHeight: 21,
    marginTop: 4,
  },
  row: {
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  rowTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
