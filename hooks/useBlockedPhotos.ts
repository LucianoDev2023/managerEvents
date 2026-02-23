import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export function useBlockedPhotos(currentUid: string) {
  const [blockedPhotoIds, setBlockedPhotoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users', currentUid, 'blockedPhotos'),
      (snapshot) => {
        const blocked = new Set<string>();
        snapshot.forEach((doc) => {
          blocked.add(doc.id);
        });
        setBlockedPhotoIds(blocked);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching blocked photos:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  const blockPhoto = async (photoId: string, metadata?: {
    eventId: string;
    programId: string;
    activityId: string;
    photoCreatorUid?: string;
  }) => {
    if (!currentUid || !photoId) return;

    await setDoc(doc(db, 'users', currentUid, 'blockedPhotos', photoId), {
      blockedAt: serverTimestamp(),
      ...metadata,
    });
  };

  return { blockedPhotoIds, blockPhoto, loading };
}
