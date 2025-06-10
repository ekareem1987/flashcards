import React, { useState, useEffect, useMemo } from 'react';
import { FlashcardMCQ, AppView } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, TrashIcon } from '../constants';

interface DeckViewProps {
  flashcards: FlashcardMCQ[];
  setView: (view: AppView) => void;
  deleteFlashcard: (id: string) => void;
  setCardToEdit: (card: FlashcardMCQ) => void;
  uniquePdfSources: string[]; // Pass unique PDF sources for tabbing
}

const DeckView: React.FC<DeckViewProps> = ({ flashcards, setView, deleteFlashcard, setCardToEdit, uniquePdfSources }) => {
  const [activePdfSource, setActivePdfSource] = useState<string | null>(null); // null for "All Cards"
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const displayedCards = useMemo(() => {
    if (activePdfSource === null) {
      return flashcards;
    }
    return flashcards.filter(card => card.sourcePdfName === activePdfSource);
  }, [flashcards, activePdfSource]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [activePdfSource]);
  
  useEffect(() => {
    // Reset flip state when card or source changes
    setIsFlipped(false);
  }, [currentIndex, activePdfSource]);

  useEffect(() => {
    if (displayedCards.length === 0 && currentIndex > 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= displayedCards.length && displayedCards.length > 0) {
      setCurrentIndex(displayedCards.length - 1);
    } else if (displayedCards.length === 0 && flashcards.length > 0 && activePdfSource !== null) {
      // If current PDF source has no cards but others exist, switch to "All Cards"
      setActivePdfSource(null);
    }
  }, [displayedCards, currentIndex, flashcards, activePdfSource]);


  if (flashcards.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 text-center bg-gray-50">
        <p className="text-xl text-gray-600 mb-4">Your deck is empty.</p>
        <button
          onClick={() => setView('create')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          Create a Flashcard
        </button>
      </div>
    );
  }
  
  const currentCard = displayedCards[currentIndex];

  const handleNext = () => {
    if (currentIndex < displayedCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleEdit = () => {
    if (!currentCard) return;
    setCardToEdit(currentCard);
    setView('edit');
  };

  const handleDelete = () => {
    if (!currentCard) return;
    if (window.confirm(`Are you sure you want to delete the card: "${currentCard.question.substring(0,30)}..."?`)) {
      deleteFlashcard(currentCard.id);
      // currentIndex adjustment is handled by useEffect on displayedCards
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getCardCountForSource = (sourceName: string | null) => {
    if (sourceName === null) return flashcards.length;
    return flashcards.filter(card => card.sourcePdfName === sourceName).length;
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-50">
      {uniquePdfSources.length > 0 && (
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <nav className="-mb-px flex space-x-4 overflow-x-auto px-4" aria-label="PDF Source Tabs">
            <button
              onClick={() => setActivePdfSource(null)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none
                ${activePdfSource === null
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              aria-current={activePdfSource === null ? 'page' : undefined}
            >
              All Cards ({getCardCountForSource(null)})
            </button>
            {uniquePdfSources.map(sourceName => (
              <button
                key={sourceName}
                onClick={() => setActivePdfSource(sourceName)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none
                  ${activePdfSource === sourceName
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                aria-current={activePdfSource === sourceName ? 'page' : undefined}
              >
                {sourceName.length > 20 ? sourceName.substring(0,18) + '...' : sourceName} ({getCardCountForSource(sourceName)})
              </button>
            ))}
          </nav>
        </div>
      )}

      {currentCard ? (
        <div className="flex-grow flex flex-col p-4 md:p-6 items-center">
          <div className="w-full max-w-xl">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Card {currentIndex + 1} of {displayedCards.length}
                {currentCard.topic && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{currentCard.topic}</span>}
                {activePdfSource === null && currentCard.sourcePdfName && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full" title={`Source: ${currentCard.sourcePdfName}`}>
                        {currentCard.sourcePdfName.length > 15 ? currentCard.sourcePdfName.substring(0,12) + '...' : currentCard.sourcePdfName}
                    </span>
                )}
              </p>
              <div className="flex space-x-2">
                <button onClick={handleEdit} className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-100 transition" title="Edit Card" aria-label="Edit card">
                  <EditIcon className="w-5 h-5" />
                </button>
                <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition" title="Delete Card" aria-label="Delete card">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div 
              className="bg-white rounded-xl shadow-xl min-h-[300px] md:min-h-[350px] flex flex-col cursor-pointer transition-transform duration-500 relative"
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              onClick={handleFlip}
              role="button"
              tabIndex={0}
              aria-pressed={isFlipped}
              aria-label={isFlipped ? `Showing back of card: ${currentCard.question}` : `Showing front of card: ${currentCard.question}. Tap to flip.`}
            >
              {/* Front of Card */}
              <div className="absolute w-full h-full p-6 md:p-8 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">{currentCard.question}</h2>
                {!isFlipped && <p className="text-center text-sm text-gray-400 mt-auto pt-4">Tap to flip</p>}
              </div>

              {/* Back of Card */}
              <div 
                className="absolute top-0 left-0 w-full h-full p-6 md:p-8 flex flex-col backface-hidden"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                onClick={(e) => e.stopPropagation()} 
              >
                <div className="overflow-y-auto flex-grow space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Answer:</h3>
                    <ul className="space-y-2">
                      {currentCard.options.map(option => (
                        <li
                          key={option.id}
                          className={`p-3 rounded-md text-sm md:text-base
                            ${option.id === currentCard.correctOptionId 
                              ? 'bg-green-100 border-green-500 border text-green-700 font-semibold' 
                              : 'bg-gray-100 border-gray-300 border text-gray-700'}`}
                        >
                          {option.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {currentCard.explanation && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Explanation:</h3>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p>{currentCard.explanation}</p>
                      </div>
                    </div>
                  )}
                  {!currentCard.explanation && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Explanation:</h3>
                        <p className="text-gray-500 text-sm italic">No explanation available for this card.</p>
                    </div>
                  )}
                </div>
                {isFlipped && <p className="text-center text-sm text-gray-400 mt-auto pt-4" onClick={handleFlip} role="button">Tap to flip back</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                aria-label="Previous card"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-1" /> Previous
              </button>
              <button
                onClick={handleFlip}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition"
                aria-label={isFlipped ? "Show question" : "Show answer/explanation"}
              >
                {isFlipped ? 'Show Question' : 'Show Answer'}
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === displayedCards.length - 1}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                aria-label="Next card"
              >
                Next <ChevronRightIcon className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      ) : (
         <div className="flex-grow flex flex-col items-center justify-center p-4 text-center text-gray-500">
            <p className="text-lg">No cards available for the selected PDF source.</p>
            {activePdfSource && <p className="text-sm">Source: {activePdfSource}</p>}
         </div>
      )}
    </div>
  );
};

export default DeckView;