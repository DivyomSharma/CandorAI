import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '@/components/ui';
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
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.surface }]}>
          <Text style={[styles.avatarEmoji, { color: colors.foreground }]}>{"\u2727"}</Text>
        </View>
        <Text style={[styles.email, { color: colors.foregroundSecondary }]}>{user?.email ?? ''}</Text>
      </View>

      <View
        style={[
          styles.card,
          Shadows.md,
          { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
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
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          value={profile.bio}
        />
        <Button loading={saving} onPress={saveProfile} title="save" />
      </View>

      <View style={styles.footer}>
        <Button onPress={handleSignOut} title="sign out" variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: Spacing.md,
    width: 80,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  card: {
    borderRadius: Radius['2xl'],
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  email: {
    ...Typography.bodySmall,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
});
