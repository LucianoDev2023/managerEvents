import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
} from 'react-native';
import { Photo } from '@/types';
import { Trash2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface PhotoGalleryProps {
  photos: Photo[];
  editable?: boolean;
  onDeletePhoto?: (photo: { id: string; publicId: string }) => void;
  eventId?: string;
  programId?: string;
  activityId?: string;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;
const ITEM_HEIGHT = ITEM_WIDTH * 0.6;

export default function PhotoGallery({
  photos,
  onDeletePhoto,
  editable = false,
}: PhotoGalleryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (photos.length === 0) {
    return (
      <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No photos added yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {photos.map((photo) => (
        <Animated.View
          key={photo.id}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.photoContainer}
        >
          <Image
            source={{ uri: photo.uri }}
            style={[styles.photo, { width: ITEM_WIDTH, height: ITEM_HEIGHT }]}
            resizeMode="cover"
          />

          {editable && onDeletePhoto && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.error }]}
              onPress={() =>
                onDeletePhoto?.({ id: photo.id, publicId: photo.publicId })
              }
            >
              <Trash2 size={16} color="white" />
            </TouchableOpacity>
          )}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  photoContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    borderRadius: 12,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});
