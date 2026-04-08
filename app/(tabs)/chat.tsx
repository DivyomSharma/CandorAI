import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
      activeOpacity={0.8}
      onPress={() => router.push(`/conversation/${item.id}`)}
      style={[
        styles.conversationItem,
        Shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}
    >
      {item.type === 'ai' ? (
        <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
          <BrandImage resizeMode="contain" style={styles.avatarMark} variant="mark" />
        </View>
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.background }]}>
          <Text style={[styles.avatarText, { color: colors.foreground }]}>{"\u25CB"}</Text>
        </View>
      )}
      <View style={styles.conversationInfo}>
        <Text style={[styles.conversationTitle, { color: colors.foreground }]}>
          {item.type === 'ai' ? 'candor' : 'someone who understands'}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.conversationPreview, { color: colors.foregroundSecondary }]}
        >
          {item.last_message ?? 'start a conversation...'}
        </Text>
      </View>
      <Text style={[styles.conversationTime, { color: colors.mutedForeground }]}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <FlatList
        contentContainerStyle={styles.list}
        data={conversations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandImage resizeMode="contain" style={styles.wordmark} variant="wordmark" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>conversation threads</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.foregroundSecondary }]}>
              start with candor or return to something unfinished.
            </Text>
          </View>
        }
        renderItem={renderConversation}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BrandImage resizeMode="contain" style={styles.emptyMark} variant="mark" />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>no conversations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.foregroundSecondary }]}>
              start with candor and let the quiet build
            </Text>
          </View>
        }
      />
      <View style={styles.ctaBar}>
        <Button onPress={startNewAIChat} title="start a new chat" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginRight: Spacing.md,
    width: 56,
  },
  avatarMark: {
    height: 28,
    width: 28,
  },
  avatarText: {
    fontSize: 20,
  },
  container: {
    flex: 1,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationItem: {
    alignItems: 'center',
    borderRadius: Radius['3xl'],
    flexDirection: 'row',
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  conversationPreview: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  conversationTime: {
    ...Typography.caption,
  },
  conversationTitle: {
    ...Typography.body,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'lowercase',
  },
  ctaBar: {
    bottom: 20,
    left: Spacing.lg,
    position: 'absolute',
    right: Spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  emptyMark: {
    height: 72,
    marginBottom: Spacing.md,
    width: 72,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptyTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 120,
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
