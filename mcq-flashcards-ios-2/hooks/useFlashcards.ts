
import { useState, useEffect, useCallback } from 'react';
import { FlashcardMCQ } from '../types';

const STORAGE_KEY = 'flashcardMCQs';

export const useFlashcards = (): [
  FlashcardMCQ[],
  (card: FlashcardMCQ) => void,
  (updatedCard: FlashcardMCQ) => void,
  (id: string) => void,
  React.Dispatch<React.SetStateAction<FlashcardMCQ[]>> // setFlashcards
] => {
  const [flashcards, setFlashcards] = useState<FlashcardMCQ[]>(() => {
    try {
      const storedFlashcards = localStorage.getItem(STORAGE_KEY);
      return storedFlashcards ? JSON.parse(storedFlashcards) : [];
    } catch (error) {
      console.error("Error loading flashcards from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flashcards));
    } catch (error) {
      console.error("Error saving flashcards to localStorage:", error);
    }
  }, [flashcards]);

  const addFlashcard = useCallback((card: FlashcardMCQ) => {
    setFlashcards(prev => [...prev, card]);
  }, []);

  const updateFlashcard = useCallback((updatedCard: FlashcardMCQ) => {
    setFlashcards(prev => prev.map(card => card.id === updatedCard.id ? updatedCard : card));
  }, []);

  const deleteFlashcard = useCallback((id: string) => {
    setFlashcards(prev => prev.filter(card => card.id !== id));
  }, []);

  return [flashcards, addFlashcard, updateFlashcard, deleteFlashcard, setFlashcards];
};
