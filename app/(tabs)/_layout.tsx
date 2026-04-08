import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={18} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarActiveBackgroundColor: colors.bubbleUser,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 4,
          marginVertical: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          textTransform: 'lowercase',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 28,
          borderTopColor: colors.border,
          borderWidth: 1,
          bottom: 14,
          height: 68,
          left: 14,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          right: 14,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name="home" />,
          title: 'home',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name="comment" />,
          title: 'chat',
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name="heart" />,
          title: 'matches',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <TabBarIcon color={color} name="user" />,
          title: 'profile',
        }}
      />
    </Tabs>
  );
}
