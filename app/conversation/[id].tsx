import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { ChatBubble } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  getConfiguredBackendUrl,
  requestAnalysis,
  requestMergeTraits,
  streamMessageToCandor,
  type ConversationMessage,
} from '@/services/ai';
import { findAndCreateMatches } from '@/services/matching';
import { supabase } from '@/services/supabase';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

interface Message {
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  role: 'user' | 'assistant';
  sender_id: string;
}

const starterScenarios: Record<string, string> = {
  bothering:
    "read this. tell me what you think.\n\nsomething small keeps happening, but it keeps staying with you longer than it should.\nwhy do you think that is?",
  relationship:
    "read this. tell me what you think.\n\nyou’re excited about something.\nthe person you care about barely reacts.\nwhat stays with you more?",
  thinking:
    "read this. tell me what you think.\n\nthere’s an idea you keep returning to.\nit isn’t urgent, but it won’t leave.\nwhat do you think it keeps asking from you?",
  talk:
    "read this. tell me what you think.\n\nsomeone asks how you’ve been.\nyou almost say the real thing, then don’t.\nwhat made you stop?",
};

function TypingIndicator() {
  const { colors } = useTheme();
  const [dots] = useState([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]);

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            delay: index * 200,
            duration: 600,
            toValue: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            duration: 600,
            toValue: 0.3,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.stagger(200, animations).start();

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dots]);

  return (
    <View style={styles.typingContainer}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: colors.foregroundSecondary, opacity: dot },
          ]}
        />
      ))}
    </View>
  );
}

function withAlpha(color: string, alpha: number) {
  const match = color.match(/^hsl\((.+)\)$/);

  if (!match) {
    return color;
  }

  return `hsla(${match[1]}, ${alpha})`;
}

function inferMode(starter?: string, text?: string) {
  if (starter && starter !== 'talk') {
    return 'scenario';
  }

  const lowered = (text || '').toLowerCase();
  if (lowered.includes('match') || lowered.includes('someone who makes sense')) {
    return 'guidance';
  }
  if (lowered.includes('?')) {
    return 'exploration';
  }
  return 'passive';
}

export default function ConversationScreen() {
  const { id, starter } = useLocalSearchParams<{ id: string; starter?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [chatError, setChatError] = useState('');
  const [profileTraits, setProfileTraits] = useState<Record<string, unknown>>({});
  const flatListRef = useRef<FlatList>(null);
  const historyRef = useRef<ConversationMessage[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadProfileTraits();
    void loadMessages();
    const unsubscribe = subscribeToMessages();

    return unsubscribe;
  }, [id, user]);

  const loadProfileTraits = async () => {
    if (!user) {
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('traits')
      .eq('id', user.id)
      .single();

    setProfileTraits((data?.traits as Record<string, unknown>) || {});
  };

  const seedScenarioIfNeeded = async () => {
    if (!id) {
      return;
    }

    const key = starter && starterScenarios[starter] ? starter : 'relationship';
    const firstPrompt = starterScenarios[key];

    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', id)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    await supabase.from('messages').insert({
      content: firstPrompt,
      conversation_id: id,
      role: 'assistant',
      sender_id: 'ai',
    });

    await supabase
      .from('conversations')
      .update({ last_message: 'read this. tell me what you think.' })
      .eq('id', id);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!data) {
      return;
    }

    if (data.length === 0) {
      await seedScenarioIfNeeded();
      return;
    }

    setMessages(data);
    historyRef.current = data.map((message) => ({
      content: message.content,
      role: message.role as 'user' | 'assistant',
    }));
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `conversation_id=eq.${id}`,
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((previous) => {
            if (previous.some((message) => message.id === newMessage.id)) {
              return previous;
            }

            const next = [...previous, newMessage];
            historyRef.current = next.map((message) => ({
              content: message.content,
              role: message.role,
            }));
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const runAnalysis = async () => {
    if (!user) {
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('traits, analysis_count')
        .eq('id', user.id)
        .single();

      const existingTraits = (profile?.traits as Record<string, unknown>) || {};
      const analysis = await requestAnalysis(user.id, historyRef.current);

      if (!analysis.traits || Object.keys(analysis.traits).length === 0) {
        return;
      }

      const merged = await requestMergeTraits(user.id, existingTraits, analysis.traits);
      const nextAnalysisCount = (profile?.analysis_count ?? 0) + 1;

      await supabase
        .from('profiles')
        .update({
          analysis_count: nextAnalysisCount,
          match_ready: merged.match_ready,
          traits: merged.merged_traits,
        })
        .eq('id', user.id);

      setProfileTraits(merged.merged_traits);

      if (merged.match_ready) {
        await findAndCreateMatches(user.id);
      }
    } catch {
      // background only
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !id || sending) {
      return;
    }

    if (!getConfiguredBackendUrl()) {
      setChatError('candor is still waking up. try again shortly.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setStreamingText('');
    setChatError('');

    const { error: insertError } = await supabase.from('messages').insert({
      content: userMessage,
      conversation_id: id,
      role: 'user',
      sender_id: user.id,
    });

    if (insertError) {
      setSending(false);
      return;
    }

    await supabase
      .from('conversations')
      .update({ last_message: userMessage })
      .eq('id', id);

    const { data: conversation } = await supabase
      .from('conversations')
      .select('type')
      .eq('id', id)
      .single();

    if (conversation?.type !== 'ai') {
      setSending(false);
      return;
    }

    await streamMessageToCandor(
      userMessage,
      historyRef.current,
      profileTraits,
      inferMode(starter, userMessage),
      (token) => {
        setStreamingText((previous) => previous + token);
      },
      async (reply, updatedHistory) => {
        historyRef.current = updatedHistory;
        setStreamingText('');

        await supabase.from('messages').insert({
          content: reply,
          conversation_id: id,
          role: 'assistant',
          sender_id: 'ai',
        });

        await supabase
          .from('conversations')
          .update({ last_message: reply })
          .eq('id', id);

        setSending(false);
        void runAnalysis();
      },
      async () => {
        setStreamingText('');
        setChatError('candor stepped away for a moment. try again shortly.');
        setSending(false);
      }
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleComposerKeyPress = (event: { nativeEvent?: { key?: string; shiftKey?: boolean } }) => {
    if (
      Platform.OS === 'web' &&
      event.nativeEvent?.key === 'Enter' &&
      !event.nativeEvent?.shiftKey
    ) {
      sendMessage();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <BrandBackdrop />
      <FlatList
        ref={flatListRef}
        contentContainerStyle={styles.messageList}
        data={[...messages]}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <ChatBubble
            isUser={item.role === 'user'}
            message={item.content}
            timestamp={formatTime(item.created_at)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyEmoji, { color: colors.foregroundSecondary }]}>{"\u2726"}</Text>
            <Text style={[styles.emptyText, { color: colors.foregroundSecondary }]}>
              read this. tell me what you think.
            </Text>
          </View>
        }
        ListFooterComponent={
          streamingText ? (
            <ChatBubble isUser={false} message={streamingText} />
          ) : sending ? (
            <View style={styles.typingBubbleWrapper}>
              <View style={[styles.typingBubble, { backgroundColor: colors.bubbleAI }]}>
                <TypingIndicator />
              </View>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.inputRow,
          Shadows.soft,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        {!!chatError && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.foregroundSecondary }]}>{chatError}</Text>
          </View>
        )}
        <TextInput
          blurOnSubmit={false}
          editable={!sending}
          maxLength={2000}
          multiline
          onChangeText={setInput}
          onKeyPress={handleComposerKeyPress}
          placeholder="say what comes naturally…"
          placeholderTextColor={withAlpha(colors.foregroundSecondary, 0.5)}
          style={[
            styles.textInput,
            { backgroundColor: colors.surfaceSecondary, color: colors.foreground },
          ]}
          value={input}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!input.trim() || sending}
          onPress={sendMessage}
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!input.trim() || sending) && styles.sendDisabled,
          ]}
        >
          {sending && !streamingText ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.sendIcon, { color: colors.primaryForeground }]}>{"\u2191"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing.xxl * 3,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorBanner: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  errorText: {
    ...Typography.bodySmall,
  },
  inputRow: {
    alignItems: 'flex-end',
    borderRadius: Radius['3xl'],
    flexDirection: 'row',
    gap: Spacing.sm,
    margin: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 20,
  },
  textInput: {
    ...Typography.body,
    borderRadius: Radius.xl,
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  typingBubble: {
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius['2xl'],
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  typingBubbleWrapper: {
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  typingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
