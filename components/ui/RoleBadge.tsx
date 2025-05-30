import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Star, Shield, Wrench } from 'lucide-react-native';

interface RoleBadgeProps {
  role: 'Super Admin' | 'Admin' | 'Adm parcial';
}

const RoleBadge = ({ role }: RoleBadgeProps) => {
  const config = {
    'Super Admin': {
      color: '#892091',
      icon: <Star size={12} color="#fff" />,
    },
    Admin: {
      color: '#3b82f6',
      icon: <Shield size={12} color="#fff" />,
    },
    'Adm parcial': {
      color: '#f97316',
      icon: <Wrench size={12} color="#fff" />,
    },
  }[role];

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      {config.icon}
      <Text style={styles.text}>{role}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default RoleBadge;
