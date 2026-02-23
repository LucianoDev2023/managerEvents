import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { useColorScheme } from 'react-native';

interface DashboardCardProps {
  title: string;
  subtitle?: string; // tornamos opcional
  icon?: LucideIcon; // tornamos opcional
  onPress?: () => void;
  color: string;
  delay?: number;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  // Novas props para flexibilidade (Ex: Stats no Profile)
  centerContent?: boolean; 
  hideArrow?: boolean;
  activeOpacity?: number;
  subtitleStyle?: StyleProp<TextStyle>;
  verticalAlign?: 'space-between' | 'flex-start' | 'center' | 'flex-end';
  height?: number;
  value?: string | number;
  titleStyle?: StyleProp<TextStyle>;
}

const DashboardCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  onPress, 
  color,
  delay = 0,
  fullWidth = false,
  style,
  centerContent = false,
  hideArrow = false,
  activeOpacity = 0.9,
  value,
  titleStyle,
  subtitleStyle,
  verticalAlign,
  height = 160
}: DashboardCardProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
      scale.value = withTiming(0.96, { duration: 150 });
  };
  
  const handlePressOut = () => {
      scale.value = withTiming(1, { duration: 150 });
  };

  const resolvedJustify = verticalAlign 
      ? verticalAlign 
      : centerContent 
          ? 'center' 
          : 'space-between';

  return (
    <Animated.View 
        entering={FadeInDown.delay(delay).duration(600).springify()}
        style={[fullWidth ? { width: '100%' } : { flex: 0.48 }, style]}
    >
      <Animated.View style={[animatedStyle, { width: '100%' }]}>
        <TouchableOpacity
            activeOpacity={activeOpacity}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!onPress}
            style={[
                styles.card, 
                { 
                    height, 
                    borderColor: isDark ? color + '40' : colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    elevation: isDark ? 0 : 2,
                    shadowColor: isDark ? 'transparent' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    alignItems: centerContent ? 'center' : 'flex-start',
                    justifyContent: resolvedJustify,
                }
            ]} 
        >
            <LinearGradient
                colors={isDark ? [color + '20', color + '05'] : [color + '15', color + '05']} 
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            {Icon && (
                <View style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: isDark ? color + '20' : color + '15',
                    marginBottom: centerContent ? 12 : 0 
                  }
                ]}>
                    <Icon size={24} color={color} />
                </View>
            )}

            {/* Caso Especial: Stats (Valor em destaque) */}
            {value !== undefined && (
                 <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            )}
    
            <View style={[styles.cardContent, centerContent && { alignItems: 'center', marginTop: 0 }]}>
                <Text style={[
                  styles.cardTitle, 
                  { color: colors.text, textAlign: centerContent ? 'center' : 'left' },
                  titleStyle
                ]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[
                      styles.cardSubtitle, 
                      { color: colors.textSecondary, textAlign: centerContent ? 'center' : 'left' },
                      subtitleStyle
                    ]}>
                        {subtitle}
                    </Text>
                )}
            </View>
    
            {!hideArrow && onPress && (
                <View style={styles.arrowContainer}>
                    <ChevronRight size={16} color={isDark ? color : colors.textSecondary} />
                </View>
            )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
      // height: 160, // Removed fixed height
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      overflow: 'hidden',
  },
// ...
  iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
  },
  cardContent: {
      marginTop: 10,
  },
  cardTitle: {
      fontSize: 17,
      fontFamily: Fonts.bold,
      marginBottom: 4,
  },
  cardSubtitle: {
      fontSize: 13,
      fontFamily: Fonts.regular,
      opacity: 0.8,
  },
  statValue: {
      fontSize: 32,
      fontFamily: Fonts.bold,
      marginBottom: 4,
  },
  arrowContainer: {
      position: 'absolute',
      right: 16,
      top: 16,
      padding: 4,
  },
});

export default DashboardCard;
