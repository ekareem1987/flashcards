
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FlashcardMCQ, MCQOption, AppView } from '../types';
import { CheckCircleIcon, XCircleIcon } from '../constants';

interface QuizModeProps {
  flashcards: FlashcardMCQ[];
  setView: (view: AppView) => void;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const QuizMode: React.FC<QuizModeProps> = ({ flashcards, setView }) => {
  const [quizCards, setQuizCards] = useState<FlashcardMCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const initializeQuiz = useCallback(() => {
    setQuizCards(shuffleArray(flashcards));
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setScore(0);
    setShowAnswer(false);
    setQuizFinished(false);
  }, [flashcards]);

  useEffect(() => {
    if (flashcards.length > 0) {
      initializeQuiz();
    }
  }, [flashcards, initializeQuiz]); // initializeQuiz added to dependencies

  const currentCard = useMemo(() => quizCards[currentIndex], [quizCards, currentIndex]);

  if (flashcards.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <p className="text-xl text-gray-600 mb-4">No cards available for quiz.</p>
        <button
          onClick={() => setView('create')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          Create a Flashcard
        </button>
      </div>
    );
  }
  
  if (!currentCard && !quizFinished) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <p className="text-xl text-gray-600 mb-4">Loading quiz...</p>
         <button
          onClick={initializeQuiz}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          Restart Quiz
        </button>
      </div>
    );
  }

  const handleOptionSelect = (optionId: string) => {
    if (showAnswer) return; 
    setSelectedOptionId(optionId);
    setShowAnswer(true);
    if (optionId === currentCard.correctOptionId) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < quizCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setShowAnswer(false);
    } else {
      setQuizFinished(true);
    }
  };

  const getOptionClasses = (option: MCQOption): string => {
    let classes = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ease-in-out ";
    if (!showAnswer) {
      classes += "bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-400 cursor-pointer";
      if (selectedOptionId === option.id) classes += " ring-2 ring-blue-500 border-blue-500";
    } else {
      if (option.id === currentCard.correctOptionId) {
        classes += "bg-green-100 border-green-500 text-green-700 font-semibold ";
        classes += (selectedOptionId === option.id ? "ring-2 ring-green-600 " : "");
      } else if (option.id === selectedOptionId) {
        classes += "bg-red-100 border-red-500 text-red-700 font-semibold ring-2 ring-red-600 ";
      } else {
        classes += "bg-gray-100 border-gray-300 text-gray-600 ";
      }
      classes += "cursor-not-allowed";
    }
    return classes;
  };

  if (quizFinished) {
    const percentage = quizCards.length > 0 ? Math.round((score / quizCards.length) * 100) : 0;
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-6 text-center bg-gray-50">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Quiz Complete!</h2>
        <p className="text-xl text-gray-600 mb-2">
          Your score: {score} out of {quizCards.length}
        </p>
        <p className="text-2xl font-semibold mb-6">
          {percentage >= 80 && <span className="text-green-500">{percentage}% Awesome!</span>}
          {percentage < 80 && percentage >= 50 && <span className="text-yellow-500">{percentage}% Good Job!</span>}
          {percentage < 50 && <span className="text-red-500">{percentage}% Keep Practicing!</span>}
        </p>
        <div className="flex space-x-4">
          <button
            onClick={initializeQuiz}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Restart Quiz
          </button>
          <button
            onClick={() => setView('home')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  if (!currentCard) { 
    return <div className="flex-grow flex items-center justify-center"><p>Error: No current card available.</p></div>;
  }

  return (
    <div className="flex-grow flex flex-col p-4 md:p-6 bg-gray-50 items-center">
      <div className="w-full max-w-xl">
        <p className="text-sm text-gray-500 mb-2 text-center">
          Question {currentIndex + 1} of {quizCards.length}
          {currentCard.topic && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{currentCard.topic}</span>}
        </p>
        
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6" id={`question-${currentCard.id}`}>{currentCard.question}</h2>
          <div role="radiogroup" aria-labelledby={`question-${currentCard.id}`} className="space-y-3">
            {currentCard.options.map(option => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                disabled={showAnswer}
                className={getOptionClasses(option)}
                role="radio"
                aria-checked={selectedOptionId === option.id}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>

        {showAnswer && (
          <div className="mb-6 p-4 rounded-lg bg-white shadow-md">
            {selectedOptionId === currentCard.correctOptionId ? (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="w-6 h-6 mr-2" />
                <p className="font-semibold">Correct!</p>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircleIcon className="w-6 h-6 mr-2" />
                <p className="font-semibold">Incorrect.</p>
              </div>
            )}
            {selectedOptionId !== currentCard.correctOptionId && (
                 <p className="mt-2 text-sm text-gray-700">
                    The correct answer was: {currentCard.options.find(o => o.id === currentCard.correctOptionId)?.text}
                 </p>
            )}
            {currentCard.explanation && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Explanation:</h4>
                <p className="text-sm text-gray-700 prose prose-sm max-w-none">{currentCard.explanation}</p>
              </div>
            )}
          </div>
        )}

        {showAnswer && (
          <button
            onClick={handleNextQuestion}
            className="w-full px-6 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition text-lg font-semibold"
          >
            {currentIndex < quizCards.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizMode;