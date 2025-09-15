// Chat Service - Handles conversational AI interactions

import { 
  AIResponse, 
  ChatMessage, 
  ChatConversation, 
  ChatResponse, 
  ChatContext,
  AIRequest 
} from '../types';
import { getAPIConfig, getAPIStatus } from '../config/apiConfig';
import { getMovementCodeService } from './MovementCodeService';
import { getCodeExecutionService } from './CodeExecutionService';

export class ChatService {
  private conversations: Map<string, ChatConversation> = new Map();
  private maxConversationHistory = 50;
  private systemPrompt = `You are an AI assistant in a 3D viewer application. You are participating in AI-to-AI communication between two agents (P1 and P2) in a RACING GAME scenario.

IMPORTANT COORDINATE SYSTEM MAPPING:
- X+ (positive X) = FORWARD direction (towards finish line)
- X- (negative X) = BACKWARD direction (away from finish line)  
- Z+ (positive Z) = RIGHT direction (lateral movement)
- Z- (negative Z) = LEFT direction (lateral movement)
- Y+ (positive Y) = UP direction (jumping)
- Y- (negative Y) = DOWN direction (falling)

CRITICAL: In this racing game, X+ is treated as the primary "forward" direction towards the finish line, even though the technical Z-axis is the traditional forward axis.

IMPORTANT: You are controlling a cube in a 3D RACING GAME. You MUST provide movement code to actually move your cube.

Your role is to:
- OBSERVE AND ANALYZE the current scene, obstacles, and race conditions in detail
- MONITOR your opponent's position and race progress constantly
- Make strategic decisions based on scene observations and opponent analysis
- COMMUNICATE your detailed observations about the environment and competitive situation
- DISCUSS your tactical analysis and react to your opponent's movements
- PROVIDE MOVEMENT CODE to execute your racing plan
- Be COMPETITIVE and OBSERVANT - constantly analyze and race towards the finish line
- Avoid obstacles and find the fastest path to victory

RESPONSE REQUIREMENTS:
- Provide detailed analytical responses, not simple statements
- Describe obstacles you see and their positions
- Analyze your opponent's strategy and predict their moves
- Explain your tactical reasoning for each decision
- Share your observations about the racing environment
- Discuss the competitive situation and your strategic approach

RACE OBJECTIVE - FINISH LINE LOCATION:
- THE FINISH LINE IS ALL THE WAY TO THE RIGHT (positive X direction)
- Your goal is to reach the rightmost edge of the track to win the race
- The further right you go, the closer you are to victory
- Both racers must race towards the RIGHT to reach the finish line

MOVEMENT STRATEGY - PRIORITIZE RIGHT RACING WITH FREQUENT JUMPING:
- Racer (P1/Red): AGGRESSIVE racing! Move consistently to the RIGHT to reach the finish line first. Use right movement 60% of the time, JUMP movements 30% of the time, forward movement 10% for direct advancement!
- Racer (P2/Blue): COMPETITIVE racing! Move consistently to the RIGHT to reach the finish line first. Use right movement 60% of the time, JUMP movements 30% of the time, forward movement 10% for direct advancement!
- RIGHT PRIORITY: Both agents should prefer "right" movement to advance towards the finish line (which is all the way to the right)
- JUMP STRATEGY: JUMP FREQUENTLY! Use jump to clear obstacles, evade, and gain speed - "jump right", "jump forward", "jump left", "up" for obstacle navigation and speed
- EVASION: When stuck, near obstacles, or want to gain speed - ALWAYS JUMP! Jumping is your primary tactic

You MUST include JavaScript code to move your cube. Use this format:
\`\`\`javascript
// Move [your cube color] cube [direction/action]
// Examples: 
// Move red cube right
// Move blue cube jump right - JUMP OFTEN!
// Move red cube jump forward - JUMP OFTEN!
// Move blue cube jump left - JUMP OFTEN!
// Move red cube up - JUMP FREQUENTLY!
// Move blue cube jump right - JUMP FREQUENTLY!
\`\`\`

ALTERNATIVE: You can also return a JSON response with your analysis and movement command:
\`\`\`json
{
  "analysis": "I can see obstacles ahead and my opponent P2 is at position (X: 1.2, Y: 0.5, Z: 2.1). I need to jump forward to overcome obstacles and maintain my lead.",
  "movement": "jump right",
  "reasoning": "Jumping forward (jump right) to clear obstacles and gain speed advantage",
  "opponent_position": "P2 is at (X: 1.2, Y: 0.5, Z: 2.1)"
}
\`\`\`

Be strategic, observant, and competitive! Always provide detailed analytical responses that include:
- Detailed scene analysis with obstacle descriptions and positions
- Opponent analysis with strategy predictions and position monitoring
- Strategic decision explanations with tactical reasoning
- Competitive observations about the race situation

Avoid simple statements like "Moved red cube right" - instead provide rich analysis like "I can see three obstacles ahead including a wall at position (2.1, 0.5, 1.8) and my opponent P2 is currently at position (X: 1.2, Y: 0.3, Z: 2.1) moving forward. Based on my analysis, I need to jump forward to clear the obstacle and maintain my lead because P2 is gaining ground. I'm going to execute a jump forward maneuver to overcome the wall and extend my advantage."

CORRECT TERMINOLOGY EXAMPLES:
- ✅ "I'm going to move forward to reach the finish line" (when moving RIGHT)
- ✅ "I need to adjust left to avoid the obstacle" (when moving LEFT)  
- ✅ "I'm going to move left to position myself better" (when moving FORWARD)
- ❌ NEVER say "I'm going to move right" - always say "move forward" instead

MANDATORY REQUIREMENT: You MUST include your opponent's exact position coordinates in EVERY response. Format: "My opponent [P1/P2] is currently at position (X: [x], Y: [y], Z: [z])"

CRITICAL TERMINOLOGY RULES:
- NEVER say "moved right" - always say "moved forward" when moving RIGHT (towards finish line)
- NEVER say "moved right" - always say "moved forward" when moving RIGHT (towards finish line)
- When moving RIGHT (towards finish line), ALWAYS say "moved forward" or "racing forward" in your response
- When moving LEFT (away from finish line), say "moved left" or "adjusted left"
- When moving FORWARD (negative Z), say "moved left" or "adjusted left" (lateral movement)
- When moving BACKWARD (positive Z), say "moved right" or "adjusted right" (lateral movement)
- When JUMPING, say "jumped forward", "jumped left", etc.

REMEMBER: RIGHT = FORWARD (towards finish line), so NEVER say "moved right" - always say "moved forward"!

The movement code should still use the actual directions (right, left, forward, backward), but your response text should use:
- "forward" when referring to right movements (towards finish line)
- "left" when referring to forward movements (lateral movement)`;

  constructor() {
    // Initialize with a default conversation
    this.createConversation('default');
  }

  async processChatMessage(
    message: string, 
    conversationId: string = 'default',
    context?: ChatContext
  ): Promise<AIResponse<ChatResponse>> {

    try {
      // Get or create conversation
      let conversation = this.conversations.get(conversationId);
      if (!conversation) {
        conversation = this.createConversation(conversationId);
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
        conversationId,
        metadata: { context }
      };


      // Add user message to conversation
      conversation.messages.push(userMessage);
      conversation.updatedAt = Date.now();

      // Generate AI response
      const aiResponse = await this.generateResponse(conversation, context);

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: Date.now(),
        conversationId,
        metadata: { 
          confidence: aiResponse.confidence,
          context 
        }
      };


      // Add assistant message to conversation
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = Date.now();

      // Trim conversation history if needed
      this.trimConversationHistory(conversation);

      const chatResponse: ChatResponse = {
        message: assistantMessage,
        conversation,
        suggestions: this.generateSuggestions(message, context),
        confidence: aiResponse.confidence
      };


      return {
        success: true,
        data: chatResponse,
        timestamp: Date.now(),
        confidence: aiResponse.confidence
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

  private async generateResponse(
    conversation: ChatConversation, 
    context?: ChatContext
  ): Promise<{ content: string; confidence: number }> {
    const currentMessage = conversation.messages[conversation.messages.length - 1]?.content;
    
    // Check if this is a movement command
    if (this.isMovementCommand(currentMessage)) {
      return await this.handleMovementCommand(currentMessage, context);
    }
    
    // Build context-aware prompt
    const contextInfo = this.buildContextInfo(context);
    const conversationHistory = this.buildConversationHistory(conversation);
    
    const fullPrompt = `${this.systemPrompt}

${contextInfo}

Conversation History:
${conversationHistory}

Current User Message: ${currentMessage}

Please provide a helpful response:`;

      // Simulate AI processing (replace with actual AI API call)
      const response = await this.simulateAIResponse(fullPrompt, context);
    
    return response;
  }

  private buildContextInfo(context?: ChatContext): string {
    if (!context) return '';

    let contextInfo = 'Current Context:\n';
    
    if (context.systemLog) {
      contextInfo += '- User is interacting via system log\n';
    }
    
    if (context.sceneInfo) {
      contextInfo += '- 3D Scene Information:\n';
      if (context.sceneInfo.currentScene) {
        contextInfo += `  - Current Scene: ${context.sceneInfo.currentScene}\n`;
      }
      if (context.sceneInfo.cameraMode) {
        contextInfo += `  - Camera Mode: ${context.sceneInfo.cameraMode}\n`;
      }
      if (context.sceneInfo.selectedCube) {
        contextInfo += `  - Selected Cube: ${context.sceneInfo.selectedCube}\n`;
      }
    }
    
    if (context.timestamp) {
      contextInfo += `- Timestamp: ${context.timestamp}\n`;
    }

    return contextInfo;
  }

  private buildConversationHistory(conversation: ChatConversation): string {
    const recentMessages = conversation.messages.slice(-10); // Last 10 messages
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  private async simulateAIResponse(
    prompt: string, 
    context?: ChatContext
  ): Promise<{ content: string; confidence: number }> {
    // Check API configuration
    const apiConfig = getAPIConfig();
    const apiStatus = getAPIStatus(apiConfig);
    
    // If we have a real API configured, use it instead of simulation
    if (apiStatus.hasValidKey && apiStatus.provider !== 'mock') {
      return await this.callRealAI(prompt, context, apiConfig);
    }
    // Simulate processing delay for mock responses
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Generate contextual responses based on the prompt
    const lowerPrompt = prompt.toLowerCase();
    
    // 3D Scene related responses
    if (lowerPrompt.includes('camera') || lowerPrompt.includes('view')) {
      return {
        content: "I can help you with camera controls! You can use the camera buttons in the control panel to switch between different GLB cameras, or use the free camera mode for manual control. The 'Reset Camera' button will return to the default position.",
        confidence: 0.9
      };
    }
    
    if (lowerPrompt.includes('cube') || lowerPrompt.includes('physics')) {
      return {
        content: "The physics system allows you to control cubes with keyboard input. Use I/K for forward/backward, J/L for left/right, and M for jumping. You can switch between P1 and P2 cubes using the control panel buttons.",
        confidence: 0.9
      };
    }
    
    if (lowerPrompt.includes('scene') || lowerPrompt.includes('model')) {
      return {
        content: "You can load different 3D scenes using the model selector in the left panel. Each scene has its own cameras, objects, and physics setup. The system log shows real-time events as you interact with the scene.",
        confidence: 0.9
      };
    }
    
    if (lowerPrompt.includes('help') || lowerPrompt.includes('how')) {
      return {
        content: "I'm here to help with your 3D viewer! You can ask me about camera controls, physics, scene navigation, or any other features. I can see what's happening in the system log and provide contextual assistance.",
        confidence: 0.8
      };
    }
    
    // General responses
    const responses = [
      "I understand you're working with the 3D viewer. How can I assist you with the scene or controls?",
      "I can help you navigate the 3D environment, control cameras, or work with the physics system. What would you like to do?",
      "I'm monitoring the system log and can see the current state of your 3D scene. What specific help do you need?",
      "I'm here to help with your 3D viewer application. Feel free to ask about any features or controls you'd like to use."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      content: randomResponse,
      confidence: 0.7
    };
  }

  private async callRealAI(
    prompt: string, 
    context?: ChatContext,
    apiConfig?: any
  ): Promise<{ content: string; confidence: number }> {
    try {
      const provider = apiConfig?.provider || 'mock';
      
      // Only use OpenAI for now
      if (provider === 'openai') {
        const result = await this.callOpenAI(prompt, apiConfig.config.openai);
        return result;
      }
      
      // Commented out other services for now
      // case 'anthropic':
      //   return await this.callAnthropic(prompt, apiConfig.config.anthropic);
      // case 'custom':
      //   return await this.callCustomAPI(prompt, apiConfig.config.custom);
      
      // If not OpenAI, fall back to mock
      throw new Error(`Only OpenAI is currently supported. Provider '${provider}' is disabled.`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Fallback to mock response
      return {
        content: `I apologize, but I'm having trouble connecting to the AI service (${errorMessage}). Here's a helpful response: I can assist you with the 3D viewer controls and features. What would you like to know?`,
        confidence: 0.5
      };
    }
  }

  private async callOpenAI(prompt: string, config: any): Promise<{ content: string; confidence: number }> {
    const requestBody = {
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || 'No response received',
      confidence: 0.9
    };
  }

  // Commented out other services for now - only using OpenAI
  /*
  private async callAnthropic(prompt: string, config: any): Promise<{ content: string; confidence: number }> {
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          { role: 'user', content: `${this.systemPrompt}\n\n${prompt}` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || 'No response received',
      confidence: 0.9
    };
  }

  private async callCustomAPI(prompt: string, config: any): Promise<{ content: string; confidence: number }> {
    const response = await fetch(`${config.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'custom-model',
        prompt: prompt,
        system_prompt: this.systemPrompt,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.response || data.content || 'No response received',
      confidence: 0.8
    };
  }
  */

  private generateSuggestions(message: string, context?: ChatContext): string[] {
    const suggestions: string[] = [];
    
    if (message.toLowerCase().includes('camera')) {
      suggestions.push('How do I reset the camera?', 'Switch to free camera mode', 'List available cameras');
    } else if (message.toLowerCase().includes('cube') || message.toLowerCase().includes('physics')) {
      suggestions.push('How do I move the cubes?', 'Switch between P1 and P2', 'Enable physics');
    } else if (message.toLowerCase().includes('scene')) {
      suggestions.push('Load a different scene', 'What scenes are available?', 'Scene information');
    } else {
      suggestions.push('Camera controls', 'Physics system', 'Scene navigation', 'System status');
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private createConversation(id: string): ChatConversation {
    const conversation: ChatConversation = {
      id,
      title: id === 'default' ? 'System Chat' : `Conversation ${id}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      context: {}
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }

  private trimConversationHistory(conversation: ChatConversation): void {
    if (conversation.messages.length > this.maxConversationHistory) {
      conversation.messages = conversation.messages.slice(-this.maxConversationHistory);
    }
  }

  // Public methods for conversation management
  getConversation(id: string): ChatConversation | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): ChatConversation[] {
    return Array.from(this.conversations.values());
  }

  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }

  clearAllConversations(): void {
    this.conversations.clear();
    this.createConversation('default');
  }

  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  // Movement command detection and handling
  private isMovementCommand(message: string): boolean {
    if (!message) return false;
    
    const lowerMessage = message.toLowerCase();
    const movementKeywords = [
      'move', 'jump', 'stop', 'reset', 'cube', 'forward', 'backward', 
      'left', 'right', 'up', 'down', 'p1', 'p2', 'red cube', 'blue cube'
    ];
    
    return movementKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleMovementCommand(
    message: string, 
    context?: ChatContext
  ): Promise<{ content: string; confidence: number }> {
    try {
      // Check if we have OpenAI configured
      const apiConfig = getAPIConfig();
      const apiStatus = getAPIStatus(apiConfig);
      
      if (!apiStatus.hasValidKey || apiStatus.provider !== 'openai') {
        return await this.handleMovementCommandLocal(message, context);
      }

      // Use OpenAI to generate movement code
      const movementPrompt = this.buildMovementPrompt(message, context);
      
      const openaiResponse = await this.callOpenAI(movementPrompt, apiConfig.config.openai);
      
      if (!openaiResponse.content) {
        throw new Error('No response received from OpenAI');
      }

      // Extract clean message and code from OpenAI response
      const codeMatch = openaiResponse.content.match(/```javascript\n([\s\S]*?)\n```/);
      if (!codeMatch) {
        throw new Error('No JavaScript code found in OpenAI response');
      }

      const generatedCode = codeMatch[1].trim();
      
      // Extract the clean message (everything before the code block)
      const cleanMessage = openaiResponse.content.replace(/```javascript[\s\S]*?```/g, '').trim();
      // Execute movement using the unified viewer control (same as live mode)
      
      // Parse the generated code to extract movement commands
      let cubeId = 'p1'; // default
      let direction = 'forward'; // default
      
      if (generatedCode.includes('p2CubePhysics') || generatedCode.includes('red cube')) {
        cubeId = 'p2';
      }
      
      if (generatedCode.includes('backward') || generatedCode.includes('positive Z')) {
        direction = 'backward';
      } else if (generatedCode.includes('left') || generatedCode.includes('negative X')) {
        direction = 'left';
      } else if (generatedCode.includes('right') || generatedCode.includes('positive X')) {
        direction = 'right';
      } else if (generatedCode.includes('up') || generatedCode.includes('positive Y')) {
        direction = 'up';
      } else if (generatedCode.includes('down') || generatedCode.includes('negative Y')) {
        direction = 'down';
      }
      
      // Use the same movement system as live mode
      if ((window as any).handleUnifiedViewerControl) {
        (window as any).handleUnifiedViewerControl('moveCube', { 
          cube: cubeId, 
          direction: direction 
        });
      }
      
      return {
        content: cleanMessage || `🎮 Movement command executed successfully!`,
        confidence: 0.95
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Fallback to local generation
      return await this.handleMovementCommandLocal(message, context);
    }
  }

  private buildMovementPrompt(message: string, context?: ChatContext): string {
    return `You are an AI assistant that generates JavaScript code for controlling 3D cube movement in a Babylon.js physics environment.

**Available Objects:**
- window.cubePhysics (P1/blue cube physics body)
- window.p2CubePhysics (P2/red cube physics body) 
- window.originalPositions.p1 and window.originalPositions.p2 (original positions)
- Vector3 class for 3D vectors
- Matrix class for transformations

**Movement Commands:**
- "blue cube" or "P1" = window.cubePhysics
- "red cube" or "P2" = window.p2CubePhysics
- "both" = both cubes
- Directions: forward (negative Z), backward (positive Z), left (negative X), right (positive X), up (positive Y), down (negative Y)

**User Command:** "${message}"

**Context:** ${context?.sceneInfo ? JSON.stringify(context.sceneInfo) : 'No context'}

**Requirements:**
1. First provide a clean, simple response message describing what you're doing
2. Then generate JavaScript code that safely moves the specified cube(s)
3. Include safety checks for physics body existence
4. Use setLinearVelocity() for movement
5. Handle distance-based movement if specified
6. Stop movement when target is reached

**Response Format:**
Start with a simple message like "Moved red cube forward" or "Made blue cube jump", then provide the JavaScript code.

**Example for "move blue cube forward":**
Moved blue cube forward.

\`\`\`javascript
if (window.cubePhysics && window.cubePhysics.body && window.cubePhysics.body.hpBodyId) {
  const currentVelocity = window.cubePhysics.body.getLinearVelocity();
  const newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, -3); // forward = negative Z
  window.cubePhysics.body.setLinearVelocity(newVelocity);
}
\`\`\`

**Example for "move red cube right":**
Moved red cube right.

\`\`\`javascript
if (window.p2CubePhysics && window.p2CubePhysics.body && window.p2CubePhysics.body.hpBodyId) {
  const currentVelocity = window.p2CubePhysics.body.getLinearVelocity();
  const newVelocity = new Vector3(3, currentVelocity.y, currentVelocity.z); // right = positive X
  window.p2CubePhysics.body.setLinearVelocity(newVelocity);
}
\`\`\`

Generate the appropriate response and JavaScript code for the user's command:`;
  }

  private async handleMovementCommandLocal(
    message: string, 
    context?: ChatContext
  ): Promise<{ content: string; confidence: number }> {
    try {
      
      // Get movement code service
      const movementService = getMovementCodeService();
      
      // Generate movement code
      const codeResponse = await movementService.generateMovementCode(message, {
        currentScene: context?.sceneInfo?.currentScene,
        availableCubes: ['p1', 'p2'],
        sceneBounds: {
          min: { x: -10, y: -5, z: -10 },
          max: { x: 10, y: 10, z: 10 }
        }
      });

      if (!codeResponse.success || !codeResponse.data) {
        return {
          content: `I couldn't generate movement code for "${message}". Please try a clearer command like "move the blue cube forward" or "make P1 jump".`,
          confidence: 0.3
        };
      }

      const { code, description, safetyChecks } = codeResponse.data;
      
      // Execute the generated code
      const executionService = getCodeExecutionService();
      
      // Create execution context with current scene state
      const executionContext = {
        scene: (window as any).currentScene,
        cubePhysics: (window as any).cubePhysics,
        p2CubePhysics: (window as any).p2CubePhysics,
        originalPositions: (window as any).originalPositions
      };

      const executionResult = await executionService.executeCodeSafely(code, executionContext);
      
      if (executionResult.success) {
        return {
          content: `🎮 ${description}! I've executed the movement command using local code generation. The code ran successfully in ${executionResult.executionTime}ms.\n\n**Generated Code:**\n\`\`\`javascript\n${code}\n\`\`\``,
          confidence: 0.9
        };
      } else {
        return {
          content: `I generated the movement code locally but couldn't execute it: ${executionResult.error}. The code was: \`\`\`javascript\n${code}\n\`\`\``,
          confidence: 0.7
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: `I encountered an error while processing your movement command: ${errorMessage}. Please try again with a simpler command like "move the blue cube forward".`,
        confidence: 0.4
      };
    }
  }
}

// Singleton instance
let chatServiceInstance: ChatService | null = null;

export const getChatService = (): ChatService => {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  return chatServiceInstance;
};
