export interface MCQOption {
  id: string;
  text: string;
}

export interface FlashcardMCQ {
  id: string;
  question: string;
  options: MCQOption[];
  correctOptionId: string;
  topic?: string; // Optional topic for AI generation context
  explanation?: string; // Optional explanation for the answer
  sourcePdfName?: string; // Optional: Name of the PDF file this card was extracted from
}

export type AppView = 'home' | 'create' | 'edit' | 'deck' | 'quiz' | 'library';

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Other types of grounding chunks can be added here if needed
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // other grounding metadata fields
}

export interface Candidate {
  groundingMetadata?: GroundingMetadata;
  // other candidate fields
}

// Type for the structure of individual MCQ items expected from Gemini PDF extraction
export interface GeminiPDFMCQResponseItem {
  question: string;
  options: string[]; // Array of option texts
  correctOptionIndex: number; // 0-indexed integer for the correct option
  explanation?: string; // Optional explanation for the answer
  topic?: string;
}