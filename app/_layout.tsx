import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  useFonts,
} from '@expo-google-fonts/dm-sans';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/hooks/useTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, router, segments, session]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <CustomThemeProvider>
        <RootLayoutNav />
      </CustomThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <AuthGate>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.foreground,
            headerTitle: 'candor',
            headerTitleStyle: {
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              fontWeight: '400',
            },
            presentation: 'card',
          }}
        />
      </Stack>
    </AuthGate>
  );
}
