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
import { Alert } from 'react-native';
import { db } from '@/config/firebase';

export interface PhotoComment {
  id: string;
  text: string;
  createdAt: any;
  email: string;
  userId: string;
  name?: string;
}

interface UsePhotoCommentsParams {
  eventId: string;
  programId: string;
  activityId: string;
  photoId: string;
  currentUser: {
    uid: string;
    email: string;
    isSuperAdmin: boolean;
    name: string;
  };
  eventCreatorId: string;
}

export function usePhotoComments({
  eventId,
  programId,
  activityId,
  photoId,
  currentUser,
  eventCreatorId,
}: UsePhotoCommentsParams) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingCommentIds, setIsDeletingCommentIds] = useState<string[]>(
    []
  );

  useEffect(() => {
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: PhotoComment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        email: doc.data().email,
        userId: doc.data().userId,
        createdAt: doc.data().createdAt,
        name: doc.data().name,
      }));
      setComments(data);
    });

    return () => unsubscribe();
  }, [eventId, programId, activityId, photoId]);

  const addComment = async () => {
    if (!newComment.trim() || isAddingComment) return;

    setIsAddingComment(true);
    try {
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
        email: currentUser.email,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        name: currentUser.name,
      });

      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const canDeleteComment = (comment: PhotoComment) => {
    return (
      comment.userId === currentUser.uid ||
      currentUser.uid === eventCreatorId ||
      currentUser.isSuperAdmin
    );
  };

  const deleteComment = async (comment: PhotoComment) => {
    if (!canDeleteComment(comment)) {
      console.warn('❌ Você não tem permissão para deletar este comentário.');
      return;
    }

    if (isDeletingCommentIds.includes(comment.id)) return;

    setIsDeletingCommentIds((prev) => [...prev, comment.id]);

    try {
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
        comment.id
      );

      await deleteDoc(ref);
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
    } finally {
      setIsDeletingCommentIds((prev) => prev.filter((id) => id !== comment.id));
    }
  };

  const confirmDeleteComment = (comment: PhotoComment) => {
    if (!canDeleteComment(comment)) {
      Alert.alert(
        'Acesso negado',
        'Você não tem permissão para excluir este comentário.'
      );
      return;
    }

    Alert.alert(
      'Excluir comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: () => deleteComment(comment),
          style: 'destructive',
        },
      ]
    );
  };

  return {
    comments,
    newComment,
    setNewComment,
    addComment,
    deleteComment,
    confirmDeleteComment, // <-- incluído aqui
    canDeleteComment,
    isAddingComment,
    isDeletingCommentIds,
  };
}
