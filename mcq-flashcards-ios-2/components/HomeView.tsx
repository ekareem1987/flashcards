import React, { useRef } from 'react';
import { AppView } from '../types';
import { PlusIcon, LightBulbIcon, AcademicCapIcon, DocumentArrowUpIcon, BookOpenIcon } from '../constants';

interface HomeViewProps {
  setView: (view: AppView) => void;
  deckSize: number;
  onPdfFileSelected: (file: File) => void;
  isImportingPdf: boolean;
  apiKeyAvailable: boolean;
  uniquePdfSources: string[];
}

const HomeView: React.FC<HomeViewProps> = ({ setView, deckSize, onPdfFileSelected, isImportingPdf, apiKeyAvailable, uniquePdfSources }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ActionButton: React.FC<{icon: React.ReactNode, text: string, subtext: string, onClick: () => void, disabled?: boolean, testId?: string}> = 
    ({icon, text, subtext, onClick, disabled, testId}) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 ease-in-out w-full flex flex-col items-center text-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
    >
      <div className="text-blue-500 mb-3">{icon}</div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">{text}</h2>
      <p className="text-sm text-gray-500">{subtext}</p>
    </button>
  );

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input to allow re-selection of the same file
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPdfFileSelected(file);
    }
  };

  return (
    <div className="flex-grow p-6 space-y-6 flex flex-col justify-center items-center bg-gray-100">
      <input 
        type="file" 
        accept=".pdf" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <div className="w-full max-w-md space-y-4">
        <ActionButton
          icon={<PlusIcon className="w-10 h-10" />}
          text="Create New Card"
          subtext="Manually add a new MCQ flashcard."
          onClick={() => setView('create')}
          disabled={isImportingPdf}
        />
        <ActionButton
          icon={<DocumentArrowUpIcon className="w-10 h-10" />}
          text="Import from PDF"
          subtext={apiKeyAvailable ? "Extract MCQs using AI." : "API Key needed for import."}
          onClick={handleImportClick}
          disabled={isImportingPdf || !apiKeyAvailable}
          testId="import-pdf-button"
        />
        <ActionButton
          icon={<BookOpenIcon className="w-10 h-10" />}
          text="View Library"
          subtext="Browse cards by PDF source."
          onClick={() => setView('library')}
          disabled={isImportingPdf || uniquePdfSources.length === 0}
        />
        <ActionButton
          icon={<LightBulbIcon className="w-10 h-10" />}
          text="View Full Deck"
          subtext={`Browse all ${deckSize} flashcards.`}
          onClick={() => setView('deck')}
          disabled={deckSize === 0 || isImportingPdf}
        />
        <ActionButton
          icon={<AcademicCapIcon className="w-10 h-10" />}
          text="Start Full Quiz"
          subtext="Test your knowledge on all cards."
          onClick={() => setView('quiz')}
          disabled={deckSize === 0 || isImportingPdf}
        />
      </div>
      {(deckSize === 0 && !isImportingPdf) && (
        <p className="text-center text-gray-500 mt-8">
          Your deck is empty. Create or import some cards to get started!
        </p>
      )}
      {(uniquePdfSources.length === 0 && deckSize > 0 && !isImportingPdf) && (
         <p className="text-center text-gray-500 mt-4 text-sm">
          No cards imported from PDFs yet. Import a PDF to use the Library feature.
        </p>
      )}
       {!apiKeyAvailable && (
        <p className="text-center text-xs text-yellow-600 mt-4 max-w-md">
          Note: PDF Import and AI Generation features require an API_KEY to be configured in the environment. These features are currently disabled.
        </p>
      )}
    </div>
  );
};

export default HomeView;