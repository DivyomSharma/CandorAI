/**
 * Candor AI Service Layer
 *
 * All AI calls are routed through the Candor Python backend
 * (FastAPI + Groq) to keep the API key secure server-side.
 */

import { Platform } from 'react-native';

// ── Backend URL ─────────────────────────────────────────────────────

const getBackendUrl = (): string => {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() || process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

  if (configuredUrl) {
    const normalizedUrl = /^https?:\/\//i.test(configuredUrl)
      ? configuredUrl
      : `https://${configuredUrl}`;

    return normalizedUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    if (
      typeof window === 'undefined' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return 'http://localhost:8000';
    }

    return '';
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

function requireBackendUrl() {
  if (!BACKEND_URL) {
    throw new Error('candor backend url is not configured');
  }

  return BACKEND_URL;
}

// ── Types ───────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UserProfilePayload {
  attachment?: string;
  communication_style?: string;
  conflict_style?: string;
  emotional_depth?: string;
  emotional_regulation?: string;
  empathy_level?: string;
  values?: string[];
}

interface ChatResponse {
  reply: string;
  history: ConversationMessage[];
}

interface AnalysisResponse {
  traits: Record<string, unknown>;
  match_ready: boolean;
}

interface MergeResponse {
  merged_traits: Record<string, unknown>;
  match_ready: boolean;
}

// ── Core chat (unchanged) ───────────────────────────────────────────

export async function sendMessageToCandor(
  userMessage: string,
  history: ConversationMessage[] = [],
  profile?: UserProfilePayload,
  mode?: string
): Promise<ChatResponse> {
  const response = await fetch(`${requireBackendUrl()}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage, history, profile, mode, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Candor AI error (${response.status})`);
  }

  return response.json();
}

// ── Streaming chat (unchanged) ──────────────────────────────────────

export async function streamMessageToCandor(
  userMessage: string,
  history: ConversationMessage[] = [],
  profile: UserProfilePayload | undefined,
  mode: string | undefined,
  onToken: (token: string) => void,
  onDone: (reply: string, updatedHistory: ConversationMessage[]) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(`${requireBackendUrl()}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, history, profile, mode, stream: true }),
    });

    if (!response.ok) throw new Error(`Candor AI error (${response.status})`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload);
          if (event.error) { onError(new Error(event.error)); return; }
          if (event.token) onToken(event.token);
          if (event.done) { onDone(event.reply, event.history); return; }
        } catch {
          // skip malformed SSE
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ── Analysis (background, silent) ───────────────────────────────────

/**
 * Request background analysis of a conversation.
 * Fires silently — does NOT interrupt chat flow.
 */
export async function requestAnalysis(
  userId: string,
  history: ConversationMessage[]
): Promise<AnalysisResponse> {
  try {
    const response = await fetch(`${requireBackendUrl()}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, history }),
    });

    if (!response.ok) return { traits: {}, match_ready: false };
    return response.json();
  } catch {
    // Silent failure — analysis is background work
    return { traits: {}, match_ready: false };
  }
}

/**
 * Merge new traits into existing profile.
 */
export async function requestMergeTraits(
  userId: string,
  existingTraits: Record<string, unknown>,
  newTraits: Record<string, unknown>
): Promise<MergeResponse> {
  try {
    const response = await fetch(`${requireBackendUrl()}/merge-traits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        existing_traits: existingTraits,
        new_traits: newTraits,
      }),
    });

    if (!response.ok) return { merged_traits: existingTraits, match_ready: false };
    return response.json();
  } catch {
    return { merged_traits: existingTraits, match_ready: false };
  }
}

// ── Legacy wrappers ─────────────────────────────────────────────────

export async function generateReply(
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<string> {
  const { reply } = await sendMessageToCandor(userMessage, conversationHistory);
  return reply;
}

export async function generateNextQuestion(
  conversationHistory: ConversationMessage[],
  _userProfile?: Record<string, unknown>
): Promise<string> {
  const lastUserMsg =
    conversationHistory.filter((m) => m.role === 'user').pop()?.content || '';
  const { reply } = await sendMessageToCandor(lastUserMsg, conversationHistory);
  return reply;
}

export function getConfiguredBackendUrl(): string {
  return BACKEND_URL;
}
