import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';

export interface PhotoComment {
  id: string;
  text: string;
  createdAt: any;
  email: string;
}

export function usePhotoComments(
  eventId: string,
  programId: string,
  activityId: string,
  photoId: string,
  userEmail: string
) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const fetchComments = () => {
    const commentsRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
      photoId,
      'comments'
    );

    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const data: PhotoComment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        email: doc.data().email,
        createdAt: doc.data().createdAt,
      }));
      setComments(data);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchComments();
    return () => unsubscribe();
  }, [photoId]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    console.log('📨 Enviando comentário:', {
      text: newComment.trim(),
      email: userEmail,
      eventId,
      programId,
      activityId,
      photoId,
    });

    const commentRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
      photoId,
      'comments'
    );

    await addDoc(commentRef, {
      text: newComment.trim(),
      email: userEmail.toLowerCase(),
      createdAt: serverTimestamp(),
    });

    setNewComment('');
  };

  const deleteComment = async (commentId: string) => {
    const ref = doc(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
      photoId,
      'comments',
      commentId
    );
    await deleteDoc(ref);
  };

  return {
    comments,
    newComment,
    setNewComment,
    addComment,
    deleteComment,
  };
}
