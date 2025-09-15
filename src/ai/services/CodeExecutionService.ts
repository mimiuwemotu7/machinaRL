// AI Code Execution Service - Safely executes generated movement code

import { AIResponse } from '../types';

export interface CodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  warnings: string[];
}

export interface ExecutionContext {
  scene?: any;
  cubePhysics?: any;
  p2CubePhysics?: any;
  originalPositions?: {
    p1?: any;
    p2?: any;
  };
  sceneBounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export class CodeExecutionService {
  private executionTimeout: number = 5000; // 5 seconds max execution time
  private allowedGlobals: Set<string> = new Set([
    'Vector3', 'Matrix', 'Quaternion', 'Color3', 'Color4',
    'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean'
  ]);

  constructor(executionTimeout: number = 5000) {
    this.executionTimeout = executionTimeout;
  }

  async executeMovementCode(
    code: string,
    context: ExecutionContext = {}
  ): Promise<AIResponse<CodeExecutionResult>> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate code safety
      const validationResult = this.validateCodeSafety(code);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Code validation failed: ${validationResult.errors.join(', ')}`,
          timestamp: Date.now()
        };
      }

      warnings.push(...validationResult.warnings);

      // Create safe execution environment
      const safeContext = this.createSafeExecutionContext(context);
      
      // Execute the code with timeout
      const result = await this.executeWithTimeout(code, safeContext);
      
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          success: true,
          output: result,
          executionTime,
          warnings
        },
        timestamp: Date.now(),
        model: 'code-executor',
        confidence: 0.9
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  private validateCodeSafety(code: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(\s*["']/,
      /setInterval\s*\(\s*["']/,
      /document\./,
      /window\.(?!cubePhysics|p2CubePhysics|originalPositions)/,
      /localStorage/,
      /sessionStorage/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /import\s+/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /__dirname/,
      /__filename/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    // Check for required safety checks
    if (!code.includes('if (') || !code.includes('&&')) {
      warnings.push('Code should include safety checks for physics body existence');
    }

    // Check for proper variable usage
    if (code.includes('window.cubePhysics') && !code.includes('window.cubePhysics.body')) {
      warnings.push('Code should check for physics body existence before use');
    }

    if (code.includes('window.p2CubePhysics') && !code.includes('window.p2CubePhysics.body')) {
      warnings.push('Code should check for P2 physics body existence before use');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private createSafeExecutionContext(context: ExecutionContext): any {
    // Create a safe execution context with only allowed globals and context variables
    const safeContext: any = {};

    // Add allowed globals
    for (const global of Array.from(this.allowedGlobals)) {
      if (typeof (globalThis as any)[global] !== 'undefined') {
        safeContext[global] = (globalThis as any)[global];
      }
    }

    // Add context variables - expose them directly for easier access
    safeContext.cubePhysics = context.cubePhysics;
    safeContext.p2CubePhysics = context.p2CubePhysics;
    safeContext.originalPositions = context.originalPositions;
    safeContext.Vector3 = (globalThis as any).Vector3;
    safeContext.Matrix = (globalThis as any).Matrix;

    // Also add them under window for compatibility
    safeContext.window = {
      cubePhysics: context.cubePhysics,
      p2CubePhysics: context.p2CubePhysics,
      originalPositions: context.originalPositions,
      Vector3: (globalThis as any).Vector3,
      Matrix: (globalThis as any).Matrix
    };

    // Add scene context if available
    if (context.scene) {
      safeContext.scene = context.scene;
    }

    // Add console for debugging (but limit its functionality)
    safeContext.console = {
      log: (...args: any[]) => console.log('[AI Code Execution]:', ...args),
      warn: (...args: any[]) => console.warn('[AI Code Execution]:', ...args),
      error: (...args: any[]) => console.error('[AI Code Execution]:', ...args)
    };

    return safeContext;
  }

  private async executeWithTimeout(code: string, context: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Code execution timeout'));
      }, this.executionTimeout);

      try {
        // Create a function with the code and execute it in the safe context
        const func = new Function(
          ...Object.keys(context),
          `
          try {
            ${code}
          } catch (error) {
            throw new Error('Code execution error: ' + error.message);
          }
          `
        );

        const result = func(...Object.values(context));
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  async executeCodeSafely(
    code: string,
    context: ExecutionContext = {}
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate code safety
      const validationResult = this.validateCodeSafety(code);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Code validation failed: ${validationResult.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
          warnings: validationResult.warnings
        };
      }

      warnings.push(...validationResult.warnings);

      // Create safe execution environment
      const safeContext = this.createSafeExecutionContext(context);
      
      // Execute the code with timeout
      const result = await this.executeWithTimeout(code, safeContext);
      
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result,
        executionTime,
        warnings
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: errorMessage,
        executionTime,
        warnings
      };
    }
  }

  // Utility method to create a sandboxed execution environment
  createSandbox(): {
    execute: (code: string, context?: ExecutionContext) => Promise<CodeExecutionResult>;
    destroy: () => void;
  } {
    const sandbox = {
      execute: async (code: string, context: ExecutionContext = {}): Promise<CodeExecutionResult> => {
        return this.executeCodeSafely(code, context);
      },
      destroy: () => {
        // Clean up any resources if needed
      }
    };

    return sandbox;
  }

  // Method to validate code before execution
  validateCode(code: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const validation = this.validateCodeSafety(code);
    const suggestions: string[] = [];

    if (validation.warnings.length > 0) {
      suggestions.push('Add safety checks for physics body existence');
      suggestions.push('Include error handling for edge cases');
    }

    if (!code.includes('Vector3')) {
      suggestions.push('Consider using Vector3 for position and velocity operations');
    }

    if (!code.includes('setInterval') && !code.includes('setTimeout')) {
      suggestions.push('For continuous movement, consider using setInterval with proper cleanup');
    }

    return {
      ...validation,
      suggestions
    };
  }
}

// Singleton instance
let codeExecutionServiceInstance: CodeExecutionService | null = null;

export const getCodeExecutionService = (executionTimeout?: number): CodeExecutionService => {
  if (!codeExecutionServiceInstance) {
    codeExecutionServiceInstance = new CodeExecutionService(executionTimeout);
  }
  return codeExecutionServiceInstance;
};
