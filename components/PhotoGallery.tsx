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
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Trash2, Send, X } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';
import { usePhotoComments } from '@/hooks/usePhotoComments';
import { getOptimizedUrl } from '@/lib/cloudinary';
import type { Photo } from '@/types';

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

  onDeletePhoto: (photoId: string, publicId?: string) => void;
  onOpen: () => void;
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
  onDeletePhoto,
  onOpen,
}: PhotoItemProps) {
  const photoCreatorUid = useMemo(() => getPhotoCreatorUid(photo), [photo]);

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

  return (
    <View style={[styles.photoCard, { backgroundColor: colors.background }]}>
      <Pressable onPress={onOpen}>
        <Image 
          source={{ uri: getOptimizedUrl(photo.uri, { width: 800 }) }} 
          style={styles.photo} 
        />
      </Pressable>

      <View style={styles.photoHeader}>
        <Text style={[styles.photoMeta, { color: colors.textSecondary }]}>
          Foto {index + 1} · {formatTimeAgo(getPhotoTimestamp(photo))}
        </Text>

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
                    {comment.uid === currentUid ? 'Você' : (comment.name ?? 'Usuário')}{' '}
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
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Adicionar um comentário…"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.commentInput, { color: colors.text }]}
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
  currentUserName,
}: Props) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[scheme];

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {}, [photos]);

  const handleDownload = useCallback(async () => {
    if (!selectedPhoto?.uri) return;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita acesso à galeria para salvar a imagem.',
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
        const fileUri = (FileSystem.cacheDirectory ?? '') + filename;
        const result = await FileSystem.downloadAsync(uri, fileUri);
        await MediaLibrary.saveToLibraryAsync(result.uri);
      }

      Alert.alert('Salvo', 'A foto foi salva na galeria.', [
        { text: 'OK', onPress: () => setSelectedPhoto(null) },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar a foto.');
    }
  }, [selectedPhoto]);

  return (
    <View style={{ gap: 12 }}>
      {photos.map((photo, index) => (
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
            onDeletePhoto={onDeletePhoto}
            onOpen={() => setSelectedPhoto(photo)}
          />
          {index < photos.length - 1 && (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
        </React.Fragment>
      ))}

      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <X size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {!!selectedPhoto?.uri && (
              <Image
                source={{ uri: getOptimizedUrl(selectedPhoto.uri, { width: 1200 }) }}
                style={styles.modalImage}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleDownload}
                style={styles.actionBtn}
              >
                <Text
                  style={{ color: colors.primary, fontFamily: 'Inter-Medium' }}
                >
                  Salvar
                </Text>
              </TouchableOpacity>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
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
});
