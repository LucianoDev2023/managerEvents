import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useEvents } from '@/context/EventsContext';
import Button from '@/components/ui/Button';
import { Settings, Moon, Sun, LogOut, Trash2, CircleHelp as HelpCircle, Bell } from 'lucide-react-native';
import Card from '@/components/ui/Card';

export default function ProfileScreen() {
  const { state } = useEvents();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const totalEvents = state.events.length;
  const totalPrograms = state.events.reduce(
    (sum, event) => sum + event.programs.length, 
    0
  );
  
  const handleThemeToggle = () => {
    Alert.alert(
      'Change Theme',
      'This would toggle between light and dark mode.',
      [{ text: 'OK' }]
    );
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive' }
      ]
    );
  };
  
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your events and programs. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Data Cleared', 'All events and programs have been removed.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
          style={styles.profileImage}
        />
        <Text style={[styles.profileName, { color: colors.text }]}>
          Jane Doe
        </Text>
        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
          jane.doe@example.com
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.statNumber}>{totalEvents}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.secondary }]}>
          <Text style={styles.statNumber}>{totalPrograms}</Text>
          <Text style={styles.statLabel}>Programs</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: colors.accent }]}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
      </View>
      
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Preferences
      </Text>
      
      <Card>
        <Button
          title="App Settings"
          icon={<Settings size={20} color={colors.text} />}
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
        
        <Button
          title={`Theme: ${colorScheme === 'dark' ? 'Dark' : 'Light'}`}
          icon={colorScheme === 'dark' ? 
            <Moon size={20} color={colors.text} /> : 
            <Sun size={20} color={colors.text} />
          }
          onPress={handleThemeToggle}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
        
        <Button
          title="Notifications"
          icon={<Bell size={20} color={colors.text} />}
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
      </Card>
      
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Support
      </Text>
      
      <Card>
        <Button
          title="Help & Support"
          icon={<HelpCircle size={20} color={colors.text} />}
          onPress={() => {}}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.text }}
        />
      </Card>
      
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Account
      </Text>
      
      <Card>
        <Button
          title="Clear All Data"
          icon={<Trash2 size={20} color={colors.error} />}
          onPress={handleClearData}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.error }}
        />
        
        <Button
          title="Log Out"
          icon={<LogOut size={20} color={colors.error} />}
          onPress={handleLogout}
          variant="ghost"
          fullWidth
          style={styles.menuButton}
          textStyle={{ color: colors.error }}
        />
      </Card>
      
      <Text style={[styles.versionText, { color: colors.textSecondary }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 8,
    marginBottom: 12,
  },
  menuButton: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 24,
    marginBottom: 16,
  },
});