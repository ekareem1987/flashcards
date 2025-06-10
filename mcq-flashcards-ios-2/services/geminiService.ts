
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { FlashcardMCQ, MCQOption, GeminiPDFMCQResponseItem } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

interface GeminiMCQResponse {
  question: string;
  options: string[];
  correctOptionIndex: number;
  topic?: string;
  explanation?: string;
}

const readFileAsBase64 = (file: File, signal?: AbortSignal): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const reader = new FileReader();
    
    const onAbort = () => {
      reader.abort();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    reader.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      const base64String = (reader.result as string).split(',')[1];
      if (!base64String) {
        reject(new Error("Failed to extract base64 string from file."));
        return;
      }
      resolve(base64String);
    };
    reader.onerror = (error) => {
      signal?.removeEventListener('abort', onAbort);
      reject(error);
    };
    reader.onabort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted by FileReader', 'AbortError'));
    };
    reader.readAsDataURL(file);
  });
};

export const generateMCQWithGemini = async (topic: string, numOptions: number = 4): Promise<Partial<FlashcardMCQ>> => {
  if (!ai) {
    throw new Error("Gemini API key not configured. Cannot generate questions.");
  }

  const prompt = `Generate a multiple-choice question on the topic of "${topic}".
The question should have ${numOptions} options, with one clearly correct answer.
Also provide a brief explanation for the correct answer.
The topic itself should also be returned.
Return the response as a JSON object with the following structure:
{
  "question": "<The question text>",
  "options": ["<Option 1 text>", "<Option 2 text>", ...],
  "correctOptionIndex": <0-indexed integer for the correct option>,
  "explanation": "<Brief explanation for the answer>",
  "topic": "${topic}"
}
Ensure all string values (like question, options, explanation) are properly JSON escaped (e.g., double quotes as \\", newlines as \\n).
Do not include any other text, explanations, or markdown formatting outside of this JSON object.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    let generatedData: GeminiMCQResponse;
    try {
        generatedData = JSON.parse(jsonStr) as GeminiMCQResponse;
    } catch (parseError) {
        console.error("JSON Parse Error during single MCQ generation. Raw string:", jsonStr);
        console.error("Original parsing error:", parseError);
        throw new Error(`Failed to parse response from AI: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }


    if (
      !generatedData.question ||
      !Array.isArray(generatedData.options) ||
      generatedData.options.length !== numOptions ||
      typeof generatedData.correctOptionIndex !== 'number' ||
      generatedData.correctOptionIndex < 0 ||
      generatedData.correctOptionIndex >= numOptions
    ) {
      throw new Error("Invalid response structure from Gemini API for single MCQ generation.");
    }

    const newOptions: MCQOption[] = generatedData.options.map((optText) => ({
      id: crypto.randomUUID(),
      text: optText,
    }));

    return {
      question: generatedData.question,
      options: newOptions,
      correctOptionId: newOptions[generatedData.correctOptionIndex].id,
      topic: generatedData.topic || topic,
      explanation: generatedData.explanation?.trim() || undefined,
    };
  } catch (error) {
    console.error("Error generating MCQ with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate MCQ: ${error.message}`);
    }
    throw new Error("Failed to generate MCQ due to an unknown error.");
  }
};

export const extractMCQsFromPDF = async (pdfFile: File, signal?: AbortSignal): Promise<FlashcardMCQ[]> => {
  if (!ai) {
    throw new Error("Gemini API key not configured. Cannot process PDF.");
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted before reading file', 'AbortError');
  }

  let base64PdfString: string;
  try {
    base64PdfString = await readFileAsBase64(pdfFile, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error; 
    }
    console.error("Error reading PDF file:", error);
    throw new Error(`Failed to read PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted after reading file, before API call', 'AbortError');
  }

  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: base64PdfString,
    },
  };

  const promptPart = {
    text: `You are an expert MCQ extractor. Analyze the provided PDF document and extract all multiple-choice questions.
For each MCQ, provide:
1. The full question text.
2. An array of strings representing all answer options, in the order they appear.
3. The 0-indexed integer of the correct answer option from the "options" array.
4. A concise explanation for why the correct option is correct and/or why other options might be incorrect. If no specific explanation is found, use an empty string for the explanation value.
5. An optional topic for the question, if discernible from the context. If not, use an empty string for the topic value.

Return the result as a VALID JSON array of objects. Each object in the array must strictly follow this format:
{
  "question": "The question text here",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctOptionIndex": 0,
  "explanation": "Detailed explanation for the answer. This can be an empty string if not applicable.",
  "topic": "Optional topic name"
}

CRITICAL ADHERENCE INSTRUCTIONS:
1.  VALID JSON ONLY: The entire response MUST be a single, valid JSON array. Do not include any introductory text, concluding remarks, markdown formatting (like \`\`\`json \`\`\`), or any other characters outside of this JSON array.
2.  NO RAW TEXT INJECTION: Absolutely NO raw text snippets from the PDF document or any other commentary should be inserted between JSON fields (e.g., between the 'options' array and 'correctOptionIndex' field) or between objects in the array. All extracted content must be correctly placed within the quoted string values of the specified JSON fields ("question", "options", "explanation", "topic").
3.  STRING ESCAPING: Ensure all string values within the JSON are properly escaped. For example, any double quotes (") within a string value must be escaped as \\", and newlines within string values should be escaped as \\n.
4.  INDEXING: If a question has N options, correctOptionIndex must be an integer between 0 and N-1.
5.  EMPTY ARRAY: If no MCQs are found, return an empty JSON array: [].
6.  CONCISENESS: Keep explanations concise.
Failure to adhere to these structural rules will result in an unusable response.
`,
  };
  
  let jsonStr = ""; 
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT, 
      contents: { parts: [pdfPart, promptPart] },
      config: {
        responseMimeType: "application/json",
      },
    });

    if (signal?.aborted) {
      throw new DOMException('Aborted during or after API call', 'AbortError');
    }

    jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    let extractedDataArray: GeminiPDFMCQResponseItem[];
    try {
      extractedDataArray = JSON.parse(jsonStr) as GeminiPDFMCQResponseItem[];
    } catch (parseError) {
      console.error("JSON Parse Error during PDF MCQ extraction. Raw string received from Gemini:", jsonStr);
      console.error("Original parsing error details:", parseError);
      throw new Error(`Failed to parse MCQs from PDF due to invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }


    if (!Array.isArray(extractedDataArray)) {
      console.error("Invalid response structure from Gemini API for PDF: Expected an array, got:", extractedDataArray);
      console.error("Raw string was:", jsonStr);
      throw new Error("Invalid response structure from Gemini API: Expected an array.");
    }

    const flashcards: FlashcardMCQ[] = [];
    for (const item of extractedDataArray) {
      if (signal?.aborted) {
        throw new DOMException('Aborted during processing of results', 'AbortError');
      }
      if (
        !item.question ||
        !Array.isArray(item.options) ||
        item.options.some(opt => typeof opt !== 'string') ||
        typeof item.correctOptionIndex !== 'number' ||
        item.correctOptionIndex < 0 ||
        item.correctOptionIndex >= item.options.length
      ) {
        console.warn("Skipping invalid MCQ item from PDF:", item);
        continue;
      }

      const mcqOptions: MCQOption[] = item.options.map(optText => ({
        id: crypto.randomUUID(),
        text: optText,
      }));

      flashcards.push({
        id: crypto.randomUUID(),
        question: item.question,
        options: mcqOptions,
        correctOptionId: mcqOptions[item.correctOptionIndex].id,
        explanation: item.explanation?.trim() || undefined,
        topic: item.topic?.trim() || undefined,
      });
    }
    return flashcards;

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error; 
    }
    console.error("Error extracting MCQs from PDF with Gemini:", error); 
    if (error instanceof Error) {
        if (error.message.startsWith("Failed to parse MCQs from PDF due to invalid JSON format:")) {
            throw error;
        }
        throw new Error(`Failed to extract MCQs from PDF: ${error.message}`);
    }
    throw new Error("Failed to extract MCQs from PDF due to an unknown error.");
  }
};
