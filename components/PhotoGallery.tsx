// Refatorado para tema escuro e layout moderno dos comentários
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
  onDeletePhoto?: (photo: { id: string; publicId: string }) => void;
  deletingPhotoId?: string | null;
  isCreator: boolean;
  eventId: string;
  programId: string;
  activityId: string;
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
}: PhotoGalleryProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const auth = getAuth();
  const userEmail = auth.currentUser?.email ?? '';

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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
        <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma foto adicionada
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: '#0f0f0f' },
        ]}
      >
        {photos.map((photo, index) => {
          const {
            comments,
            newComment,
            setNewComment,
            addComment,
            deleteComment,
          } = usePhotoComments(
            eventId,
            programId,
            activityId,
            photo.id,
            userEmail
          );

          return (
            <View key={photo.id} style={{ width: '100%' }}>
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
                style={styles.photoBlock}
              >
                <TouchableOpacity
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
                </TouchableOpacity>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    onPress={() => handleShareImage(photo.uri)}
                    style={[
                      styles.actionButton,
                      { backgroundColor: '#25D366' },
                    ]}
                  >
                    <Share2 size={14} color="white" />
                    <Text style={styles.actionText}>Compartilhar</Text>
                  </TouchableOpacity>

                  {editable && onDeletePhoto && isCreator && (
                    <TouchableOpacity
                      disabled={deletingPhotoId === photo.id}
                      onPress={() => {
                        Alert.alert(
                          'Confirmar exclusão',
                          'Deseja realmente excluir esta foto?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: () =>
                                onDeletePhoto({
                                  id: photo.id,
                                  publicId: photo.publicId!,
                                }),
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
                      <Text style={styles.actionText}>Excluir</Text>
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
                    placeholder="Escreva seu comentário..."
                    placeholderTextColor="#999"
                    maxLength={150}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={addComment}
                    style={styles.sendButton}
                  >
                    <Text style={styles.sendText}>Enviar</Text>
                  </TouchableOpacity>
                </View>

                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentBox}>
                    <Text style={styles.commentAuthor}>
                      {comment.email.split('@')[0]}
                    </Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    <View style={styles.commentFooterRow}>
                      <Text style={styles.commentTime}>
                        {comment.createdAt?.toDate
                          ? formatDistanceToNow(comment.createdAt.toDate(), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : 'Enviando...'}
                      </Text>
                      {comment.email === userEmail.toLowerCase() && (
                        <TouchableOpacity
                          onPress={() => deleteComment(comment.id)}
                        >
                          <Text style={styles.commentActionText}>Excluir</Text>
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
    padding: 12,
    paddingBottom: 40,
  },
  photoBlock: {
    marginBottom: 20,
    alignItems: 'center',
  },
  photo: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    textAlign: 'left',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  actionText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    marginLeft: 6,
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
  photoWrapper: {
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 10,
    padding: 5,
    backgroundColor: 'transparent',
  },
  descriptionContainer: {
    width: ITEM_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
    lineHeight: 20,
    flex: 1,
    textAlign: 'left',
  },
  icon: {
    marginTop: 2,
  },
  commentSection: {
    width: '100%',
    marginTop: 10,
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
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#1c1c1e',
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
    backgroundColor: '#161b22',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#262c34',
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
});
