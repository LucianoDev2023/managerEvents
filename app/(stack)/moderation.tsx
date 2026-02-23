import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { ArrowLeft, Flag, Trash2, CheckCircle, XCircle } from 'lucide-react-native';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  getDoc,
} from 'firebase/firestore';

import Colors from '@/constants/Colors';
import { useEvents } from '@/context/EventsContext';
import { getOptimizedUrl } from '@/lib/cloudinary';
import { logger } from '@/lib/logger';

type Report = {
  id: string;
  reportedBy: string;
  contentType: 'photo' | 'comment';
  contentId: string;
  contentCreatorUid: string;
  reason?: string;
  justification?: string;
  eventId: string;
  programId?: string;
  activityId?: string;
  timestamp: any;
  status: 'pending' | 'resolved' | 'dismissed';
  photoUrl?: string; // Added for displaying photo
};

export default function ModerationDashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { state } = useEvents();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is admin of any event
  const isAdmin = state.events.some(
    (event) =>
      event.userId === uid ||
      event.subAdminsByUid?.[uid || ''] === 'Super Admin',
  );

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        'Acesso negado',
        'Você não tem permissão para acessar esta tela.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
      return;
    }

    loadReports();
  }, [isAdmin]);

  const loadReports = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const db = getFirestore();

      // Get all event IDs where user is admin
      const adminEventIds = state.events
        .filter(
          (event) =>
            event.userId === uid ||
            event.subAdminsByUid?.[uid] === 'Super Admin',
        )
        .map((event) => event.id);

      if (adminEventIds.length === 0) {
        setReports([]);
        return;
      }

      // Query reports for these events
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('eventId', 'in', adminEventIds),
        orderBy('timestamp', 'desc'),
      );

      const snapshot = await getDocs(q);
      const reportsData: Report[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Report[];

      // Fetch photo URLs for photo reports
      const reportsWithPhotos = await Promise.all(
        reportsData.map(async (report) => {
          if (report.contentType === 'photo') {
            try {
              // Fetch photo document from the appropriate collection
              const photoRef = doc(db, 'events', report.eventId, 'programs', report.programId || '', 'activities', report.activityId || '', 'photos', report.contentId);
              const photoDoc = await getDoc(photoRef);
              
              if (photoDoc.exists()) {
                const photoData = photoDoc.data();
                // Use uri if available, otherwise construct Cloudinary URL from publicId
                let photoUrl = photoData.uri || photoData.url;
                
                // If we only have publicId, construct the full Cloudinary URL
                if (!photoUrl && photoData.publicId) {
                  photoUrl = `https://res.cloudinary.com/dxhcv6buy/image/upload/${photoData.publicId}`;
                }
                
                return {
                  ...report,
                  photoUrl,
                };
              }
            } catch (error) {
              logger.error('Error fetching photo:', error);
            }
          }
          return report;
        })
      );

      setReports(reportsWithPhotos);
    } catch (error) {
      logger.error('Error loading reports:', error);
      Alert.alert('Erro', 'Não foi possível carregar as denúncias.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string) => {
    try {
      setProcessingId(reportId);
      const db = getFirestore();
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
      });
      await loadReports();
      Alert.alert('Sucesso', 'Denúncia marcada como resolvida.');
    } catch (error) {
      logger.error('Error resolving report:', error);
      Alert.alert('Erro', 'Não foi possível resolver a denúncia.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      setProcessingId(reportId);
      const db = getFirestore();
      await deleteDoc(doc(db, 'reports', reportId));
      await loadReports();
      Alert.alert('Sucesso', 'Denúncia descartada.');
    } catch (error) {
      logger.error('Error dismissing report:', error);
      Alert.alert('Erro', 'Não foi possível descartar a denúncia.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteResolved = (reportId: string) => {
    Alert.alert(
      'Remover denúncia',
      'Esta ação é irreversível. O registro será excluído permanentemente. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(reportId);
              const db = getFirestore();
              await deleteDoc(doc(db, 'reports', reportId));
              setReports((prev) => prev.filter((r) => r.id !== reportId));
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a denúncia.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const handleClearResolved = () => {
    if (resolvedReports.length === 0) return;
    Alert.alert(
      'Limpar resolvidas',
      `Remover permanentemente ${resolvedReports.length} denúncia(s) resolvida(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const db = getFirestore();
              await Promise.all(
                resolvedReports.map((r) => deleteDoc(doc(db, 'reports', r.id))),
              );
              setReports((prev) => prev.filter((r) => r.status !== 'resolved'));
            } catch {
              Alert.alert('Erro', 'Falha ao limpar denúncias.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data desconhecida';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getEventName = (eventId: string) => {
    const event = state.events.find((e) => e.id === eventId);
    return event?.title || 'Evento desconhecido';
  };

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const resolvedReports = reports.filter((r) => r.status === 'resolved');

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Moderação',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando denúncias...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Esta tela exibe denúncias de conteúdo impróprio feitas por convidados. Use <Text style={{ fontFamily: 'Inter-Bold', color: colors.text }}>Resolver</Text> para marcar como tratada (após excluir o conteúdo ou tomar ação) ou <Text style={{ fontFamily: 'Inter-Bold', color: colors.text }}>Descartar</Text> para remover denúncias inválidas.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🚨 Pendentes ({pendingReports.length})
            </Text>

            {pendingReports.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma denúncia pendente! 🎉
                </Text>
              </View>
            ) : (
              pendingReports.map((report) => (
                <View
                  key={report.id}
                  style={[styles.reportCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                >
                  <View style={styles.reportHeader}>
                    <Flag size={18} color={colors.error} />
                    <Text style={[styles.reportType, { color: colors.text }]}>
                      {report.contentType === 'photo' ? 'Foto' : 'Comentário'}
                    </Text>
                  </View>

                  <Text style={[styles.reportInfo, { color: colors.textSecondary }]}>
                    <Text style={{ fontFamily: 'Inter-Bold' }}>Evento:</Text> {getEventName(report.eventId)}
                  </Text>
                  <Text style={[styles.reportInfo, { color: colors.textSecondary }]}>
                    <Text style={{ fontFamily: 'Inter-Bold' }}>Data:</Text> {formatDate(report.timestamp)}
                  </Text>
                  
                  {report.contentType === 'photo' && report.photoUrl && (
                    <Image
                      source={{ uri: getOptimizedUrl(report.photoUrl, { width: 200, height: 200 }) }}
                      style={styles.reportThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  {report.reason && (
                    <Text style={[styles.reportInfo, { color: colors.textSecondary }]}>
                      <Text style={{ fontFamily: 'Inter-Bold' }}>Motivo:</Text> {
                        report.reason === 'offensive' ? 'Conteúdo ofensivo' :
                        report.reason === 'spam' ? 'Spam' :
                        'Conteúdo impróprio'
                      }
                    </Text>
                  )}
                  {report.justification && (
                    <Text style={[styles.reportInfo, { color: colors.textSecondary }]}>
                      <Text style={{ fontFamily: 'Inter-Bold' }}>Justificativa:</Text> "{report.justification}"
                    </Text>
                  )}

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
                      onPress={() => handleResolve(report.id)}
                      disabled={processingId === report.id}
                    >
                      {processingId === report.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <CheckCircle size={16} color="white" />
                          <Text style={styles.actionBtnText}>Resolver</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.textSecondary }]}
                      onPress={() => handleDismiss(report.id)}
                      disabled={processingId === report.id}
                    >
                      {processingId === report.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Trash2 size={16} color="white" />
                          <Text style={styles.actionBtnText}>Descartar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {resolvedReports.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  ✅ Resolvidas ({resolvedReports.length})
                </Text>
                <TouchableOpacity
                  onPress={handleClearResolved}
                  style={[styles.clearBtn, { borderColor: colors.error }]}
                >
                  <Trash2 size={14} color={colors.error} />
                  <Text style={[styles.clearBtnText, { color: colors.error }]}>Limpar todas</Text>
                </TouchableOpacity>
              </View>

              {resolvedReports.map((report) => (
                <View
                  key={report.id}
                  style={[
                    styles.reportCard,
                    { backgroundColor: colors.backgroundCard, borderColor: colors.border, opacity: 0.7 },
                  ]}
                >
                  <View style={styles.reportHeader}>
                    <CheckCircle size={18} color="#4caf50" />
                    <Text style={[styles.reportType, { color: colors.text }]}>
                      {report.contentType === 'photo' ? 'Foto' : 'Comentário'}
                    </Text>
                  </View>

                  <Text style={[styles.reportInfo, { color: colors.textSecondary }]}>
                    {getEventName(report.eventId)} · {formatDate(report.timestamp)}
                  </Text>

                  <TouchableOpacity
                    style={[styles.removeResolvedBtn, { borderColor: colors.border }]}
                    onPress={() => handleDeleteResolved(report.id)}
                    disabled={processingId === report.id}
                  >
                    {processingId === report.id ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <>
                        <XCircle size={14} color={colors.textSecondary} />
                        <Text style={[styles.removeResolvedText, { color: colors.textSecondary }]}>Remover</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  removeResolvedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  removeResolvedText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportType: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  reportInfo: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  reportThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
});
