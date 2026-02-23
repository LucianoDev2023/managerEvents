import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Utensils,
} from 'lucide-react-native';
import { Event, FinancialRecord, Task } from '@/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

// --- Widget: Itens Solucionados ---
export const SolvedItemsWidget = ({ tasks = [] }: { tasks?: Task[] }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const percentage = total > 0 ? completed / total : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Itens Solucionados
        </Text>
        <CheckCircle2 size={20} color={colors.primary} />
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {completed} de {total} tarefas concluídas
      </Text>
    </View>
  );
};

// --- Widget: Prazos / Pendências ---
export const DeadlinesWidget = ({
  tasks = [],
  financials = [],
}: {
  tasks?: Task[];
  financials?: FinancialRecord[];
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  // Filtra itens com prazo e não concluídos/pagos
  const pendingTasks = tasks
    .filter((t) => !t.completed && t.deadline)
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());
  const pendingFinance = financials
    .filter((f) => !f.paid && f.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());

  const upcoming = [...pendingTasks, ...pendingFinance].slice(0, 3); // Mostra top 3

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Próximos Prazos
        </Text>
        <AlertCircle size={20} color={colors.warning} />
      </View>

      {upcoming.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Nenhum prazo próximo.
        </Text>
      ) : (
        upcoming.map((item, idx) => {
          const isTask = 'title' in item;
          const label = isTask
            ? (item as Task).title
            : (item as FinancialRecord).description;
          const date = isTask
            ? (item as Task).deadline
            : (item as FinancialRecord).dueDate;
          return (
            <View key={idx} style={styles.rowItem}>
              <Text
                numberOfLines={1}
                style={[styles.rowText, { color: colors.text }]}
              >
                {label}
              </Text>
              <Text style={[styles.dateText, { color: colors.error }]}>
                {date?.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
};

// --- Widget: Resumo Financeiro ---
export const FinancialSummaryWidget = ({
  financials = [],
  targetBudget = 0,
}: {
  financials?: FinancialRecord[];
  targetBudget?: number;
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const totalSpent = financials.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = targetBudget - totalSpent;
  const isOverBudget = balance < 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Financeiro</Text>
        <CircleDollarSign size={20} color={colors.success} />
      </View>

      <View style={styles.financeRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Orçamento
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            R$ {targetBudget.toFixed(2)}
          </Text>
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Gasto
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            R$ {totalSpent.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Saldo Restante
        </Text>
        <Text
          style={[
            styles.bigValue,
            { color: isOverBudget ? colors.error : colors.success },
          ]}
        >
          R$ {balance.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

// --- Widget: Buffet ---
export const BuffetWidget = ({ items = [] }: { items?: string[] }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Buffet (Incluso)
        </Text>
        <Utensils size={20} color={colors.primary} />
      </View>

      <View style={styles.chipsContainer}>
        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum item listado.
          </Text>
        ) : (
          items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.chip,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>
                {item}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowText: {
    fontSize: 14,
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'Inter-Regular',
  },
  value: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  bigValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
