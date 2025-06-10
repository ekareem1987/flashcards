
import React, { useState, useEffect, useCallback } from 'react';
import { FlashcardMCQ, MCQOption, AppView } from '../types';
import { generateMCQWithGemini } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { SparklesIcon } from '../constants';

interface FlashcardFormProps {
  onSave: (card: FlashcardMCQ) => void;
  setView: (view: AppView) => void;
  initialCard?: FlashcardMCQ | null;
}

const FlashcardForm: React.FC<FlashcardFormProps> = ({ onSave, setView, initialCard }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiTopic, setGeminiTopic] = useState('');

  useEffect(() => {
    if (initialCard) {
      setQuestion(initialCard.question);
      const initialOptionsTexts = initialCard.options.map(opt => opt.text);
      const paddedOptions = [...initialOptionsTexts, '', '', '', ''].slice(0, 4);
      setOptions(paddedOptions);
      const correctIndex = initialCard.options.findIndex(opt => opt.id === initialCard.correctOptionId);
      setCorrectOptionIndex(correctIndex !== -1 ? correctIndex : null);
      setTopic(initialCard.topic || '');
      setExplanation(initialCard.explanation || '');
      setGeminiTopic(initialCard.topic || '');
    } else {
      // Reset form for new card
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectOptionIndex(null);
      setTopic('');
      setExplanation('');
      setGeminiTopic('');
    }
  }, [initialCard]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() === '' || options.some(opt => opt.trim() === '') || correctOptionIndex === null) {
      setError('Please fill in all fields (question, all options) and select a correct answer.');
      return;
    }
    setError(null);

    const newMCQOptions: MCQOption[] = options.map((optText, index) => ({
      id: initialCard?.options[index]?.id || crypto.randomUUID(),
      text: optText,
    }));

    const newCard: FlashcardMCQ = {
      id: initialCard?.id || crypto.randomUUID(),
      question,
      options: newMCQOptions,
      correctOptionId: newMCQOptions[correctOptionIndex].id,
      topic: topic.trim() || undefined,
      explanation: explanation.trim() || undefined,
      sourcePdfName: initialCard?.sourcePdfName, // Preserve if editing
    };
    onSave(newCard);
    setView('home');
  };

  const handleGenerateWithAI = useCallback(async () => {
    if (geminiTopic.trim() === '') {
      setError('Please enter a topic for AI generation.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const generatedData = await generateMCQWithGemini(geminiTopic.trim(), 4);
      if (generatedData.question && generatedData.options && generatedData.correctOptionId) {
        setQuestion(generatedData.question);
        const newOptionsTexts = generatedData.options.map(opt => opt.text);
        setOptions(newOptionsTexts);
        const correctIndex = generatedData.options.findIndex(opt => opt.id === generatedData.correctOptionId);
        setCorrectOptionIndex(correctIndex !== -1 ? correctIndex : null);
        setTopic(generatedData.topic || geminiTopic.trim());
        setExplanation(generatedData.explanation || '');
      } else {
         setError("AI generation failed to produce a complete question. Please try again or refine the topic.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during AI generation.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [geminiTopic]);

  return (
    <div className="p-4 md:p-6 bg-gray-50 flex-grow overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-700 mb-2">AI Question Generation</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={geminiTopic}
              onChange={(e) => setGeminiTopic(e.target.value)}
              placeholder="Enter topic for AI (e.g., Photosynthesis)"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isGenerating}
              aria-label="Topic for AI generation"
            />
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGenerating || !process.env.API_KEY}
              className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              aria-label="Generate question with AI"
            >
              {isGenerating ? <LoadingSpinner size="w-5 h-5" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
              Generate
            </button>
          </div>
           {!process.env.API_KEY && <p className="text-xs text-yellow-600 mt-1">API_KEY not set. AI generation disabled.</p>}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter the question"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mt-4">Topic (Optional)</label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Biology, Chapter 5"
            />
          </div>

          <fieldset className="mt-4">
            <legend className="block text-sm font-medium text-gray-700">Options</legend>
            <div className="mt-2 space-y-3">
              {options.map((opt, index) => (
                <div key={index} className="flex items-center">
                  <input
                    id={`option-${index}-correct`}
                    name="correctOption"
                    type="radio"
                    checked={correctOptionIndex === index}
                    onChange={() => setCorrectOptionIndex(index)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 mr-3"
                    required
                    aria-label={`Mark Option ${index + 1} as correct`}
                    aria-describedby={`option-text-${index}`}
                  />
                  <input
                    type="text"
                    id={`option-text-${index}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={`Option ${index + 1}`}
                    required
                    aria-required="true"
                    aria-label={`Option ${index + 1} text`}
                  />
                </div>
              ))}
            </div>
            {correctOptionIndex === null && <p className="text-xs text-red-500 mt-1">Please select one correct option.</p>}
          </fieldset>

          <div className="mt-4">
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">Explanation (Optional)</label>
            <textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter explanation for the answer"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setView('home')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {initialCard ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FlashcardForm;