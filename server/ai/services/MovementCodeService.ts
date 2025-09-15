// AI Movement Code Generation Service

import { AIResponse } from '../types';

export interface MovementCommand {
  action: string;
  target: 'p1' | 'p2' | 'both';
  parameters?: {
    direction?: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
    speed?: number;
    duration?: number;
    distance?: number; // Now represents force value for distance-based movement
    position?: { x: number; y: number; z: number };
  };
}

export interface GeneratedMovementCode {
  code: string;
  description: string;
  safetyChecks: string[];
  estimatedDuration: number;
}

export class MovementCodeService {
  private apiKey?: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.custom-3d-ai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateMovementCode(
    userInput: string,
    context?: {
      currentScene?: string;
      availableCubes?: string[];
      sceneBounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
    }
  ): Promise<AIResponse<GeneratedMovementCode>> {
    try {
      // Parse the user input to understand the movement intent
      const movementCommand = this.parseMovementIntent(userInput, context);
      
      // Generate the appropriate JavaScript code
      const generatedCode = this.generateJavaScriptCode(movementCommand, context);
      
      return {
        success: true,
        data: generatedCode,
        timestamp: Date.now(),
        model: 'movement-code-generator',
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

  private parseMovementIntent(userInput: string, context?: any): MovementCommand {
    const input = userInput.toLowerCase();
    
    // Determine target cube
    let target: 'p1' | 'p2' | 'both' = 'p1'; // default to p1
    if (input.includes('blue cube') || input.includes('p1') || input.includes('first cube')) {
      target = 'p1';
    } else if (input.includes('red cube') || input.includes('p2') || input.includes('second cube')) {
      target = 'p2';
    } else if (input.includes('both') || input.includes('all cubes')) {
      target = 'both';
    }

    // Determine action and parameters
    let action = 'move';
    let parameters: MovementCommand['parameters'] = {};

    // Check for distance-based movement (e.g., "red cube 2 cm", "move P1 5 units forward")
    const distancePatterns = [
      /(\d+(?:\.\d+)?)\s*(cm|centimeter|centimetre)/,
      /(\d+(?:\.\d+)?)\s*(m|meter|metre)/,
      /(\d+(?:\.\d+)?)\s*(unit|units)/,
      /(\d+(?:\.\d+)?)\s*(inch|inches)/,
      /(\d+(?:\.\d+)?)\s*(foot|feet|ft)/
    ];

    let distance = 0;
    let distanceUnit = 'units';
    
    for (const pattern of distancePatterns) {
      const match = input.match(pattern);
      if (match) {
        distance = parseFloat(match[1]);
        distanceUnit = match[2];
        break;
      }
    }

    // If distance is specified, this is a distance-based movement
    if (distance > 0) {
      action = 'moveDistance';
      // Calculate duration to simulate holding the key for the right amount of time
      const distanceInUnits = this.convertDistanceToUnits(distance, distanceUnit);
      // Based on observation: 2 seconds ≈ 60 cm (0.6 units)
      // So effective speed is 0.3 units/second, but keyboard uses 3.0
      // Duration = distance / effective_speed
      const duration = distanceInUnits / 0.3; // Duration in seconds
      parameters.distance = duration; // Store duration
      
      // Determine direction for distance movement
      if (input.includes('forward') || input.includes('ahead')) {
        parameters.direction = 'forward';
      } else if (input.includes('backward') || input.includes('back')) {
        parameters.direction = 'backward';
      } else if (input.includes('left')) {
        parameters.direction = 'left';
      } else if (input.includes('right')) {
        parameters.direction = 'right';
      } else if (input.includes('up')) {
        parameters.direction = 'up';
      } else if (input.includes('down')) {
        parameters.direction = 'down';
      } else {
        // Default direction if not specified
        parameters.direction = 'forward';
      }
    } else if (input.includes('move')) {
      action = 'move';
      
      // Determine direction
      if (input.includes('forward') || input.includes('ahead')) {
        parameters.direction = 'forward';
      } else if (input.includes('backward') || input.includes('back')) {
        parameters.direction = 'backward';
      } else if (input.includes('left')) {
        parameters.direction = 'left';
      } else if (input.includes('right')) {
        parameters.direction = 'right';
      } else if (input.includes('up') || input.includes('jump')) {
        parameters.direction = 'up';
      } else if (input.includes('down')) {
        parameters.direction = 'down';
      }

      // Extract speed if mentioned
      const speedMatch = input.match(/(\d+)\s*(speed|fast|slow)/);
      if (speedMatch) {
        parameters.speed = parseInt(speedMatch[1]);
      }

      // Extract duration if mentioned
      const durationMatch = input.match(/(\d+)\s*(second|sec|s)/);
      if (durationMatch) {
        parameters.duration = parseInt(durationMatch[1]);
      }

      // Extract distance if mentioned
      const distanceMatch = input.match(/(\d+)\s*(unit|meter|m)/);
      if (distanceMatch) {
        parameters.distance = parseInt(distanceMatch[1]);
      }
    } else if (input.includes('jump')) {
      action = 'jump';
      parameters.direction = 'up';
    } else if (input.includes('stop') || input.includes('halt')) {
      action = 'stop';
    } else if (input.includes('reset') || input.includes('home')) {
      action = 'reset';
    }

    return {
      action,
      target,
      parameters
    };
  }

  private generateJavaScriptCode(command: MovementCommand, context?: any): GeneratedMovementCode {
    const { action, target, parameters } = command;
    
    let code = '';
    let description = '';
    const safetyChecks: string[] = [];
    let estimatedDuration = 0;

    switch (action) {
      case 'move':
        code = this.generateMoveCode(target, parameters);
        description = `Move ${target} cube ${parameters?.direction || 'forward'}`;
        estimatedDuration = parameters?.duration || 2;
        break;
      
      case 'moveDistance':
        code = this.generateMoveDistanceCode(target, parameters);
        description = `Move ${target} cube ${parameters?.distance || 0} units ${parameters?.direction || 'forward'}`;
        estimatedDuration = Math.max(1, (parameters?.distance || 1) / 2); // Estimate based on distance
        break;
      
      case 'jump':
        code = this.generateJumpCode(target);
        description = `Make ${target} cube jump`;
        estimatedDuration = 1;
        break;
      
      case 'stop':
        code = this.generateStopCode(target);
        description = `Stop ${target} cube movement`;
        estimatedDuration = 0.1;
        break;
      
      case 'reset':
        code = this.generateResetCode(target);
        description = `Reset ${target} cube to original position`;
        estimatedDuration = 1;
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Add safety checks
    safetyChecks.push('Check if physics body exists before applying movement');
    safetyChecks.push('Validate cube selection is valid');
    safetyChecks.push('Ensure movement is within scene bounds');

    return {
      code,
      description,
      safetyChecks,
      estimatedDuration
    };
  }

  private generateMoveCode(target: 'p1' | 'p2' | 'both', parameters?: MovementCommand['parameters']): string {
    const direction = parameters?.direction || 'forward';
    const speed = parameters?.speed || 3;
    
    if (target === 'both') {
      return `
// Move both cubes ${direction} (exact keyboard movement simulation)
const moveBothCubesKeyboard = () => {
  const moveSpeed = ${speed};
  
  // Move P1 cube - exact same as keyboard movement
  if (window.cubePhysics && window.cubePhysics.body) {
    const currentVelocity = window.cubePhysics.body.getLinearVelocity();
    let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
    ${this.getDirectionCode(direction, 'newVelocity', speed)}
    window.cubePhysics.body.setLinearVelocity(newVelocity);
  }
  
  // Move P2 cube - exact same as keyboard movement
  if (window.p2CubePhysics && window.p2CubePhysics.body) {
    const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
    let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
    ${this.getDirectionCode(direction, 'newVelocity', speed)}
    window.p2CubePhysics.body.setLinearVelocity(newVelocity);
  }
};

moveBothCubesKeyboard();`;
    } else {
      const cubeVar = target === 'p1' ? 'window.cubePhysics' : 'window.p2CubePhysics';
      const cubeName = target === 'p1' ? 'P1' : 'P2';
      
      return `
// Move ${cubeName} cube ${direction} (exact keyboard movement simulation)
const move${cubeName}CubeKeyboard = () => {
  const moveSpeed = ${speed};
  
  if (${cubeVar} && ${cubeVar}.body) {
    const currentVelocity = ${cubeVar}.body.getLinearVelocity();
    let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
    ${this.getDirectionCode(direction, 'newVelocity', speed)}
    ${cubeVar}.body.setLinearVelocity(newVelocity);
  }
};

move${cubeName}CubeKeyboard();`;
    }
  }

  private generateJumpCode(target: 'p1' | 'p2' | 'both'): string {
    if (target === 'both') {
      return `
// Make both cubes jump
const jumpBothCubes = () => {
  // Jump P1 cube
  if (window.cubePhysics && window.cubePhysics.body) {
    const currentVelocity = window.cubePhysics.body.getLinearVelocity();
    if (Math.abs(currentVelocity.y) < 0.5) {
      const newVelocity = new Vector3(currentVelocity.x, 5, currentVelocity.z);
      window.cubePhysics.body.setLinearVelocity(newVelocity);
    }
  }
  
  // Jump P2 cube
  if (window.p2CubePhysics && window.p2CubePhysics.body) {
    const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
    if (Math.abs(currentVelocity.y) < 0.5) {
      const newVelocity = new Vector3(currentVelocity.x, 5, currentVelocity.z);
      window.p2CubePhysics.body.setLinearVelocity(newVelocity);
    }
  }
};

jumpBothCubes();`;
    } else {
      const cubeVar = target === 'p1' ? 'window.cubePhysics' : 'window.p2CubePhysics';
      const cubeName = target === 'p1' ? 'P1' : 'P2';
      
      return `
// Make ${cubeName} cube jump
const jump${cubeName}Cube = () => {
  if (${cubeVar} && ${cubeVar}.body) {
    const currentVelocity = ${cubeVar}.body.getLinearVelocity();
    if (Math.abs(currentVelocity.y) < 0.5) {
      const newVelocity = new Vector3(currentVelocity.x, 5, currentVelocity.z);
      ${cubeVar}.body.setLinearVelocity(newVelocity);
    }
  }
};

jump${cubeName}Cube();`;
    }
  }

  private generateStopCode(target: 'p1' | 'p2' | 'both'): string {
    if (target === 'both') {
      return `
// Stop both cubes
const stopBothCubes = () => {
  // Stop P1 cube
  if (window.cubePhysics && window.cubePhysics.body) {
    const currentVelocity = window.cubePhysics.body.getLinearVelocity();
    const newVelocity = new Vector3(0, currentVelocity.y, 0); // Keep Y velocity for gravity
    window.cubePhysics.body.setLinearVelocity(newVelocity);
  }
  
  // Stop P2 cube
  if (window.p2CubePhysics && window.p2CubePhysics.body) {
    const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
    const newVelocity = new Vector3(0, currentVelocity.y, 0); // Keep Y velocity for gravity
    window.p2CubePhysics.body.setLinearVelocity(newVelocity);
  }
};

stopBothCubes();`;
    } else {
      const cubeVar = target === 'p1' ? 'window.cubePhysics' : 'window.p2CubePhysics';
      const cubeName = target === 'p1' ? 'P1' : 'P2';
      
      return `
// Stop ${cubeName} cube
const stop${cubeName}Cube = () => {
  if (${cubeVar} && ${cubeVar}.body) {
    const currentVelocity = ${cubeVar}.body.getLinearVelocity();
    const newVelocity = new Vector3(0, currentVelocity.y, 0); // Keep Y velocity for gravity
    ${cubeVar}.body.setLinearVelocity(newVelocity);
  }
};

stop${cubeName}Cube();`;
    }
  }

  private generateResetCode(target: 'p1' | 'p2' | 'both'): string {
    if (target === 'both') {
      return `
// Reset both cubes to original positions
const resetBothCubes = () => {
  // Reset P1 cube
  if (window.cubePhysics && window.cubePhysics.body && window.originalPositions?.p1) {
    window.cubePhysics.body.setLinearVelocity(Vector3.Zero());
    window.cubePhysics.body.setAngularVelocity(Vector3.Zero());
    window.cubePhysics.body.setTransformMatrix(Matrix.Translation(window.originalPositions.p1));
  }
  
  // Reset P2 cube
  if (window.p2CubePhysics && window.p2CubePhysics.body && window.originalPositions?.p2) {
    window.p2CubePhysics.body.setLinearVelocity(Vector3.Zero());
    window.p2CubePhysics.body.setAngularVelocity(Vector3.Zero());
    window.p2CubePhysics.body.setTransformMatrix(Matrix.Translation(window.originalPositions.p2));
  }
};

resetBothCubes();`;
    } else {
      const cubeVar = target === 'p1' ? 'window.cubePhysics' : 'window.p2CubePhysics';
      const positionVar = target === 'p1' ? 'window.originalPositions?.p1' : 'window.originalPositions?.p2';
      const cubeName = target === 'p1' ? 'P1' : 'P2';
      
      return `
// Reset ${cubeName} cube to original position
const reset${cubeName}Cube = () => {
  if (${cubeVar} && ${cubeVar}.body && ${positionVar}) {
    ${cubeVar}.body.setLinearVelocity(Vector3.Zero());
    ${cubeVar}.body.setAngularVelocity(Vector3.Zero());
    ${cubeVar}.body.setTransformMatrix(Matrix.Translation(${positionVar}));
  }
};

reset${cubeName}Cube();`;
    }
  }

  private getDirectionCode(direction: string, velocityVar: string, speed: number): string {
    switch (direction) {
      case 'forward':
        return `${velocityVar}.z = -${speed};`;
      case 'backward':
        return `${velocityVar}.z = ${speed};`;
      case 'left':
        return `${velocityVar}.x = -${speed};`;
      case 'right':
        return `${velocityVar}.x = ${speed};`;
      case 'up':
        return `${velocityVar}.y = ${speed};`;
      case 'down':
        return `${velocityVar}.y = -${speed};`;
      default:
        return `${velocityVar}.z = -${speed};`; // Default to forward
    }
  }

  private convertDistanceToUnits(distance: number, unit: string): number {
    // Convert various units to Babylon.js units (1 unit ≈ 1 meter)
    switch (unit.toLowerCase()) {
      case 'cm':
      case 'centimeter':
      case 'centimetre':
        return distance / 100; // 1 cm = 0.01 meters
      case 'm':
      case 'meter':
      case 'metre':
        return distance; // 1 meter = 1 unit
      case 'unit':
      case 'units':
        return distance; // Already in units
      case 'inch':
      case 'inches':
        return distance * 0.0254; // 1 inch = 0.0254 meters
      case 'foot':
      case 'feet':
      case 'ft':
        return distance * 0.3048; // 1 foot = 0.3048 meters
      default:
        return distance; // Default to units
    }
  }

  private generateMoveDistanceCode(target: 'p1' | 'p2' | 'both', parameters?: MovementCommand['parameters']): string {
    const direction = parameters?.direction || 'forward';
    const duration = parameters?.distance || 1.0; // This is now the duration in seconds
    const moveSpeed = 3.0; // Same as keyboard movement
    
    if (target === 'both') {
      return `
// Move both cubes ${direction} for ${duration} seconds (simulating key hold)
const moveBothCubesHold = () => {
  const moveSpeed = ${moveSpeed};
  const duration = ${duration} * 1000; // Convert to milliseconds
  const startTime = Date.now();
  
  const moveInterval = setInterval(() => {
    if (Date.now() - startTime > duration) {
      clearInterval(moveInterval);
      
      // Start deceleration phase - gradually slow down like keyboard movement
      const decelInterval = setInterval(() => {
        let bothStopped = true;
        
        // Decelerate P1 cube
        if (window.cubePhysics && window.cubePhysics.body) {
          const currentVelocity = window.cubePhysics.body.getLinearVelocity();
          const newVelocity = new Vector3(
            currentVelocity.x * 0.9, // Gradually reduce X velocity
            currentVelocity.y, // Keep Y for gravity
            currentVelocity.z * 0.9  // Gradually reduce Z velocity
          );
          window.cubePhysics.body.setLinearVelocity(newVelocity);
          if (Math.abs(newVelocity.x) > 0.1 || Math.abs(newVelocity.z) > 0.1) {
            bothStopped = false;
          }
        }
        
        // Decelerate P2 cube
        if (window.p2CubePhysics && window.p2CubePhysics.body) {
          const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
          const newVelocity = new Vector3(
            currentVelocity.x * 0.9, // Gradually reduce X velocity
            currentVelocity.y, // Keep Y for gravity
            currentVelocity.z * 0.9  // Gradually reduce Z velocity
          );
          window.p2CubePhysics.body.setLinearVelocity(newVelocity);
          if (Math.abs(newVelocity.x) > 0.1 || Math.abs(newVelocity.z) > 0.1) {
            bothStopped = false;
          }
        }
        
        // Stop deceleration when both cubes are nearly stopped
        if (bothStopped) {
          clearInterval(decelInterval);
        }
      }, 16);
      
      return;
    }
    
    // Move P1 cube - exact same as keyboard movement
    if (window.cubePhysics && window.cubePhysics.body) {
      const currentVelocity = window.cubePhysics.body.getLinearVelocity();
      let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
      ${this.getDirectionCode(direction, 'newVelocity', moveSpeed)}
      window.cubePhysics.body.setLinearVelocity(newVelocity);
    }
    
    // Move P2 cube - exact same as keyboard movement
    if (window.p2CubePhysics && window.p2CubePhysics.body) {
      const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
      let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
      ${this.getDirectionCode(direction, 'newVelocity', moveSpeed)}
      window.p2CubePhysics.body.setLinearVelocity(newVelocity);
    }
  }, 16); // 60fps like keyboard movement
};

moveBothCubesHold();`;
    } else {
      const cubeVar = target === 'p1' ? 'window.cubePhysics' : 'window.p2CubePhysics';
      const cubeName = target === 'p1' ? 'P1' : 'P2';
      
      return `
// Move ${cubeName} cube ${direction} for ${duration} seconds (simulating key hold)
const move${cubeName}CubeHold = () => {
  const moveSpeed = ${moveSpeed};
  const duration = ${duration} * 1000; // Convert to milliseconds
  const startTime = Date.now();
  
  const moveInterval = setInterval(() => {
    if (Date.now() - startTime > duration) {
      clearInterval(moveInterval);
      
      // Start deceleration phase - gradually slow down like keyboard movement
      const decelInterval = setInterval(() => {
        if (${cubeVar} && ${cubeVar}.body) {
          const currentVelocity = ${cubeVar}.body.getLinearVelocity();
          const newVelocity = new Vector3(
            currentVelocity.x * 0.9, // Gradually reduce X velocity
            currentVelocity.y, // Keep Y for gravity
            currentVelocity.z * 0.9  // Gradually reduce Z velocity
          );
          ${cubeVar}.body.setLinearVelocity(newVelocity);
          
          // Stop deceleration when nearly stopped
          if (Math.abs(newVelocity.x) < 0.1 && Math.abs(newVelocity.z) < 0.1) {
            clearInterval(decelInterval);
          }
        } else {
          clearInterval(decelInterval);
        }
      }, 16);
      
      return;
    }
    
    if (${cubeVar} && ${cubeVar}.body) {
      const currentVelocity = ${cubeVar}.body.getLinearVelocity();
      let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
      ${this.getDirectionCode(direction, 'newVelocity', moveSpeed)}
      ${cubeVar}.body.setLinearVelocity(newVelocity);
    }
  }, 16); // 60fps like keyboard movement
};

move${cubeName}CubeHold();`;
    }
  }

  async validateMovementCode(code: string): Promise<AIResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic syntax validation
      try {
        new Function(code);
      } catch (error) {
        errors.push(`Syntax error: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Check for required variables
      if (!code.includes('window.cubePhysics') && !code.includes('window.p2CubePhysics')) {
        warnings.push('Code should reference cube physics objects');
      }

      // Check for safety measures
      if (!code.includes('if (') || !code.includes('&&')) {
        warnings.push('Code should include safety checks for physics body existence');
      }

      return {
        success: true,
        data: {
          isValid: errors.length === 0,
          errors,
          warnings
        },
        timestamp: Date.now(),
        model: 'movement-code-validator',
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
let movementCodeServiceInstance: MovementCodeService | null = null;

export const getMovementCodeService = (apiKey?: string): MovementCodeService => {
  if (!movementCodeServiceInstance) {
    movementCodeServiceInstance = new MovementCodeService(apiKey);
  }
  return movementCodeServiceInstance;
};
