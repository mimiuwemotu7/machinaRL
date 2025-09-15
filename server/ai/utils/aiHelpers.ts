// AI Utility Functions and Helpers

import { 
  AIResponse, 
  AIRequest, 
  NLPResponse, 
  VisionResponse, 
  Scene3DResponse,
  Vector3,
  BoundingBox
} from '../types';

// Response Validation
export const isValidAIResponse = <T>(response: any): response is AIResponse<T> => {
  return (
    response &&
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'number'
  );
};

// Error Handling
export const createErrorResponse = (error: string, timestamp?: number): AIResponse => {
  return {
    success: false,
    error,
    timestamp: timestamp || Date.now()
  };
};

export const createSuccessResponse = <T>(
  data: T, 
  model?: string, 
  confidence?: number, 
  timestamp?: number
): AIResponse<T> => {
  return {
    success: true,
    data,
    timestamp: timestamp || Date.now(),
    model,
    confidence
  };
};

// Request Helpers
export const createAIRequest = (
  prompt: string, 
  context?: Record<string, any>, 
  options?: any
): AIRequest => {
  return {
    prompt,
    context,
    options
  };
};

// Text Processing
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:'"()-]/g, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const extractKeywords = (text: string): string[] => {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
  ]);
  
  return Array.from(new Set(words.filter(word => !stopWords.has(word))));
};

// Confidence Scoring
export const calculateConfidence = (factors: {
  modelAccuracy?: number;
  dataQuality?: number;
  contextRelevance?: number;
  responseLength?: number;
}): number => {
  const weights = {
    modelAccuracy: 0.4,
    dataQuality: 0.3,
    contextRelevance: 0.2,
    responseLength: 0.1
  };

  let confidence = 0;
  let totalWeight = 0;

  Object.entries(factors).forEach(([key, value]) => {
    if (value !== undefined && weights[key as keyof typeof weights]) {
      confidence += value * weights[key as keyof typeof weights];
      totalWeight += weights[key as keyof typeof weights];
    }
  });

  return totalWeight > 0 ? Math.min(confidence / totalWeight, 1) : 0.5;
};

// Vector Math
export const vector3Distance = (a: Vector3, b: Vector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const vector3Add = (a: Vector3, b: Vector3): Vector3 => {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
};

export const vector3Subtract = (a: Vector3, b: Vector3): Vector3 => {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
};

export const vector3Scale = (v: Vector3, scale: number): Vector3 => {
  return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
};

export const vector3Normalize = (v: Vector3): Vector3 => {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};

// Bounding Box Operations
export const boundingBoxIntersects = (a: BoundingBox, b: BoundingBox): boolean => {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
};

export const boundingBoxArea = (bbox: BoundingBox): number => {
  return bbox.width * bbox.height;
};

export const boundingBoxCenter = (bbox: BoundingBox): { x: number; y: number } => {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2
  };
};

// Data Formatting
export const formatAIResponse = <T>(response: AIResponse<T>): string => {
  if (!response.success) {
    return `Error: ${response.error}`;
  }

  let formatted = `Success: ${JSON.stringify(response.data, null, 2)}`;
  
  if (response.model) {
    formatted += `\nModel: ${response.model}`;
  }
  
  if (response.confidence) {
    formatted += `\nConfidence: ${(response.confidence * 100).toFixed(1)}%`;
  }
  
  formatted += `\nTimestamp: ${new Date(response.timestamp).toISOString()}`;
  
  return formatted;
};

// Response Aggregation
export const aggregateResponses = <T>(responses: AIResponse<T>[]): AIResponse<T[]> => {
  const successful = responses.filter(r => r.success);
  const failed = responses.filter(r => !r.success);

  if (successful.length === 0) {
    return createErrorResponse('All responses failed');
  }

  const data = successful.map(r => r.data!);
  const avgConfidence = successful.reduce((sum, r) => sum + (r.confidence || 0), 0) / successful.length;

  return createSuccessResponse(
    data,
    'aggregated',
    avgConfidence
  );
};

// Caching
export class AICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Retry Logic
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
};

// Debouncing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttling
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Performance Monitoring
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  start(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      this.metrics.get(label)!.push(duration);
    };
  }

  getAverage(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getStats(label: string): { min: number; max: number; avg: number; count: number } {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: this.getAverage(label),
      count: times.length
    };
  }

  clear(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}

// Export singleton instances
export const aiCache = new AICache();
export const performanceMonitor = new PerformanceMonitor();
