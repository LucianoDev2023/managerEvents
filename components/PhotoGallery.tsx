import React, { useState, useEffect } from 'react';
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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Photo } from '@/types';

interface Comment {
  id: string;
  text: string;
  createdAt: any;
  email: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  editable?: boolean;
  onDeletePhoto?: (photo: { id: string; publicId: string }) => void;
  eventId?: string;
  programId?: string;
  activityId?: string;
  deletingPhotoId?: string | null;
  isCreator: boolean;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;
const ITEM_HEIGHT = ITEM_WIDTH * 0.6;

export default function PhotoGallery({
  photos,
  editable = false,
  onDeletePhoto,
  eventId,
  programId,
  activityId,
  deletingPhotoId,
  isCreator,
}: PhotoGalleryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const auth = getAuth();
  const userEmail = auth.currentUser?.email ?? '';

  const [isViewerVisible, setIsViewerVisible] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [newComment, setNewComment] = useState<string>('');
  const [photoComments, setPhotoComments] = useState<Record<string, Comment[]>>(
    {}
  );

  const handleShareImage = async (imageUrl: string) => {
    try {
      const downloadPath = FileSystem.documentDirectory + 'shared-image.jpg';
      const { uri } = await FileSystem.downloadAsync(imageUrl, downloadPath);
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Erro ao compartilhar imagem:', error);
    }
  };

  const handleAddComment = async (photoId: string) => {
    console.log('Salvando comentário e1:', {
      eventId,
      programId,
      activityId,
      photoId: photos[currentIndex].id,
    });

    if (!newComment.trim()) return;

    const commentRef = collection(
      db,
      'events',
      eventId!,
      'programs',
      programId!,
      'activities',
      activityId!,
      'photos',
      photoId,
      'comments'
    );
    console.log('Salvando comentário 2:', {
      eventId,
      programId,
      activityId,
      photoId,
      text: newComment.trim(),
      email: userEmail.toLowerCase(),
    });

    const docRef = await addDoc(commentRef, {
      text: newComment.trim(),
      createdAt: serverTimestamp(),
      email: userEmail.toLowerCase(),
    });
    console.log('Comentário salvo em3:', docRef.path);

    setNewComment('');
  };

  const handleDeleteComment = async (photoId: string, commentId: string) => {
    const ref = doc(
      db,
      'events',
      eventId!,
      'programs',
      programId!,
      'activities',
      activityId!,
      'photos',
      photoId,
      'comments',
      commentId
    );
    await deleteDoc(ref);
  };

  useEffect(() => {
    if (!eventId || !programId || !activityId) return;

    const unsubscribes = photos.map((photo) => {
      const commentsRef = collection(
        db,
        'events',
        eventId,
        'programs',
        programId,
        'activities',
        activityId,
        'photos',
        photo.id,
        'comments'
      );

      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            text: d.text,
            email: d.email,
            createdAt: d.createdAt,
          } satisfies Comment;
        });

        setPhotoComments((prev) => ({ ...prev, [photo.id]: data }));
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [photos, eventId, programId, activityId]);

  if (photos.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma foto adicionada
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {photos.map((photo, index) => (
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
                    <MessageSquare size={16} color="#555" style={styles.icon} />
                    <Text style={styles.descriptionText}>
                      {photo.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={() => handleShareImage(photo.uri)}
                  style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                >
                  <Share2 size={14} color="white" />
                  <Text style={styles.actionText}>Compartilhar</Text>
                </TouchableOpacity>

                {editable &&
                  onDeletePhoto &&
                  typeof photo.publicId === 'string' &&
                  isCreator && (
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

            {/* Comentários */}
            <View style={styles.commentSection}>
              <Text
                style={[styles.commentHeader, { color: colors.textSecondary }]}
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
                  onPress={() => handleAddComment(photo.id)}
                  style={styles.sendButton}
                >
                  <Text style={styles.sendText}>Enviar</Text>
                </TouchableOpacity>
              </View>

              {(photoComments[photo.id] || []).map((comment) => (
                <View key={comment.id} style={styles.commentBox}>
                  <View style={styles.commentHeaderRow}>
                    <Text style={styles.commentText}>{comment.text}</Text>
                    {comment.email === userEmail.toLowerCase() && (
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteComment(photo.id, comment.id)
                        }
                      >
                        <Text style={styles.deleteText}>Excluir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentTime}>
                    {comment.createdAt?.toDate
                      ? formatDistanceToNow(comment.createdAt.toDate(), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : 'Enviando...'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

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
    alignItems: 'center',
    padding: 4,
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
    backgroundColor: '#f8f8f8',
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
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  deleteText: {
    color: 'red',
    fontSize: 12,
    marginLeft: 10,
  },
  commentTime: {
    fontSize: 11,
    color: '#555',
    fontFamily: 'Inter_300Light',
    marginTop: 4,
  },
});
