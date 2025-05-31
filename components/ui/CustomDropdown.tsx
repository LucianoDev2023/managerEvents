import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

export type DropdownItem = any;

type CustomDropdownProps<T> = {
  items: T[];
  onSelect: (item: T) => void;
  getItemLabel: (item: T) => string;
  placeholder?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
};

export default function CustomDropdown<T>({
  items,
  onSelect,
  getItemLabel,
  placeholder = 'Selecione...',
  icon,
  backgroundColor,
  borderColor,
  textColor,
}: CustomDropdownProps<T>) {
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdown,
          {
            backgroundColor: backgroundColor ?? colors.backGroundSecondary,
            borderColor: borderColor ?? colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        {icon}
        <Text style={[styles.text, { color: textColor ?? colors.text }]}>
          {selectedItem ? getItemLabel(selectedItem) : placeholder}
        </Text>
        <ChevronDown size={20} color={textColor ?? colors.text} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalWrapper}>
            <LinearGradient
              colors={
                scheme === 'dark'
                  ? ['#0b0b0f', '#1b0033', '#3e1d73']
                  : ['#ffffff', '#f0f0ff', '#e9e6ff']
              }
              style={styles.modal}
              locations={[0, 0.7, 1]}
            >
              <Text style={[styles.select, { color: colors.primary }]}>
                Selecione o evento na lista
              </Text>
              <FlatList
                data={items}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedItem(item);
                      onSelect(item);
                      setModalVisible(false);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor:
                          index % 2 === 0
                            ? colors.backGroundSecondary
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {`${index + 1}. ${getItemLabel(item)}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalWrapper: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modal: {
    padding: 16,
    borderRadius: 20,
    maxHeight: 420,
  },
  select: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
