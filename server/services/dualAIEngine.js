// Dual AI Engine - Manages P1 and P2 AI agents
import { generateAndSaveRealAIResponse } from './realAIService.js';

export class DualAIEngine {
  constructor() {
    this.isRunning = false;
    this.messageCount = 0;
    this.intervalId = null;
    this.intervalMs = 5000; // 5 seconds between AI messages
    this.maxMessages = 100; // Maximum messages per session
  }

  // Start the dual AI system
  start() {
    if (this.isRunning) {
      console.log('⚠️ Dual AI Engine is already running');
      return;
    }

    console.log('🚀 Starting Dual AI Engine...');
    this.isRunning = true;
    this.messageCount = 0;

    // Start the AI message loop
    this.intervalId = setInterval(() => {
      this.processAICycle();
    }, this.intervalMs);

    console.log(`✅ Dual AI Engine started - generating messages every ${this.intervalMs}ms`);
  }

  // Stop the dual AI system
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Dual AI Engine is not running');
      return;
    }

    console.log('⏹️ Stopping Dual AI Engine...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Dual AI Engine stopped');
  }

  // Process one AI cycle (both P1 and P2)
  async processAICycle() {
    if (!this.isRunning) {
      return;
    }

    this.messageCount++;
    
    // Check if we've reached the maximum messages
    if (this.messageCount > this.maxMessages) {
      console.log(`🏁 Reached maximum messages (${this.maxMessages}), stopping AI engine`);
      this.stop();
      return;
    }

    console.log(`\n🔄 AI Cycle #${this.messageCount} starting...`);

    try {
      // Generate AI responses for both agents in parallel
      const [p1Result, p2Result] = await Promise.allSettled([
        generateAndSaveRealAIResponse('p1', this.messageCount),
        generateAndSaveRealAIResponse('p2', this.messageCount)
      ]);

      // Log results
      if (p1Result.status === 'fulfilled') {
        console.log(`✅ P1 response #${this.messageCount} completed`);
      } else {
        console.error(`❌ P1 response #${this.messageCount} failed:`, p1Result.reason);
      }

      if (p2Result.status === 'fulfilled') {
        console.log(`✅ P2 response #${this.messageCount} completed`);
      } else {
        console.error(`❌ P2 response #${this.messageCount} failed:`, p2Result.reason);
      }

    } catch (error) {
      console.error(`❌ AI Cycle #${this.messageCount} failed:`, error);
    }

    console.log(`🔄 AI Cycle #${this.messageCount} completed\n`);
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      messageCount: this.messageCount,
      intervalMs: this.intervalMs,
      maxMessages: this.maxMessages,
      nextMessageIn: this.isRunning ? this.intervalMs : 0
    };
  }

  // Update configuration
  updateConfig(config) {
    if (config.intervalMs && config.intervalMs > 0) {
      this.intervalMs = config.intervalMs;
      console.log(`⚙️ Updated AI interval to ${this.intervalMs}ms`);
    }

    if (config.maxMessages && config.maxMessages > 0) {
      this.maxMessages = config.maxMessages;
      console.log(`⚙️ Updated max messages to ${this.maxMessages}`);
    }
  }
}
