import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  ScrollView,
  Platform,
  Pressable,
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

  /** Opcional: altura máxima do modal (se não passar, calcula com base na tela) */
  maxModalHeight?: number;
  /** Opcional: define a partir de quantos itens o modal vira “scrollável” com lista */
  scrollThreshold?: number;
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
  maxModalHeight,
  scrollThreshold = 8,
}: CustomDropdownProps<T>) {
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const { height: screenHeight } = useWindowDimensions();

  // ✅ modal responsivo: 65% da altura, com teto
  const computedMaxHeight = Math.min(
    maxModalHeight ?? screenHeight * 0.65,
    520,
  );

  // ✅ se poucos itens, a gente evita FlatList (melhor UX) e deixa sem scroll pesado
  const shouldUseScrollList = items.length >= scrollThreshold;

  const close = () => setModalVisible(false);

  const GradientModal = ({ children }: { children: React.ReactNode }) => (
    <LinearGradient
      colors={
        scheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      locations={[0, 0.7, 1]}
      style={[styles.modal, { maxHeight: computedMaxHeight }]}
    >
      {children}
    </LinearGradient>
  );

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdown,
          {
            backgroundColor: backgroundColor ?? colors.backgroundSecondary,
            borderColor: borderColor ?? colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        {icon}
        <Text
          style={[styles.text, { color: textColor ?? colors.text }]}
          numberOfLines={1}
        >
          {selectedItem ? getItemLabel(selectedItem) : placeholder}
        </Text>
        <ChevronDown size={20} color={textColor ?? colors.text} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        {/* overlay clicável */}
        <Pressable style={styles.modalOverlay} onPress={close}>
          {/* impede fechar ao clicar dentro do modal */}
          <Pressable
            style={[
              styles.modalWrapper,
              {
                borderColor:
                  scheme === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.10)',
              },
            ]}
            onPress={() => {}}
          >
            <GradientModal>
              <Text style={[styles.select, { color: colors.primary }]}>
                Selecione o evento na lista
              </Text>

              {items.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Você não possui convites confirmados.
                </Text>
              ) : shouldUseScrollList ? (
                // ✅ Caso haja “necessidade”: usa FlatList (já é scrollável e performático)
                <FlatList
                  data={items}
                  keyExtractor={(_, index) => index.toString()}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 6 }}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedItem(item);
                        onSelect(item);
                        close();
                      }}
                      style={[
                        styles.option,
                        {
                          borderBottomColor:
                            scheme === 'dark'
                              ? 'rgba(255,255,255,0.10)'
                              : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.optionText, { color: colors.text }]}>
                        {`${index + 1}. ${getItemLabel(item)}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                // ✅ Poucos itens: ScrollView simples (sem overhead de FlatList e UX mais “curta”)
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 6 }}
                >
                  {items.map((item, index) => (
                    <TouchableOpacity
                      key={index.toString()}
                      onPress={() => {
                        setSelectedItem(item);
                        onSelect(item);
                        close();
                      }}
                      style={[
                        styles.option,
                        {
                          borderBottomColor:
                            scheme === 'dark'
                              ? 'rgba(255,255,255,0.10)'
                              : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.optionText, { color: colors.text }]}>
                        {`${index + 1}. ${getItemLabel(item)}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </GradientModal>
          </Pressable>
        </Pressable>
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
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  modal: {
    minHeight: 120,
    padding: 16,
    borderRadius: 20,
  },

  select: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },

  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
