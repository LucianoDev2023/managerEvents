import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { getAuth } from 'firebase/auth';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Trash2, Send, X } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { usePhotoComments } from '@/hooks/usePhotoComments'; // ajuste se necessário
import type { Photo } from '@/types'; // ajuste se necessário

import { useColorScheme } from 'react-native';

type Props = {
  eventId: string;
  programId: string;
  activityId: string;

  photos: Photo[];
  onDeletePhoto: (photoId: string, publicId?: string) => void;

  eventCreatorId: string; // event.userId
  currentUid: string;
  isSuperAdmin: boolean;
};

function formatTimeAgo(createdAt: any) {
  try {
    const date =
      typeof createdAt?.toDate === 'function' ? createdAt.toDate() : null;

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

type PhotoItemProps = {
  photo: Photo;
  index: number;
  colors: any;

  eventId: string;
  programId: string;
  activityId: string;

  eventCreatorId: string;
  currentUid: string;
  isSuperAdmin: boolean;

  onDeletePhoto: (photoId: string, publicId?: string) => void;
  onOpen: () => void;
};

function PhotoItem({
  photo,
  index,
  colors,
  eventId,
  programId,
  activityId,
  eventCreatorId,
  currentUid,
  isSuperAdmin,
  onDeletePhoto,
  onOpen,
}: PhotoItemProps) {
  const auth = getAuth();
  const firebaseUser = auth.currentUser;
  const scheme = useColorScheme() ?? 'dark';

  const currentUserSafe = useMemo(() => {
    const email = firebaseUser?.email?.toLowerCase() ?? '';
    const uid = firebaseUser?.uid ?? currentUid;

    return {
      uid,
      email,
      isSuperAdmin,
      name: firebaseUser?.displayName ?? 'Usuário',
    };
  }, [firebaseUser, currentUid, isSuperAdmin]);

  const canDeleteThisPhoto = useMemo(() => {
    return (
      isSuperAdmin ||
      currentUid === eventCreatorId ||
      currentUid === photo.createdBy
    );
  }, [isSuperAdmin, currentUid, eventCreatorId, photo.createdBy]);

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
    eventCreatorId, // dono do evento
    photoCreatorId: photo.createdBy, // dono da foto
  });

  const handleDeletePhoto = () => {
    if (!canDeleteThisPhoto) {
      Alert.alert(
        'Acesso negado',
        'Você não tem permissão para excluir esta foto.'
      );
      return;
    }

    Alert.alert('Excluir foto', 'Tem certeza que deseja excluir esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => onDeletePhoto(photo.id, photo.publicId),
      },
    ]);
  };

  return (
    <View style={[styles.photoCard, { backgroundColor: colors.backgroundd }]}>
      <Pressable onPress={onOpen}>
        <Image source={{ uri: photo.uri }} style={styles.photo} />
      </Pressable>

      <View style={styles.photoHeader}>
        {/* <Text style={[styles.photoTitle, { color: colors.text }]}>
          Foto {index + 1}
        </Text> */}

        {canDeleteThisPhoto && (
          <TouchableOpacity
            onPress={handleDeletePhoto}
            style={styles.deleteBtn}
          >
            <Trash2 size={18} color={colors.primary2} />
            <Text style={[styles.photoDescription, { color: colors.primary2 }]}>
              Excluir foto
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!photo.description && (
        <Text style={[styles.photoDescription, { color: colors.text }]}>
          {photo.description}
        </Text>
      )}

      {/* Comentários */}
      {/* Comentários */}
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
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Nenhum comentário ainda.
          </Text>
        ) : (
          comments.map((comment) => {
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
                    {comment.name ?? comment.email ?? 'Usuário'}{' '}
                    <Text style={{ color: colors.text }}>
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
              </View>
            );
          })
        )}

        {/* Input */}
        <View
          style={[
            styles.addCommentRow,
            scheme === 'dark' ? styles.inputRowDark : styles.inputRowLight,
          ]}
        >
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Adicionar um comentário…"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[
              styles.commentInput,
              scheme === 'dark'
                ? styles.commentInputDark
                : styles.commentInputLight,
              { color: colors.text2 },
            ]}
          />

          <TouchableOpacity
            onPress={addComment}
            disabled={!newComment.trim() || isAddingComment}
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
}: Props) {
  // ✅ mantenha o seu padrão real de tema aqui.
  // se você usa useColorScheme, troque para:
  // const scheme = useColorScheme() ?? "light";
  // const colors = Colors[scheme];
  const colors = Colors.light;

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const handleDownload = async () => {
    if (!selectedPhoto?.uri) return;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita acesso à galeria para salvar a imagem.'
        );
        return;
      }

      const uri = selectedPhoto.uri;
      const clean = uri.split('?')[0];
      const ext = (
        clean.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] ?? '.jpg'
      ).toLowerCase();

      if (uri.startsWith('file://')) {
        await MediaLibrary.saveToLibraryAsync(uri);
      } else {
        const filename = `photo-${selectedPhoto.id}${ext}`;
        const fileUri = FileSystem.cacheDirectory + filename;
        const result = await FileSystem.downloadAsync(uri, fileUri);
        await MediaLibrary.saveToLibraryAsync(result.uri);
      }

      // ✅ FECHA O MODAL AQUI
      Alert.alert('Salvo', 'A foto foi salva na galeria.', [
        {
          text: 'OK',
          onPress: () => setSelectedPhoto(null),
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    }
  };

  // const handleShare = async () => {
  //   if (!selectedPhoto?.uri) return;

  //   try {
  //     const canShare = await Sharing.isAvailableAsync();
  //     if (!canShare) {
  //       Alert.alert(
  //         'Indisponível',
  //         'Compartilhamento não disponível neste dispositivo.'
  //       );
  //       return;
  //     }

  //     await Sharing.shareAsync(selectedPhoto.uri);
  //   } catch (e) {
  //     console.error(e);
  //     Alert.alert('Erro', 'Não foi possível compartilhar.');
  //   }
  // };

  return (
    <View style={{ gap: 12 }}>
      {photos.map((photo, index) => (
        <PhotoItem
          key={photo.id}
          photo={photo}
          index={index}
          colors={colors}
          eventId={eventId}
          programId={programId}
          activityId={activityId}
          eventCreatorId={eventCreatorId}
          currentUid={currentUid}
          isSuperAdmin={isSuperAdmin}
          onDeletePhoto={onDeletePhoto}
          onOpen={() => setSelectedPhoto(photo)}
        />
      ))}

      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.backgroundC }]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <X size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {selectedPhoto?.uri ? (
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.modalImage}
              />
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleDownload}
                style={styles.actionBtn}
              >
                <Text style={{ color: colors.primary }}>Salvar</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                <Text style={{ color: colors.primary }}>Compartilhar</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </Modal>
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
  },
  photoTitle: { fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    padding: 6,
    flexDirection: 'row',
    gap: 4,
  },

  photoDescription: { fontSize: 14, opacity: 0.9 },

  commentsBox: {
    marginTop: 10,
    gap: 10,
    padding: 10,
    borderRadius: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    padding: 12,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalImage: { width: '100%', height: 380, borderRadius: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14 },
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
    fontWeight: '600',
  },

  commentText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  commentDeleteBtn: {
    padding: 6,
  },

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
  },

  commentInputDark: {
    backgroundColor: 'transparent',
  },

  commentInputLight: {
    backgroundColor: 'transparent',
  },

  sendBtn: {
    padding: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
