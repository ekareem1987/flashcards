
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FlashcardMCQ, AppView, MCQOption } from '../types';
import { EditIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '../constants';

interface LibraryViewProps {
  flashcards: FlashcardMCQ[];
  setView: (view: AppView) => void;
  deleteFlashcard: (id: string) => void;
  setCardToEdit: (card: FlashcardMCQ) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ flashcards, setView, deleteFlashcard, setCardToEdit }) => {
  const pdfSources = useMemo(() => {
    const sources = new Set<string>();
    flashcards.forEach(card => {
      if (card.sourcePdfName) {
        sources.add(card.sourcePdfName);
      }
    });
    return Array.from(sources).sort((a, b) => a.localeCompare(b));
  }, [flashcards]);

  const [activePdf, setActivePdf] = useState<string | null>(pdfSources.length > 0 ? pdfSources[0] : null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const cardsForActivePdf = useMemo(() => {
    if (!activePdf) return [];
    return flashcards.filter(card => card.sourcePdfName === activePdf);
  }, [flashcards, activePdf]);

  useEffect(() => {
    // If active PDF is no longer valid (e.g., all its cards deleted), reset or pick first available
    if (activePdf && !pdfSources.includes(activePdf)) {
      setActivePdf(pdfSources.length > 0 ? pdfSources[0] : null);
    } else if (!activePdf && pdfSources.length > 0) {
      setActivePdf(pdfSources[0]);
    }
     setExpandedCardId(null); // Collapse cards when changing tabs
  }, [activePdf, pdfSources]);


  const handleEdit = useCallback((card: FlashcardMCQ) => {
    setCardToEdit(card);
    setView('edit');
  }, [setCardToEdit, setView]);

  const handleDelete = useCallback((cardId: string, cardQuestion: string) => {
    if (window.confirm(`Are you sure you want to delete the card: "${cardQuestion.substring(0,30)}..."?`)) {
      deleteFlashcard(cardId);
      setExpandedCardId(null); // Collapse if it was expanded
    }
  }, [deleteFlashcard]);

  const toggleExpandCard = (cardId: string) => {
    setExpandedCardId(prevId => (prevId === cardId ? null : cardId));
  };


  if (pdfSources.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <p className="text-xl text-gray-600 mb-2">No PDF-imported flashcards found.</p>
        <p className="text-sm text-gray-500">
          Import MCQs from a PDF on the Home screen to see them in the Library.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="-mb-px flex space-x-4 overflow-x-auto px-4" aria-label="Tabs">
          {pdfSources.map(sourceName => (
            <button
              key={sourceName}
              onClick={() => { setActivePdf(sourceName); setExpandedCardId(null); }}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none
                ${activePdf === sourceName
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              aria-current={activePdf === sourceName ? 'page' : undefined}
            >
              {sourceName}
            </button>
          ))}
        </nav>
      </div>

      {activePdf && cardsForActivePdf.length > 0 && (
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-3">Showing {cardsForActivePdf.length} card(s) from <span className="font-semibold">{activePdf}</span>.</p>
          {cardsForActivePdf.map(card => (
            <div key={card.id} className="bg-white rounded-lg shadow">
              <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpandCard(card.id)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCardId === card.id}
                aria-controls={`card-details-${card.id}`}
              >
                <h3 className="text-md font-medium text-gray-800 flex-1 pr-2">{card.question}</h3>
                {expandedCardId === card.id ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
              </div>
              {expandedCardId === card.id && (
                <div id={`card-details-${card.id}`} className="border-t border-gray-200 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Options:</h4>
                    <ul className="space-y-1.5">
                      {card.options.map(option => (
                        <li
                          key={option.id}
                          className={`p-2 rounded-md text-sm
                            ${option.id === card.correctOptionId
                              ? 'bg-green-100 border-green-400 border text-green-700 font-medium'
                              : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {option.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {card.explanation && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Explanation:</h4>
                      <p className="text-sm text-gray-700 prose prose-sm max-w-none">{card.explanation}</p>
                    </div>
                  )}
                  {!card.explanation && (
                     <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Explanation:</h4>
                      <p className="text-sm text-gray-500 italic">No explanation provided.</p>
                    </div>
                  )}
                  {card.topic && (
                     <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">Topic:</h4>
                      <p className="text-sm text-gray-700">{card.topic}</p>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => handleEdit(card)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 transition"
                      title="Edit Card"
                      aria-label="Edit card"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id, card.question)}
                      className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 transition"
                      title="Delete Card"
                      aria-label="Delete card"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {activePdf && cardsForActivePdf.length === 0 && (
         <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <p className="text-lg text-gray-500">No cards found for {activePdf}.</p>
            <p className="text-sm text-gray-400">This might happen if all cards from this PDF were deleted.</p>
         </div>
      )}
    </div>
  );
};

export default LibraryView;