import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  Alert,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Share2, MessageSquare } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ImageViewing from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { getAuth } from 'firebase/auth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Photo } from '@/types';
import { usePhotoComments } from '@/hooks/usePhotoComments';

interface PhotoGalleryProps {
  photos: Photo[];
  editable?: boolean;
  onDeletePhoto?: (photo: { id: string; publicId: string }) => Promise<void>;
  deletingPhotoId?: string | null;
  isCreator: boolean;
  eventId: string;
  programId: string;
  activityId: string;
  refetchEventById: (eventId: string) => Promise<void>;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;
const ITEM_HEIGHT = ITEM_WIDTH * 0.6;

export default function PhotoGallery({
  photos,
  editable = false,
  onDeletePhoto,
  deletingPhotoId,
  isCreator,
  eventId,
  programId,
  activityId,
  refetchEventById,
}: PhotoGalleryProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleShareImage = async (imageUrl: string) => {
    try {
      const downloadPath = FileSystem.documentDirectory + 'shared-image.jpg';
      const { uri } = await FileSystem.downloadAsync(imageUrl, downloadPath);
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Erro ao compartilhar imagem:', error);
    }
  };

  if (photos.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma foto adicionada
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container]}>
        {photos.map((photo, index) => {
          const {
            comments,
            newComment,
            setNewComment,
            addComment,
            deleteComment,
            canDeleteComment,
            isAddingComment,
            isDeletingCommentIds,
          } = usePhotoComments({
            eventId,
            programId,
            activityId,
            photoId: photo.id,
            currentUser: {
              uid: currentUser?.uid ?? '',
              email: currentUser?.email ?? '',
              isSuperAdmin: isCreator,
            },
            eventCreatorId: photo.createdBy ?? '',
          });

          return (
            <View
              key={photo.id}
              style={{
                width: '100%',
                marginBottom: 20,
                padding: 4,
                borderBottomWidth: 1,
                borderBottomColor: '#454545',
              }}
            >
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
                style={styles.photoBlock}
              >
                <TouchableWithoutFeedback
                  onPress={() => {
                    setCurrentIndex(index);
                    setIsViewerVisible(true);
                  }}
                >
                  <View style={styles.photoWrapper}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                    <View style={styles.descriptionContainer}>
                      <MessageSquare
                        size={16}
                        color="#555"
                        style={styles.icon}
                      />
                      <Text style={styles.descriptionText}>
                        {photo.description}
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    onPress={() => handleShareImage(photo.uri)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: '#25D366' },
                    ]}
                  >
                    <Share2 size={14} color="white" />
                  </TouchableOpacity>

                  {editable && onDeletePhoto && isCreator && (
                    <TouchableOpacity
                      disabled={deletingPhotoId === photo.id}
                      onPress={() => {
                        Alert.alert(
                          'Confirmar exclusão',
                          'Deseja excluir esta foto?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await onDeletePhoto({
                                    id: photo.id,
                                    publicId: photo.publicId!,
                                  });
                                  await refetchEventById(eventId);
                                } catch (error) {
                                  Alert.alert(
                                    'Erro',
                                    'Não foi possível excluir a foto.'
                                  );
                                }
                              },
                            },
                          ]
                        );
                      }}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.error,
                          opacity: deletingPhotoId === photo.id ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Trash2 size={14} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              <View style={styles.commentSection}>
                <Text
                  style={[
                    styles.commentHeader,
                    { color: colors.textSecondary },
                  ]}
                >
                  Comentários
                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    editable={!isAddingComment}
                    placeholder="Escreva seu comentário..."
                    placeholderTextColor="#999"
                    maxLength={150}
                    style={[
                      styles.input,
                      { backgroundColor: colors.backgroundComents },
                    ]}
                  />
                  <TouchableOpacity
                    onPress={addComment}
                    disabled={isAddingComment}
                    style={[
                      styles.sendButton,
                      { opacity: isAddingComment ? 0.5 : 1 },
                    ]}
                  >
                    <Text style={styles.sendText}>
                      {isAddingComment ? 'Enviando...' : 'Enviar'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {comments
                  .filter((comment) => comment.createdAt?.toDate) // Só mostra após Firestore salvar
                  .map((comment) => (
                    <View
                      key={comment.id}
                      style={[
                        styles.commentBox,
                        { backgroundColor: colors.backgroundComents },
                      ]}
                    >
                      <Text style={styles.commentAuthor}>
                        {comment.email.split('@')[0]}
                      </Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <View style={styles.commentFooterRow}>
                        <Text style={styles.commentTime}>
                          {formatDistanceToNow(comment.createdAt.toDate(), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Text>
                        {canDeleteComment(comment) && (
                          <TouchableOpacity
                            onPress={() => deleteComment(comment)}
                            disabled={isDeletingCommentIds.includes(comment.id)}
                          >
                            <Text style={styles.commentActionText}>
                              {isDeletingCommentIds.includes(comment.id)
                                ? 'Excluindo...'
                                : 'Excluir'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          );
        })}

        <ImageViewing
          images={photos.map((p) => ({ uri: p.uri }))}
          imageIndex={currentIndex}
          visible={isViewerVisible}
          onRequestClose={() => setIsViewerVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 8,
  },
  photoBlock: {
    alignItems: 'center',
    padding: 0,
    marginTop: 0,
  },
  photo: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginRight: 32,
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  photoWrapper: {
    marginTop: 0,
    padding: 0,
    borderRadius: 10,
  },
  descriptionContainer: {
    width: ITEM_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#666',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
  icon: {
    marginTop: 2,
  },
  commentSection: {
    width: '100%',
    paddingHorizontal: 10,
  },
  commentHeader: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
  sendButton: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3e1d73',
    borderRadius: 6,
  },
  sendText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  commentBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#262c34',
    borderWidth: 1,
    borderColor: '#3333',
  },
  commentAuthor: {
    color: '#8b949e',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
  },
  commentText: {
    color: '#c9d1d9',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 6,
  },
  commentFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentTime: {
    fontSize: 12,
    color: '#7a7a7a',
    fontFamily: 'Inter_300Light',
  },
  commentActionText: {
    fontSize: 13,
    color: '#f87171',
    fontFamily: 'Inter_500Medium',
  },
  emptyContainer: {
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});
