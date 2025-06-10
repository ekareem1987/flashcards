import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppView, FlashcardMCQ } from './types';
import { useFlashcards } from './hooks/useFlashcards';
import { APP_TITLE } from './constants';
import { extractMCQsFromPDF } from './services/geminiService';
import Header from './components/Header';
import HomeView from './components/HomeView';
import FlashcardForm from './components/FlashcardForm';
import DeckView from './components/DeckView';
import QuizMode from './components/QuizMode';
import LibraryView from './components/LibraryView'; 
import LoadingSpinner from './components/LoadingSpinner';

interface ProcessingMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [flashcards, addFlashcard, updateFlashcard, deleteFlashcardInternal, setFlashcards] = useFlashcards();
  const [cardToEdit, setCardToEdit] = useState<FlashcardMCQ | null>(null);

  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [pdfImportProgress, setPdfImportProgress] = useState(0); // For potential future determinate progress
  const [processingMessage, setProcessingMessage] = useState<ProcessingMessage | null>(null);
  const pdfImportAbortControllerRef = useRef<AbortController | null>(null);
  
  const apiKeyAvailable = !!process.env.API_KEY;

  const uniquePdfSources = useMemo(() => {
    const sources = new Set<string>();
    flashcards.forEach(card => {
      if (card.sourcePdfName) {
        sources.add(card.sourcePdfName);
      }
    });
    return Array.from(sources).sort();
  }, [flashcards]);

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    if (view !== 'edit') {
        setCardToEdit(null); 
    }
    setProcessingMessage(null); 
  };
  
  const handleSetCardToEdit = useCallback((card: FlashcardMCQ) => {
    setCardToEdit(card);
    setCurrentView('edit');
    setProcessingMessage(null);
  }, []);

  const handleSaveFlashcard = (card: FlashcardMCQ) => {
    if (currentView === 'edit' && cardToEdit) {
      updateFlashcard(card);
    } else {
      addFlashcard(card);
    }
    navigateTo('home');
  };

  const deleteFlashcard = (id: string) => {
    deleteFlashcardInternal(id);
    if (flashcards.length === 1 && (currentView === 'deck' || currentView === 'quiz' || currentView === 'library')) {
      navigateTo('home');
    }
  };
  
  useEffect(() => {
    if (flashcards.length === 0 && (currentView === 'deck' || currentView === 'quiz')) {
      navigateTo('home');
    }
  }, [flashcards, currentView]);

  const handleCancelPdfImport = () => {
    if (pdfImportAbortControllerRef.current) {
      pdfImportAbortControllerRef.current.abort();
      setProcessingMessage({ text: "PDF import cancellation requested...", type: 'warning' });
    }
  };

  const handlePdfFileSelected = async (file: File) => {
    if (!apiKeyAvailable) {
      setProcessingMessage({ text: "PDF import requires an API key, which is not configured.", type: 'error' });
      return;
    }

    // Cancel previous import if any
    if (pdfImportAbortControllerRef.current) {
        pdfImportAbortControllerRef.current.abort();
    }
    pdfImportAbortControllerRef.current = new AbortController();
    const signal = pdfImportAbortControllerRef.current.signal;

    setIsImportingPdf(true);
    setPdfImportProgress(0); // Reset progress
    setProcessingMessage({ text: `Processing ${file.name}... This may take a moment.`, type: 'info' });
    
    try {
      const extractedCards = await extractMCQsFromPDF(file, signal);
      
      if (signal.aborted) {
        // This check might be redundant if extractMCQsFromPDF throws on abort, but good for safety.
        setProcessingMessage({ text: `PDF import for ${file.name} was cancelled.`, type: 'warning' });
        return;
      }

      if (extractedCards.length > 0) {
        const newFlashcardsWithSource = extractedCards.map(card => ({
          ...card,
          sourcePdfName: file.name, 
        }));
        setFlashcards(prev => [...prev, ...newFlashcardsWithSource]);
        setProcessingMessage({ text: `Successfully imported ${newFlashcardsWithSource.length} flashcard(s) from ${file.name}.`, type: 'success' });
      } else {
        setProcessingMessage({ text: `No MCQs found in ${file.name}.`, type: 'info' });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setProcessingMessage({ text: `PDF import for ${file.name} was cancelled by user.`, type: 'warning' });
      } else {
        console.error("PDF Import Error:", error);
        setProcessingMessage({ text: error instanceof Error ? error.message : "An unknown error occurred during PDF import.", type: 'error' });
      }
    } finally {
      setIsImportingPdf(false);
      pdfImportAbortControllerRef.current = null; // Clear the controller
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView 
                  setView={navigateTo} 
                  deckSize={flashcards.length} 
                  onPdfFileSelected={handlePdfFileSelected}
                  isImportingPdf={isImportingPdf}
                  apiKeyAvailable={apiKeyAvailable}
                  uniquePdfSources={uniquePdfSources}
                />;
      case 'create':
        return <FlashcardForm onSave={handleSaveFlashcard} setView={navigateTo} initialCard={null} />;
      case 'edit':
        return <FlashcardForm onSave={handleSaveFlashcard} setView={navigateTo} initialCard={cardToEdit} />;
      case 'deck':
        return <DeckView flashcards={flashcards} setView={navigateTo} deleteFlashcard={deleteFlashcard} setCardToEdit={handleSetCardToEdit} uniquePdfSources={uniquePdfSources} />;
      case 'quiz':
        return <QuizMode flashcards={flashcards} setView={navigateTo} />;
      case 'library':
        return <LibraryView 
                  flashcards={flashcards} 
                  setView={navigateTo} 
                  deleteFlashcard={deleteFlashcard} 
                  setCardToEdit={handleSetCardToEdit} 
                />;
      default:
        return <HomeView 
                  setView={navigateTo} 
                  deckSize={flashcards.length} 
                  onPdfFileSelected={handlePdfFileSelected}
                  isImportingPdf={isImportingPdf}
                  apiKeyAvailable={apiKeyAvailable}
                  uniquePdfSources={uniquePdfSources}
                />;
    }
  };
  
  let headerTitle = APP_TITLE;
  if (currentView === 'create') headerTitle = 'Create Card';
  else if (currentView === 'edit') headerTitle = 'Edit Card';
  else if (currentView === 'library') headerTitle = 'PDF Library';
  else if (currentView === 'deck') headerTitle = 'View Deck';
  else if (currentView === 'quiz') headerTitle = 'Quiz Mode';


  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header 
        title={headerTitle} 
        currentView={currentView}
        onBack={currentView !== 'home' ? () => navigateTo('home') : undefined}
      />
      {processingMessage && !isImportingPdf && ( // Only show this banner if not actively importing
        <div 
          className={`p-3 text-sm text-center shadow-md ${
            processingMessage.type === 'error' ? 'bg-red-100 text-red-700' : 
            processingMessage.type === 'success' ? 'bg-green-100 text-green-700' :
            processingMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-blue-100 text-blue-700'
          }`}
          role="alert"
        >
          {processingMessage.text}
          <button 
            onClick={() => setProcessingMessage(null)} 
            className="ml-3 font-bold text-sm py-1 px-2 hover:bg-black hover:bg-opacity-10 rounded-full"
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}
      <main className="flex-grow overflow-y-auto ios-safe-area-bottom">
        {renderView()}
      </main>
      {isImportingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]" aria-live="assertive" role="dialog" aria-modal="true" aria-labelledby="pdf-import-status">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4 text-gray-700 w-11/12 max-w-sm">
            <LoadingSpinner size="w-12 h-12" />
            <h2 id="pdf-import-status" className="text-lg font-medium">Processing PDF...</h2>
            {processingMessage && processingMessage.type === 'info' && <p className="text-sm text-gray-500 text-center">{processingMessage.text}</p>}
            
            {/* Indeterminate Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
              <div className="bg-blue-500 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
             <p className="text-xs text-gray-500 text-center">Extracting questions with AI. This may take some time. Please wait.</p>

            <button
              onClick={handleCancelPdfImport}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-full"
              aria-label="Cancel PDF import"
            >
              Cancel Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;