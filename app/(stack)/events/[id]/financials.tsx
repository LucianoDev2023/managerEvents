import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEvents } from '@/context/EventsContext';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { useColorScheme } from 'react-native';
import { Plus, Trash2, Edit, Phone, Share } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FinancialRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function FinancialManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, updateFinancials, updateTargetBudget } = useEvents();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [event, setEvent] = useState<any>(null);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FinancialRecord['category']>('outros');
  const [paid, setPaid] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  
  // Supplier State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (id) {
      const found = state.events.find(e => e.id === id);
      if (found) {
        setEvent(found);
        setFinancials(found.financials || []);
      }
    }
  }, [id, state.events]);

  const openAddModal = () => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setCategory('outros');
    setPaid(false);
    setDueDate(new Date());
    setSupplierName('');
    setSupplierPhone('');
    setModalVisible(true);
  };

  const openEditModal = (item: FinancialRecord) => {
    setEditingId(item.id);
    setDescription(item.description);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setPaid(item.paid);
    setDueDate(item.dueDate ? new Date(item.dueDate) : new Date());
    setSupplierName(item.supplier?.name ?? '');
    setSupplierPhone(item.supplier?.phone ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const errors: string[] = [];

    if (!description.trim()) errors.push('Descrição');
    if (!amount.trim()) errors.push('Valor');



    if (errors.length > 0) {
      Alert.alert('Campos obrigatórios faltando:', errors.join('\n'));
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount)) {
      Alert.alert('Erro', 'Valor numérico inválido.');
      return;
    }

    setLoading(true);
    try {
      let updatedList = [...financials];

      // Build the supplier object safely to avoid undefined values in Firestore
      let supplierData: FinancialRecord['supplier'] | undefined;
      
      if (supplierName.trim()) {
          supplierData = {
              name: supplierName.trim(),
          };
          if (supplierPhone.trim()) {
              supplierData.phone = supplierPhone.trim();
          }
      }
  
      if (editingId) {
        updatedList = updatedList.map(item => {
          if (item.id === editingId) {
              // Create a clean object
              const updatedItem: FinancialRecord = {
                  ...item,
                  description,
                  amount: numAmount,
                  category,
                  paid,
                  dueDate,
              };
              
              // Assign supplier only if valid, otherwise ensure it's removed
              if (supplierData) {
                  updatedItem.supplier = supplierData;
              } else {
                  delete updatedItem.supplier;
              }
              return updatedItem;
          }
          return item;
        });
      } else {
        const newItem: FinancialRecord = {
          id: uuidv4(),
          description,
          amount: numAmount,
          category,
          paid,
          dueDate,
        };
        
        if (supplierData) {
            newItem.supplier = supplierData;
        }
        updatedList.push(newItem);
      }

      await updateFinancials(id!, updatedList);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (itemId: string) => {
    Alert.alert('Excluir', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Sim', 
        style: 'destructive',
        onPress: async () => {
          const updated = financials.filter(f => f.id !== itemId);
          await updateFinancials(id!, updated);
        }
      }
    ]);
  };

  const handleSaveBudget = async () => {
    const budgetVal = parseFloat(newBudget.replace(',', '.'));
    if (isNaN(budgetVal) || budgetVal < 0) {
        Alert.alert('Erro', 'Valor inválido');
        return;
    }
    
    setLoading(true);
    try {
        await updateTargetBudget(id!, budgetVal);
        setBudgetModalVisible(false);
    } catch (e) {
        Alert.alert('Erro', 'Falha ao atualizar orçamento');
    } finally {
        setLoading(false);
    }
  };
  
  const handleOpenWhatsApp = (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) return;
      Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const categories: FinancialRecord['category'][] = ['aluguel', 'musico', 'buffet', 'decoracao', 'Salão de festas', 'outros'];

  const totalBudget = event?.targetBudget || 0;
  const totalSpent = financials.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = totalBudget - totalSpent;
  
  const hasFinancialData = totalBudget > 0 || totalSpent > 0;

  // ... inside component

  const handleExportPDF = async () => {
    if (!hasFinancialData) return;

    try {
      setLoading(true);
      
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #333; }
              .summary { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .paid { color: green; font-weight: bold; }
              .pending { color: orange; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <h2>${event?.title || 'Evento'}</h2>
            
            <div class="summary">
              <p><strong>Orçamento:</strong> R$ ${totalBudget.toFixed(2)}</p>
              <p><strong>Total Gasto:</strong> R$ ${totalSpent.toFixed(2)}</p>
              <p><strong>Restante:</strong> R$ ${remaining.toFixed(2)}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                ${financials.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.category}</td>
                    <td>R$ ${item.amount.toFixed(2)}</td>
                    <td>${new Date(item.dueDate!).toLocaleDateString('pt-BR')}</td>
                    <td class="${item.paid ? 'paid' : 'pending'}">${item.paid ? 'Pago' : 'Pendente'}</td>
                    <td>${item.supplier?.name ? `${item.supplier.name} ${item.supplier.phone ? `(${item.supplier.phone})` : ''}` : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
            title: 'Gerenciar Financeiro',
            headerRight: () => null,
        }} 
      />
      
      <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Controle orçamentos, gastos e pagamentos do evento:
        </Text>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
          {event?.title || '...'}
        </Text>
      </View>

      {/* Resumo */}
      <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
         <View style={styles.summaryRow}>
             <Text style={[styles.label, { color: colors.textSecondary }]}>Orçamento</Text>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Text style={[styles.value, { color: colors.text, marginRight: 8 }]}>R$ {totalBudget.toFixed(2)}</Text>
                 <TouchableOpacity 
                     style={{ 
                         backgroundColor: colors.primary, 
                         width: 28, 
                         height: 28, 
                         borderRadius: 14, 
                         justifyContent: 'center', 
                         alignItems: 'center' 
                     }}
                     onPress={() => {
                         setNewBudget(totalBudget.toString());
                         setBudgetModalVisible(true);
                     }}
                 >
                    <Plus size={16} color="#fff" />
                 </TouchableOpacity>
             </View>
         </View>
         <View style={styles.summaryRow}>
             <Text style={[styles.label, { color: colors.textSecondary }]}>Gasto</Text>
             <Text style={[styles.value, { color: colors.text }]}>R$ {totalSpent.toFixed(2)}</Text>
         </View>
         <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
             <Text style={[styles.label, { color: colors.textSecondary }]}>Restante</Text>
             <Text style={[styles.bigValue, { color: remaining < 0 ? colors.error : colors.success }]}>
                 R$ {remaining.toFixed(2)}
             </Text>
         </View>
      </View>

      <FlatList
        data={financials}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 180 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.itemCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => openEditModal(item)}
          >
            <View style={styles.itemHeader}>
                <View>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.description}</Text>
                    {item.supplier?.name && (
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            Fornecedor: {item.supplier.name}
                        </Text>
                    )}
                </View>
                <Text style={[styles.itemAmount, { color: colors.text }]}>R$ {item.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.itemFooter}>
                <View style={[styles.badge, { backgroundColor: item.paid ? colors.success + '20' : colors.warning + '20' }]}>
                    <Text style={{ color: item.paid ? colors.success : colors.warning, fontSize: 12 }}>
                        {item.paid ? 'Pago' : 'Pendente'}
                    </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {new Date(item.dueDate!).toLocaleDateString('pt-BR')}
                </Text>

                <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 12 }}>
                    {item.supplier?.phone && (
                        <TouchableOpacity onPress={() => handleOpenWhatsApp(item.supplier!.phone!)} style={{ padding: 4 }}>
                            <Phone size={18} color="#25D366" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => openEditModal(item)} style={{ padding: 4 }}>
                        <Edit size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
                        <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Footer Fixo */}
      <View style={[styles.footer, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Button 
                title="Novo Lançamento" 
                onPress={openAddModal} 
                icon={<Plus size={20} color="#fff" />}
                style={{ height: 48, borderRadius: 30 }}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
             <Button 
                title="PDF" 
                onPress={handleExportPDF} 
                loading={loading}
                variant="outline"
                disabled={!hasFinancialData}
                icon={<Share size={20} color={hasFinancialData ? colors.primary : colors.textSecondary} />}
                style={{ height: 48, borderColor: hasFinancialData ? colors.primary : colors.border, borderRadius: 30  }}
                textStyle={{ color: hasFinancialData ? colors.primary : colors.textSecondary }}
            />
          </View>
      </View>

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
              <ScrollView 
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                  <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, padding: 16 }]}>
                      <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>
                          {editingId ? 'Editar Item' : 'Novo Item'}
                      </Text>

                      <TextInput 
                          label="Descrição" 
                          value={description} 
                          onChangeText={setDescription}
                          style={{ marginBottom: 8 }}
                      />
                      
                      <TextInput 
                          label="Valor (R$)" 
                          value={amount} 
                          onChangeText={setAmount}
                          keyboardType="numeric"
                          style={{ marginBottom: 8 }}
                      />

                      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4, marginBottom: 4 }]}>Categoria</Text>
                      <View style={[styles.chipsRow, { marginVertical: 4 }]}>
                          {categories.map(cat => (
                              <TouchableOpacity 
                                  key={cat} 
                                  style={[
                                      styles.chip, 
                                      { backgroundColor: category === cat ? colors.primary : colors.backgroundSecondary, padding: 6, margin: 2 }
                                  ]}
                                  onPress={() => setCategory(cat)}
                              >
                                  <Text style={{ color: category === cat ? '#fff' : colors.text, fontSize: 13 }}>
                                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      {/* Seção Fornecedor */}
                      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12, marginBottom: 4 }]}>
                          Dados do Fornecedor (Opcional)
                      </Text>
                      <TextInput 
                          label="Nome" 
                          value={supplierName} 
                          onChangeText={setSupplierName}
                          style={{ marginBottom: 8 }}
                      />
                      <TextInput 
                          label="Telefone (WhatsApp)" 
                          value={supplierPhone} 
                          onChangeText={setSupplierPhone}
                          keyboardType="phone-pad"
                          style={{ marginBottom: 8 }}
                      />

                      <View style={[styles.rowInput, { marginVertical: 8 }]}>
                          <Text style={{ color: colors.text, fontSize: 16 }}>Status: {paid ? 'Pago' : 'Pendente'}</Text>
                          <Switch value={paid} onValueChange={setPaid} trackColor={{ false: '#767577', true: colors.primary }} />
                      </View>

                      <TouchableOpacity 
                          style={[styles.dateButton, { borderColor: colors.border, padding: 12, marginVertical: 4 }]}
                          onPress={() => setShowDatePicker(true)}
                      >
                          <Text style={{ color: colors.text }}>Data: {dueDate.toLocaleDateString()}</Text>
                      </TouchableOpacity>

                      {showDatePicker && (
                          <DateTimePicker
                              value={dueDate}
                              mode="date"
                              onChange={(e, date) => {
                                  setShowDatePicker(false);
                                  if (date) setDueDate(date);
                              }}
                          />
                      )}

                      <View style={[styles.modalActions, { marginTop: 12 }]}>
                          <Button title="Cancelar" variant="cancel" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
                          <Button title="Salvar" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
                      </View>
                  </View>
              </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Edit Budget */}
      <Modal visible={budgetModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Definir Orçamento</Text>
                <TextInput 
                    label="Valor Total (R$)" 
                    value={newBudget} 
                    onChangeText={setNewBudget}
                    keyboardType="numeric"
                />
                <View style={styles.modalActions}>
                    <Button title="Cancelar" variant="cancel" onPress={() => setBudgetModalVisible(false)} style={{ flex: 1 }} />
                    <Button title="Salvar" onPress={handleSaveBudget} loading={loading} style={{ flex: 1 }} />
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, fontFamily: Fonts.regular },
  value: { fontSize: 16, fontFamily: Fonts.bold },
  bigValue: { fontSize: 20, fontFamily: Fonts.bold },
  
  itemCard: { padding: 12, marginBottom: 8, borderRadius: 8, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: 16, fontWeight: 'bold' },
  itemAmount: { fontSize: 16 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 16, 
    borderTopWidth: 1, 
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: { padding: 8, borderRadius: 16 },
  rowInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  dateButton: { padding: 12, borderWidth: 1, borderRadius: 16, marginVertical: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 }
});
