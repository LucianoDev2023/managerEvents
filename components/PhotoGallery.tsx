import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Trash2, Send, X, Flag, Ban } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import ImageView from 'react-native-image-viewing';

import Colors from '@/constants/Colors';
import { usePhotoComments } from '@/hooks/usePhotoComments';
import { getOptimizedUrl } from '@/lib/cloudinary';
import type { Photo } from '@/types';
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useBlockedPhotos } from '@/hooks/useBlockedPhotos';

type Props = {
  eventId: string;
  programId: string;
  activityId: string;

  photos: Photo[];
  onDeletePhoto: (photoId: string, publicId?: string) => void;

  eventCreatorId: string; // event.userId (UID)
  currentUid: string;
  isSuperAdmin: boolean;

  // ✅ opcional: se você tiver o nome do usuário logado no app/context, passe aqui
  currentUserName?: string;
};

function formatTimeAgo(createdAt: any) {
  try {
    const date: Date | null =
      typeof createdAt?.toDate === 'function'
        ? createdAt.toDate()
        : createdAt instanceof Date
          ? createdAt
          : typeof createdAt === 'number'
            ? new Date(createdAt)
            : null;

    if (!date) return 'agora';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} d`;
  } catch {
    return 'agora';
  }
}

/**
 * ✅ Resolve "quem criou a foto" de forma robusta:
 * - novo padrão: createdByUid
 * - compat: userId / uid
 * - legado: createdBy (email) -> NÃO dá pra comparar com UID (então vira "")
 */
function getPhotoCreatorUid(photo: Photo): string {
  const p: any = photo;
  return (
    p.createdByUid ||
    p.uid ||
    p.userId || // legado em alguns lugares
    ''
  );
}

function getPhotoTimestamp(photo: Photo): any {
  const p: any = photo;
  return p.timestamp ?? p.createdAt ?? null;
}

type PhotoItemProps = {
  photo: Photo;
  index: number;

  colors: any;
  scheme: 'light' | 'dark';

  eventId: string;
  programId: string;
  activityId: string;

  eventCreatorId: string;
  currentUid: string;
  isSuperAdmin: boolean;
  currentUserName?: string;
  resolvedCreatorName: string; // ✅ Recebe o nome já resolvido

  onDeletePhoto: (photoId: string, publicId?: string) => void;
  onOpen: () => void;
  onReportPhoto: (
    photoId: string,
    creatorUid: string,
    reason: string,
    justification: string,
  ) => void;
  onBlockPhoto: (photoId: string, creatorUid: string) => void;
};

function PhotoItem({
  photo,
  index,
  colors,
  scheme,
  eventId,
  programId,
  activityId,
  eventCreatorId,
  currentUid,
  isSuperAdmin,
  currentUserName,
  resolvedCreatorName,
  onDeletePhoto,
  onOpen,
  onReportPhoto,
  onBlockPhoto,
}: PhotoItemProps) {
  const photoCreatorUid = useMemo(() => getPhotoCreatorUid(photo), [photo]);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportJustification, setReportJustification] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // ✅ Estado local para nomes dos autores dos comentários
  const [resolvedCommentNames, setResolvedCommentNames] = useState<Record<string, string>>({});
  const db = getFirestore();

  const canDeleteThisPhoto = useMemo(() => {
    // ✅ UID-only
    return (
      isSuperAdmin ||
      currentUid === eventCreatorId ||
      (!!photoCreatorUid && currentUid === photoCreatorUid)
    );
  }, [isSuperAdmin, currentUid, eventCreatorId, photoCreatorUid]);

  const currentUserSafe = useMemo(
    () => ({
      uid: currentUid,
      name: currentUserName?.trim() ? currentUserName.trim() : 'Usuário',
      isSuperAdmin,
    }),
    [currentUid, currentUserName, isSuperAdmin],
  );

  const {
    comments,
    newComment,
    setNewComment,
    addComment,
    confirmDeleteComment,
    canDeleteComment,
    isAddingComment,
    isDeletingCommentIds,
  } = usePhotoComments({
    eventId,
    programId,
    activityId,
    photoId: photo.id,
    currentUser: currentUserSafe,
    eventCreatorId,
    photoCreatorId: photoCreatorUid || 'unknown', // ✅ UID (ou placeholder)
  });

  // ✅ Efeito para resolver nomes dos comentários
  useEffect(() => {
    const fetchCommentNames = async () => {
      const uidsToFetch = new Set<string>();
      comments.forEach(c => {
        if (c.uid && c.uid !== currentUid && !resolvedCommentNames[c.uid]) {
          uidsToFetch.add(c.uid);
        }
      });

      if (uidsToFetch.size === 0) return;

      const newNames = { ...resolvedCommentNames };
      let changed = false;

      for (const uid of uidsToFetch) {
        let nameFound = '';
        
        try {
          // 1. Tenta na participação do evento (nome editado/ acompanhantes)
          const partSnap = await getDoc(doc(db, 'guestParticipations', `${uid}_${eventId}`));
          if (partSnap.exists() && partSnap.data().userName) {
            nameFound = partSnap.data().userName;
          }
        } catch (e) {
          // Ignora erro de permissão ou falta de documento na participação
        }

        if (!nameFound) {
          try {
            // 2. Tenta no perfil público (nome do Google/Cadastro)
            const userSnap = await getDoc(doc(db, 'publicUsers', uid));
            if (userSnap.exists() && userSnap.data().name) {
              nameFound = userSnap.data().name;
            }
          } catch (e) {
            // Ignora erro de permissão no perfil público
          }
        }

        if (nameFound) {
          newNames[uid] = nameFound;
          changed = true;
        } else if (!newNames[uid]) {
          newNames[uid] = 'Usuário';
          changed = true;
        }
      }

      if (changed) setResolvedCommentNames(newNames);
    };

    if (comments.length > 0) fetchCommentNames();
  }, [comments, eventId]);

  const handleDeletePhoto = useCallback(() => {
    if (!canDeleteThisPhoto) {
      Alert.alert(
        'Acesso negado',
        'Você não tem permissão para excluir esta foto.',
      );
      return;
    }

    Alert.alert('Excluir foto', 'Tem certeza que deseja excluir esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => onDeletePhoto(photo.id, (photo as any).publicId),
      },
    ]);
  }, [canDeleteThisPhoto, onDeletePhoto, photo]);

  const handleReportPhoto = useCallback(() => {
    setReportModalVisible(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert('Erro', 'Escolha um motivo para a denúncia.');
      return;
    }

    const justification = reportJustification.trim();
    if (!justification) {
      Alert.alert('Erro', 'Por favor, justifique a denúncia.');
      return;
    }

    if (justification.length > 30) {
      Alert.alert('Erro', 'A justificativa deve ter no máximo 30 caracteres.');
      return;
    }

    setSubmittingReport(true);
    try {
      await onReportPhoto(
        photo.id,
        photoCreatorUid,
        selectedReason,
        justification,
      );
      setReportModalVisible(false);
      setSelectedReason(null);
      setReportJustification('');
    } finally {
      setSubmittingReport(false);
    }
  }, [
    selectedReason,
    reportJustification,
    photo.id,
    photoCreatorUid,
    onReportPhoto,
  ]);

  const handleBlockPhoto = useCallback(() => {
    if (!photo.id) return;

    Alert.alert(
      'Ocultar foto',
      'Esta foto não será mais exibida para você. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: () => onBlockPhoto(photo.id, photoCreatorUid),
        },
      ],
    );
  }, [photo.id, photoCreatorUid, onBlockPhoto]);

  return (
    <View style={[styles.photoCard, { backgroundColor: colors.background }]}>
      <Pressable onPress={onOpen}>
        <Image
          source={{ uri: getOptimizedUrl(photo.uri, { width: 800 }) }}
          style={styles.photo}
        />
      </Pressable>

      <View style={styles.photoHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.photoMeta, { color: colors.textSecondary }]}>
            Foto {index + 1} · {formatTimeAgo(getPhotoTimestamp(photo))}
          </Text>
          <Text style={[styles.photoMeta, { color: colors.primary, marginTop: 2, fontSize: 12, fontWeight: '600' }]}>
            Enviada por {resolvedCreatorName}
          </Text>
        </View>

        {canDeleteThisPhoto && (
          <TouchableOpacity
            onPress={handleDeletePhoto}
            style={styles.deleteBtn}
          >
            <Trash2 size={18} color={colors.error} />
            <Text style={[styles.deleteBtnText, { color: colors.error }]}>
              Excluir
            </Text>
          </TouchableOpacity>
        )}

        {photoCreatorUid && photoCreatorUid !== currentUid && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleReportPhoto}
              style={styles.reportBtn}
            >
              <Flag size={16} color={colors.textSecondary} />
              <Text
                style={[styles.reportBtnText, { color: colors.textSecondary }]}
              >
                Denunciar
              </Text>
            </TouchableOpacity>

            {/* Apenas convidados comuns podem ocultar fotos */}
            {!isSuperAdmin && currentUid !== eventCreatorId && (
              <TouchableOpacity
                onPress={handleBlockPhoto}
                style={styles.reportBtn}
              >
                <Ban size={16} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.reportBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Ocultar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {!!photo.description && (
        <Text style={[styles.photoDescription, { color: colors.text }]}>
          {photo.description}
        </Text>
      )}

      <View
        style={[
          styles.commentsContainer,
          scheme === 'dark' ? styles.commentsDark : styles.commentsLight,
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Comentários
        </Text>

        {comments.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum comentário ainda.
          </Text>
        ) : (
          comments.map((comment: any) => {
            const isDeleting = isDeletingCommentIds.includes(comment.id);
            const canDelete = canDeleteComment(comment);

            return (
              <View
                key={comment.id}
                style={[
                  styles.commentCard,
                  scheme === 'dark'
                    ? styles.commentCardDark
                    : styles.commentCardLight,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.commentAuthor, { color: colors.text }]}>
                    {comment.uid === currentUid
                      ? 'Você'
                      : (resolvedCommentNames[comment.uid] ?? comment.name ?? 'Usuário')}{' '}
                    <Text style={{ color: colors.textSecondary }}>
                      · {formatTimeAgo(comment.createdAt)}
                    </Text>
                  </Text>

                  <Text style={[styles.commentText, { color: colors.text }]}>
                    {comment.text}
                  </Text>
                </View>

                {canDelete && (
                  <TouchableOpacity
                    onPress={() => confirmDeleteComment(comment)}
                    disabled={isDeleting}
                    style={styles.commentDeleteBtn}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Trash2 size={16} color={colors.text} />
                    )}
                  </TouchableOpacity>
                )}

                {comment.uid !== currentUid && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Denunciar comentário',
                        'Este comentário será reportado aos administradores.',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Denunciar',
                            style: 'destructive',
                            onPress: () => {
                              Alert.alert(
                                'Denúncia enviada',
                                'Obrigado por nos auxiliar',
                              );
                            },
                          },
                        ],
                      );
                    }}
                    style={styles.commentReportBtn}
                  >
                    <Flag size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <View
          style={[
            styles.addCommentRow,
            scheme === 'dark' ? styles.inputRowDark : styles.inputRowLight,
          ]}
        >
          <View style={{ flex: 1 }}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Adicionar um comentário…"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={50}
              style={[styles.commentInput, { color: colors.text }]}
            />
            {newComment.length > 0 && (
              <Text style={[styles.charCount, {
                color: newComment.length >= 45 ? '#ff9800' : colors.textSecondary,
                alignSelf: 'flex-end',
                fontSize: 11,
                marginTop: 2,
              }]}>
                {newComment.length}/50
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={addComment}
            disabled={!newComment.trim() || isAddingComment || newComment.length > 50}
            style={styles.sendBtn}
          >
            {isAddingComment ? (
              <ActivityIndicator size="small" />
            ) : (
              <Send size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[styles.reportModal, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Denunciar foto
            </Text>

            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              Escolha o motivo:
            </Text>

            <View style={styles.reasonButtons}>
              <TouchableOpacity
                style={[
                  styles.reasonBtn,
                  { borderColor: colors.border },
                  selectedReason === 'offensive' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedReason('offensive')}
              >
                <Text
                  style={[
                    styles.reasonBtnText,
                    {
                      color:
                        selectedReason === 'offensive' ? '#fff' : colors.text,
                    },
                  ]}
                >
                  Conteúdo ofensivo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reasonBtn,
                  { borderColor: colors.border },
                  selectedReason === 'spam' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedReason('spam')}
              >
                <Text
                  style={[
                    styles.reasonBtnText,
                    { color: selectedReason === 'spam' ? '#fff' : colors.text },
                  ]}
                >
                  Spam
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reasonBtn,
                  { borderColor: colors.border },
                  selectedReason === 'inappropriate' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedReason('inappropriate')}
              >
                <Text
                  style={[
                    styles.reasonBtnText,
                    {
                      color:
                        selectedReason === 'inappropriate'
                          ? '#fff'
                          : colors.text,
                    },
                  ]}
                >
                  Conteúdo impróprio
                </Text>
              </TouchableOpacity>
            </View>

            {selectedReason && (
              <>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary, marginTop: 16 },
                  ]}
                >
                  Justifique (máx 30 caracteres):
                </Text>

                <TextInput
                  value={reportJustification}
                  onChangeText={setReportJustification}
                  placeholder="Ex: Imagem inapropriada"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={30}
                  style={[
                    styles.justificationInput,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor:
                        scheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                    },
                  ]}
                />

                <Text
                  style={[styles.charCount, { color: colors.textSecondary }]}
                >
                  {reportJustification.length}/30
                </Text>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setReportModalVisible(false);
                  setSelectedReason(null);
                  setReportJustification('');
                }}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: submittingReport ? 0.6 : 1,
                  },
                ]}
                onPress={submitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function PhotoGallery({
  eventId,
  programId,
  activityId,
  photos,
  onDeletePhoto,
  eventCreatorId,
  currentUid,
  isSuperAdmin,
  currentUserName,
}: Props) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[scheme];

  const db = getFirestore();
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  const {
    blockedPhotoIds,
    blockPhoto,
    loading: loadingBlockedPhotos,
  } = useBlockedPhotos(currentUid);

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => !blockedPhotoIds.has(photo.id));
  }, [photos, blockedPhotoIds]);

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedPhotoForDownload, setSelectedPhotoForDownload] = useState<Photo | null>(null);

  const viewerImages = useMemo(() => 
    visiblePhotos.map(p => ({ uri: p.uri })), 
  [visiblePhotos]);

  // ✅ Efeito para resolver nomes de todos os UIDs presentes (fotos)
  useEffect(() => {
    const fetchNames = async () => {
      const uidsToFetch = new Set<string>();

      photos.forEach(p => {
        const uid = getPhotoCreatorUid(p);
        if (uid) uidsToFetch.add(uid);
      });

      const newResolved: Record<string, string> = { ...resolvedNames };
      let changed = false;

      for (const uid of uidsToFetch) {
        if (newResolved[uid] && newResolved[uid] !== 'Carregando...') continue;

        let nameFound = '';

        try {
          // 1. Tenta na participação do evento (nome editado/ acompanhantes)
          const partSnap = await getDoc(doc(db, 'guestParticipations', `${uid}_${eventId}`));
          if (partSnap.exists() && partSnap.data().userName) {
            nameFound = partSnap.data().userName;
          }
        } catch (e) {
          // Silencioso: pode ser erro de permissão se o leitor não for do evento ou doc não existir
        }

        if (!nameFound) {
          try {
            // 2. Tenta no perfil público (nome do Google/Cadastro)
            const userSnap = await getDoc(doc(db, 'publicUsers', uid));
            if (userSnap.exists() && userSnap.data().name) {
              nameFound = userSnap.data().name;
            }
          } catch (e) {
            // Silencioso
          }
        }

        if (nameFound) {
          newResolved[uid] = nameFound;
          changed = true;
        } else {
          newResolved[uid] = 'Usuário';
          changed = true;
        }
      }

      if (changed) {
        setResolvedNames(newResolved);
      }
    };

    if (photos.length > 0) fetchNames();
  }, [photos, eventId]);

  const handleDownload = useCallback(async (photo: Photo) => {
    if (!photo?.uri) return;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita acesso à galeria para salvar a imagem.',
        );
        return;
      }

      const uri = photo.uri;
      const clean = uri.split('?')[0];
      const ext = (
        clean.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] ?? '.jpg'
      ).toLowerCase();

      if (uri.startsWith('file://')) {
        await MediaLibrary.saveToLibraryAsync(uri);
      } else {
        const filename = `photo-${photo.id}${ext}`;
        const fileUri = (FileSystem.cacheDirectory ?? '') + filename;
        const result = await FileSystem.downloadAsync(uri, fileUri);
        await MediaLibrary.saveToLibraryAsync(result.uri);
      }

      Alert.alert('Salvo', 'A foto foi salva na galeria.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    } finally {
      setSelectedPhotoForDownload(null);
    }
  }, []);

  useEffect(() => {
    if (selectedPhotoForDownload) {
      handleDownload(selectedPhotoForDownload);
    }
  }, [selectedPhotoForDownload, handleDownload]);

  const handleReportPhoto = useCallback(
    async (
      photoId: string,
      creatorUid: string,
      reason: string,
      justification: string,
    ) => {
      try {
        const db = getFirestore();

        await addDoc(collection(db, 'reports'), {
          reportedBy: currentUid,
          contentType: 'photo',
          contentId: photoId,
          contentCreatorUid: creatorUid,
          reason,
          justification,
          eventId,
          programId,
          activityId,
          timestamp: serverTimestamp(),
          status: 'pending',
        });

        Alert.alert('Denúncia enviada', 'Obrigado por nos auxiliar.');
      } catch (error) {
        console.error('Error reporting photo:', error);
        Alert.alert('Erro', 'Não foi possível enviar a denúncia.');
      }
    },
    [currentUid, eventId, programId, activityId],
  );

  const handleBlockPhoto = useCallback(
    async (photoId: string, creatorUid: string) => {
      try {
        await blockPhoto(photoId, {
          eventId,
          programId,
          activityId,
          photoCreatorUid: creatorUid,
        });

        Alert.alert(
          'Foto ocultada',
          'Esta foto não será mais exibida para você.',
        );
      } catch (error) {
        console.error('Error blocking photo:', error);
        Alert.alert('Erro', 'Não foi possível ocultar a foto.');
      }
    },
    [blockPhoto, eventId, programId, activityId],
  );

  // Show loading while blocked photos are being fetched
  if (loadingBlockedPhotos) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {visiblePhotos.map((photo, index) => {
        const creatorUid = getPhotoCreatorUid(photo);
        const resolvedName = creatorUid === currentUid ? 'Você' : (resolvedNames[creatorUid] ?? 'Carregando...');

        return (
          <React.Fragment key={photo.id}>
            <PhotoItem
              photo={photo}
              index={index}
              colors={colors}
              scheme={scheme}
              eventId={eventId}
              programId={programId}
              activityId={activityId}
              eventCreatorId={eventCreatorId}
              currentUid={currentUid}
              isSuperAdmin={isSuperAdmin}
              currentUserName={currentUserName}
              resolvedCreatorName={resolvedName}
              onDeletePhoto={onDeletePhoto}
              onOpen={() => {
                setCurrentImageIndex(index);
                setIsViewerVisible(true);
              }}
              onReportPhoto={handleReportPhoto}
              onBlockPhoto={handleBlockPhoto}
            />
            {index < visiblePhotos.length - 1 && (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            )}
          </React.Fragment>
        );
      })}

      <ImageView
        images={viewerImages}
        imageIndex={currentImageIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.viewerFooter}>
            <TouchableOpacity
              onPress={() => {
                const photo = visiblePhotos[imageIndex];
                if (photo) {
                  // Reutilizando a lógica de download
                  setSelectedPhotoForDownload(photo);
                }
              }}
              style={styles.viewerActionBtn}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Inter-Medium' }}>
                Salvar Foto
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 14,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoMeta: { fontSize: 13, fontFamily: 'Inter-Regular' },
  deleteBtn: {
    padding: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 13, fontFamily: 'Inter-Medium' },

  photoDescription: {
    fontSize: 14,
    opacity: 0.95,
    fontFamily: 'Inter-Regular',
  },

  viewerFooter: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewerActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  actionBtn: { paddingVertical: 10, paddingHorizontal: 12 },

  commentsContainer: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  commentsDark: {
    backgroundColor: '#2a255048',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commentsLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  sectionTitle: { fontSize: 14, fontFamily: 'Inter-Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter-Regular' },

  commentCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentCardDark: {
    backgroundColor: 'rgba(59, 25, 109, 0.50)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  commentCardLight: {
    backgroundColor: '#f8f8f8',
    borderColor: '#ddd',
  },

  commentAuthor: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  commentText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  commentDeleteBtn: { padding: 6 },
  commentReportBtn: { padding: 6, marginLeft: 4 },

  reportBtn: {
    padding: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  reportBtnText: { fontSize: 12, fontFamily: 'Inter-Regular' },

  addCommentRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    marginTop: 6,
  },
  inputRowDark: {
    backgroundColor: '#322C5E',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  inputRowLight: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  commentInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    padding: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    width: '92%',
    alignSelf: 'center',
    opacity: 0.6,
    marginVertical: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    padding: 10,
    alignItems: 'center',
  },
  reportModal: {
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  reasonButtons: {
    gap: 10,
  },
  reasonBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  reasonBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  justificationInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
