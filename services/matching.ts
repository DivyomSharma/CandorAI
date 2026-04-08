/**
 * Candor Matching Service
 *
 * Uses the backend compatibility engine for organic matching.
 * Traits are never exposed to users, only the human-readable reason.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

const getBackendUrl = (): string => {
  if (Platform.OS === 'web') return 'http://localhost:8000';
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

interface CompatibilityResult {
  reason: string;
  score: number;
}

export async function getCompatibility(
  userATraits: Record<string, unknown>,
  userBTraits: Record<string, unknown>
): Promise<CompatibilityResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/compatibility`, {
      body: JSON.stringify({
        user_a_traits: userATraits,
        user_b_traits: userBTraits,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      return { reason: 'something quiet connects you', score: 0 };
    }

    return response.json();
  } catch {
    return { reason: 'something quiet connects you', score: 0 };
  }
}

export async function checkMatchReady(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('match_ready')
    .eq('id', userId)
    .single();

  return data?.match_ready ?? false;
}

export async function findAndCreateMatches(userId: string): Promise<void> {
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('traits')
    .eq('id', userId)
    .single();

  if (!currentUser?.traits) {
    return;
  }

  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, traits')
    .eq('match_ready', true)
    .neq('id', userId);

  if (!candidates || candidates.length === 0) {
    return;
  }

  const { data: existingMatches } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  const matchedIds = new Set<string>();
  existingMatches?.forEach((match) => {
    matchedIds.add(match.user_a_id);
    matchedIds.add(match.user_b_id);
  });

  for (const candidate of candidates) {
    if (matchedIds.has(candidate.id) || !candidate.traits) {
      continue;
    }

    const { reason, score } = await getCompatibility(
      currentUser.traits as Record<string, unknown>,
      candidate.traits as Record<string, unknown>
    );

    if (score >= 0.6) {
      const [userAId, userBId] = [userId, candidate.id].sort();

      await supabase.from('matches').insert({
        compatibility_score: score,
        match_reason: reason,
        user_a_id: userAId,
        user_b_id: userBId,
      });
    }
  }
}
