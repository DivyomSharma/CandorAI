import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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
      <View style={[styles.avatar, { backgroundColor: colors.background }]}>
        <Text style={[styles.avatarText, { color: colors.foreground }]}>
          {item.type === 'ai' ? '\u2726' : '\u25CB'}
        </Text>
      </View>
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
      <FlatList
        contentContainerStyle={styles.list}
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyEmoji, { color: colors.foregroundSecondary }]}>{"\u2726"}</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>no conversations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.foregroundSecondary }]}>
              start with candor and let the quiet build
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={startNewAIChat}
        style={[styles.fab, Shadows.md, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: Spacing.md,
    width: 48,
  },
  avatarText: {
    fontSize: 24,
  },
  container: {
    flex: 1,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationItem: {
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    flexDirection: 'row',
    marginBottom: Spacing.sm,
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
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptyTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
  },
  fab: {
    alignItems: 'center',
    borderRadius: 32,
    bottom: 24,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    width: 64,
  },
  fabText: {
    fontFamily: 'DMSans_300Light',
    fontSize: 32,
    marginTop: -2,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
});
