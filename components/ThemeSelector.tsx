import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '@/hooks/useTheme';
import { accents, Radius } from '@/utils/theme';

export function ThemeSelector() {
  const { mode, accent, toggleMode, setAccent, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        accessibilityLabel={`switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={toggleMode}
        style={styles.modeButton}
      >
        <FontAwesome
          color={colors.foregroundSecondary}
          name={mode === 'light' ? 'moon-o' : 'sun-o'}
          size={14}
        />
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {accents.map((themeAccent) => (
        <TouchableOpacity
          key={themeAccent.name}
          accessibilityLabel={`use ${themeAccent.label} accent`}
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={() => setAccent(themeAccent.name)}
          style={[
            styles.dot,
            {
              backgroundColor: mode === 'light' ? themeAccent.lightColor : themeAccent.darkColor,
            },
            accent === themeAccent.name && {
              borderColor: colors.accent,
              borderWidth: 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  divider: {
    height: 16,
    marginHorizontal: 4,
    opacity: 0.5,
    width: 1,
  },
  dot: {
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  modeButton: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    marginRight: 2,
    width: 22,
  },
});
