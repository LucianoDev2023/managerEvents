import { View, Text, StyleSheet } from 'react-native';
import { Star, Shield, Wrench, User } from 'lucide-react-native';

export type RoleBadgeRole =
  | 'Criador'
  | 'Super Admin'
  | 'Adm parcial'
  | 'Convidado';

interface RoleBadgeProps {
  role: RoleBadgeRole;
  label?: string;
}

const RoleBadge = ({ role, label }: RoleBadgeProps) => {
  const config = {
    'Super Admin': {
      color: '#892091',
      icon: <Star size={12} color="#fff" />,
    },
    Criador: {
      color: '#3b82f6',
      icon: <Shield size={12} color="#fff" />,
    },
    'Adm parcial': {
      color: '#f97316',
      icon: <Wrench size={12} color="#fff" />,
    },
    Convidado: {
      color: '#0aa6b8ff',
      icon: <User size={12} color="#fff" />, // ✅ melhor que Wrench
    },
  } as const;

  const { color, icon } = config[role];

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {icon}
      <Text style={styles.text}>{label ?? role}</Text>
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
