// Natural Language Processing Service

import { 
  AIResponse, 
  NLPResponse, 
  Entity, 
  Sentiment, 
  Intent,
  AIRequest 
} from '../types';

export class NLPService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async analyzeText(text: string, options?: {
    extractEntities?: boolean;
    analyzeSentiment?: boolean;
    detectIntent?: boolean;
    detectLanguage?: boolean;
  }): Promise<AIResponse<NLPResponse>> {
    try {
      const response: NLPResponse = {
        text,
        confidence: 0.9
      };

      // Extract entities
      if (options?.extractEntities !== false) {
        response.entities = await this.extractEntities(text);
      }

      // Analyze sentiment
      if (options?.analyzeSentiment !== false) {
        response.sentiment = await this.analyzeSentiment(text);
      }

      // Detect intent
      if (options?.detectIntent !== false) {
        response.intent = await this.detectIntent(text);
      }

      // Detect language
      if (options?.detectLanguage !== false) {
        response.language = await this.detectLanguage(text);
      }

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        model: 'nlp-service',
        confidence: response.confidence
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  async extractEntities(text: string): Promise<Entity[]> {
    // Mock entity extraction - in real implementation, this would use NLP APIs
    const entities: Entity[] = [];
    
    // Simple pattern matching for demo
    const patterns = [
      { type: 'PERSON', regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g },
      { type: 'ORGANIZATION', regex: /\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd)\b/g },
      { type: 'LOCATION', regex: /\b[A-Z][a-z]+ (City|State|Country)\b/g },
      { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { type: 'PHONE', regex: /\b\d{3}-\d{3}-\d{4}\b/g }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: pattern.type,
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8 + Math.random() * 0.2
        });
      }
    });

    return entities;
  }

  async analyzeSentiment(text: string): Promise<Sentiment> {
    // Mock sentiment analysis - in real implementation, this would use ML models
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst', 'disappointed'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });

    const totalScore = positiveScore - negativeScore;
    let label: 'positive' | 'negative' | 'neutral';
    let score: number;

    if (totalScore > 0) {
      label = 'positive';
      score = Math.min(totalScore / words.length, 1);
    } else if (totalScore < 0) {
      label = 'negative';
      score = Math.min(Math.abs(totalScore) / words.length, 1);
    } else {
      label = 'neutral';
      score = 0.5;
    }

    return { label, score };
  }

  async detectIntent(text: string): Promise<Intent> {
    // Mock intent detection - in real implementation, this would use NLP models
    const intents = [
      { name: 'greeting', patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'] },
      { name: 'question', patterns: ['what', 'how', 'why', 'when', 'where', 'who', '?'] },
      { name: 'request', patterns: ['please', 'can you', 'could you', 'help me', 'i need'] },
      { name: 'complaint', patterns: ['problem', 'issue', 'error', 'bug', 'broken', 'not working'] },
      { name: 'compliment', patterns: ['thank you', 'thanks', 'great job', 'well done', 'excellent'] }
    ];

    const lowerText = text.toLowerCase();
    let bestIntent = { name: 'unknown', confidence: 0, parameters: {} };

    intents.forEach(intent => {
      const matches = intent.patterns.filter(pattern => lowerText.includes(pattern));
      if (matches.length > 0) {
        const confidence = matches.length / intent.patterns.length;
        if (confidence > bestIntent.confidence) {
          bestIntent = {
            name: intent.name,
            confidence,
            parameters: { matchedPatterns: matches }
          };
        }
      }
    });

    return bestIntent;
  }

  async detectLanguage(text: string): Promise<string> {
    // Mock language detection - in real implementation, this would use language detection models
    const languagePatterns = {
      'en': /^[a-zA-Z\s.,!?;:'"()-]+$/,
      'es': /[ñáéíóúü]/i,
      'fr': /[àâäéèêëïîôöùûüÿç]/i,
      'de': /[äöüß]/i,
      'zh': /[\u4e00-\u9fff]/,
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
      'ko': /[\uac00-\ud7af]/,
      'ar': /[\u0600-\u06ff]/,
      'ru': /[\u0400-\u04ff]/
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    return 'en'; // Default to English
  }

  async generateResponse(prompt: string, context?: Record<string, any>): Promise<AIResponse<string>> {
    try {
      // Mock response generation - in real implementation, this would use LLM APIs
      const responses = [
        `I understand you're asking about: "${prompt}". Let me help you with that.`,
        `Based on your question "${prompt}", here's what I think...`,
        `That's an interesting point about "${prompt}". Here's my perspective...`,
        `Regarding "${prompt}", I can provide some insights...`
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        model: 'nlp-generator',
        confidence: 0.85
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  async summarizeText(text: string, maxLength: number = 100): Promise<AIResponse<string>> {
    try {
      // Mock summarization - in real implementation, this would use summarization models
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const summary = sentences.slice(0, Math.ceil(sentences.length / 3)).join('. ') + '.';
      
      const truncatedSummary = summary.length > maxLength 
        ? summary.substring(0, maxLength) + '...'
        : summary;

      return {
        success: true,
        data: truncatedSummary,
        timestamp: Date.now(),
        model: 'nlp-summarizer',
        confidence: 0.8
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<AIResponse<string>> {
    try {
      // Mock translation - in real implementation, this would use translation APIs
      const translations: Record<string, string> = {
        'es': `[Spanish] ${text}`,
        'fr': `[French] ${text}`,
        'de': `[German] ${text}`,
        'zh': `[Chinese] ${text}`,
        'ja': `[Japanese] ${text}`,
        'ko': `[Korean] ${text}`,
        'ar': `[Arabic] ${text}`,
        'ru': `[Russian] ${text}`
      };

      const translation = translations[targetLanguage] || text;

      return {
        success: true,
        data: translation,
        timestamp: Date.now(),
        model: 'nlp-translator',
        confidence: 0.9
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }
}

// Singleton instance
let nlpServiceInstance: NLPService | null = null;

export const getNLPService = (apiKey?: string): NLPService => {
  if (!nlpServiceInstance) {
    nlpServiceInstance = new NLPService(apiKey);
  }
  return nlpServiceInstance;
};
