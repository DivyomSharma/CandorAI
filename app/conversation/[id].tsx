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

const FALLBACK_REPLY = "take your time. i'm still here.";

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

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const historyRef = useRef<ConversationMessage[]>([]);
  const userMessageCountRef = useRef(0);

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadMessages();
    const unsubscribe = subscribeToMessages();

    return unsubscribe;
  }, [id]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      historyRef.current = data.map((message) => ({
        content: message.content,
        role: message.role as 'user' | 'assistant',
      }));
      userMessageCountRef.current = data.filter((message) => message.role === 'user').length;
    }
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

            return [...previous, newMessage];
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

      if (merged.match_ready) {
        await findAndCreateMatches(user.id);
      }
    } catch {
      // Analysis is background work.
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !id || sending) {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setStreamingText('');

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

    userMessageCountRef.current += 1;

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

        if (userMessageCountRef.current % 10 === 0) {
          void runAnalysis();
        }
      },
      async () => {
        setStreamingText('');

        await supabase.from('messages').insert({
          content: FALLBACK_REPLY,
          conversation_id: id,
          role: 'assistant',
          sender_id: 'ai',
        });

        await supabase
          .from('conversations')
          .update({ last_message: FALLBACK_REPLY })
          .eq('id', id);

        historyRef.current.push(
          { content: userMessage, role: 'user' },
          { content: FALLBACK_REPLY, role: 'assistant' }
        );

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
              start a conversation with candor
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
        <TextInput
          blurOnSubmit={false}
          editable={!sending}
          maxLength={2000}
          multiline
          onChangeText={setInput}
          onKeyPress={handleComposerKeyPress}
          placeholder="say something honest..."
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
