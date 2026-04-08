import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '@/components/ui';
import { BrandBackdrop } from '@/components/BrandBackdrop';
import { BrandImage } from '@/components/BrandImage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/services/supabase';
import { Radius, Shadows, Spacing, Typography } from '@/utils/theme';

interface Profile {
  bio: string;
  display_name: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile>({ bio: '', display_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    supabase
      .from('profiles')
      .select('display_name, bio')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            bio: data.bio ?? '',
            display_name: data.display_name ?? '',
          });
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) {
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      bio: profile.bio,
      display_name: profile.display_name,
      id: user.id,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      Alert.alert('error', 'could not save profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert('sign out', 'are you sure you want to sign out?', [
      { text: 'cancel', style: 'cancel' },
      { text: 'sign out', onPress: signOut, style: 'destructive' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandBackdrop />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <View style={styles.header}>
          <BrandImage resizeMode="contain" style={styles.wordmark} variant="wordmark" />
          <View style={[styles.avatarCircle, { backgroundColor: colors.surface }]}>
            <BrandImage resizeMode="contain" style={styles.avatarMark} variant="mark" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>your profile</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.foregroundSecondary }]}>
            keep this simple. candor learns more from conversation than performance.
          </Text>
          <Text style={[styles.email, { color: colors.foregroundSecondary }]}>{user?.email ?? ''}</Text>
        </View>

        <View
          style={[
            styles.card,
            Shadows.md,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>tell candor who you are</Text>
          <Input
            label="display name"
            onChangeText={(text) => setProfile((prev) => ({ ...prev, display_name: text }))}
            placeholder="how should we call you?"
            value={profile.display_name}
          />
          <Input
            label="bio"
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile((prev) => ({ ...prev, bio: text }))}
            placeholder="tell us a little about yourself..."
            style={{ minHeight: 100, textAlignVertical: 'top' }}
            value={profile.bio}
          />
          <Button loading={saving} onPress={saveProfile} title="save" />
        </View>

        <View style={styles.footer}>
          <Button onPress={handleSignOut} title="sign out" variant="secondary" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 96,
  },
  avatarMark: {
    height: 44,
    width: 44,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  card: {
    borderRadius: Radius['3xl'],
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
  },
  cardTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  email: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
  },
  footer: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    maxWidth: 320,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  wordmark: {
    height: 56,
    marginBottom: Spacing.xl,
    width: 190,
  },
});
