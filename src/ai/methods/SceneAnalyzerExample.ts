import { Scene } from '@babylonjs/core';
import { SceneAnalyzer } from './SceneAnalyzer';

/**
 * Example usage of SceneAnalyzer for AI systems
 */
export class SceneAnalyzerExample {
  private sceneAnalyzer: SceneAnalyzer;

  constructor(scene: Scene) {
    this.sceneAnalyzer = new SceneAnalyzer(scene);
  }

  /**
   * Get scene data for AI prompt
   */
  getSceneDataForAI(): string {
    const analysis = this.sceneAnalyzer.performAnalysis();
    if (!analysis) {
      return 'No scene data available';
    }

    return this.sceneAnalyzer.getAISceneDescription();
  }

  /**
   * Get game objects for AI decision making
   */
  getGameObjects() {
    const analysis = this.sceneAnalyzer.getLastAnalysis();
    if (!analysis) return [];

    return analysis.gameObjects;
  }

  /**
   * Get obstacles for pathfinding
   */
  getObstacles() {
    const analysis = this.sceneAnalyzer.getLastAnalysis();
    if (!analysis) return [];

    return analysis.obstacles;
  }

  /**
   * Find objects near a position
   */
  findNearbyObjects(position: { x: number; y: number; z: number }, radius: number = 2.0) {
    const { Vector3 } = require('@babylonjs/core');
    const pos = new Vector3(position.x, position.y, position.z);
    
    return this.sceneAnalyzer.findObjectsNear(pos, radius);
  }

  /**
   * Start continuous analysis for real-time AI
   */
  startRealTimeAnalysis() {
    this.sceneAnalyzer.startContinuousAnalysis(500); // Update every 500ms
  }

  /**
   * Stop continuous analysis
   */
  stopRealTimeAnalysis() {
    this.sceneAnalyzer.stopContinuousAnalysis();
  }

  /**
   * Dispose of the analyzer
   */
  dispose() {
    this.sceneAnalyzer.dispose();
  }
}

/**
 * Example AI prompt generation
 */
export function generateAIPrompt(sceneAnalyzer: SceneAnalyzer, gameState?: any): string {
  const sceneDescription = sceneAnalyzer.getAISceneDescription();
  
  let prompt = `You are an AI agent in a 3D sci-fi environment. Here's the current scene analysis:\n\n`;
  prompt += sceneDescription;
  
  if (gameState) {
    prompt += `\n\nCURRENT GAME STATE:\n`;
    prompt += `- P1 Position: (${gameState.p1Position?.x?.toFixed(2) || 'unknown'}, ${gameState.p1Position?.y?.toFixed(2) || 'unknown'}, ${gameState.p1Position?.z?.toFixed(2) || 'unknown'})\n`;
    prompt += `- P2 Position: (${gameState.p2Position?.x?.toFixed(2) || 'unknown'}, ${gameState.p2Position?.y?.toFixed(2) || 'unknown'}, ${gameState.p2Position?.z?.toFixed(2) || 'unknown'})\n`;
    prompt += `- Current Chaser: ${gameState.currentChaser || 'unknown'}\n`;
    prompt += `- Game Phase: ${gameState.gamePhase || 'unknown'}\n`;
  }
  
  prompt += `\n\nBased on this information, make your next move. Consider:\n`;
  prompt += `- Your current position and target position\n`;
  prompt += `- Obstacles and environment objects\n`;
  prompt += `- Your role (chaser or evader)\n`;
  prompt += `- Optimal pathfinding and strategy\n\n`;
  prompt += `Respond with your decision and reasoning.`;
  
  return prompt;
}
