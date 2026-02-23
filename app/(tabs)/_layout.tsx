import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { Calendar, Home, User, Briefcase } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true, // Labels back
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#ffffff60' : '#00000060',
        tabBarStyle: {
          position: 'absolute',
          bottom: 15, // Floating
          left: 20,   // Floating
          right: 20,  // Floating
          elevation: 0,
          backgroundColor: 'transparent',
          borderRadius: 24, // Rounded container
          height: 72, // Increased height for text
          borderTopWidth: 0,
          paddingBottom: 8, // Space for text
          paddingTop: 8,
          marginHorizontal: 20,
          // Shadow for float effect
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarBackground: () => (
          <View style={{ borderRadius: 24, overflow: 'hidden', flex: 1 }}>
            <BlurView 
                intensity={80} 
                tint={isDark ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill} 
            />
            {/* Overlay */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30,30,40,0.5)' : 'rgba(255,255,255,0.5)' }]} />
          </View>
        ),
        tabBarLabelStyle: {
            fontFamily: Fonts.medium,
            fontSize: 10,
            marginTop: 8,
        },
        tabBarItemStyle: {
            // Centralizar ícones
            justifyContent: 'center',
            alignItems: 'center',
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Home size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Calendar size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Gestão',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Briefcase size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
