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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Photo } from '@/types';
import { Trash2, Share2, MessageSquare } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ImageViewing from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
const ITEM_WIDTH = width * 0.8;
const ITEM_HEIGHT = ITEM_WIDTH * 0.6;

export default function PhotoGallery({
  photos,
  onDeletePhoto,
  editable = false,
  deletingPhotoId,
  isCreator,
}: PhotoGalleryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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

  const openImage = (index: number) => {
    setCurrentIndex(index);
    setIsViewerVisible(true);
  };

  if (photos.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No photos added yet
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
              <TouchableOpacity onPress={() => openImage(index)}>
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[
                      styles.photo,
                      { width: ITEM_WIDTH, height: ITEM_HEIGHT },
                    ]}
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
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Trash2 size={14} color="white" />
                        <Text style={styles.actionText}>Excluir</Text>
                      </View>
                    </TouchableOpacity>
                  )}
              </View>
            </Animated.View>

            {index < photos.length - 1 && <View style={styles.divider} />}
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
    padding: 10,
    paddingBottom: 40,
  },
  photoBlock: {
    marginBottom: 20,
    alignItems: 'center',
  },
  photo: {
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
    alignItems: 'center',
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
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 16,
    width: '100%',
    alignSelf: 'center',
    opacity: 0.5,
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
});
