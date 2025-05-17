import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: number;
}

export default function Card({ children, style, elevation = 1 }: CardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getShadow = () => {
    if (colorScheme === 'dark') {
      return {};
    }

    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: 0.1 + elevation * 0.03,
      shadowRadius: 1 + elevation,
      elevation: elevation,
    };
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        getShadow(),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginVertical: 8,
  },
});