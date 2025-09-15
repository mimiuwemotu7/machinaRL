// AI Service for server-side AI processing
import { database } from '../config/firebase.js';
import { ref, push, set } from 'firebase/database';

// Mock AI responses for now - we'll integrate your real AI system later
const generateMockAIResponse = (agentId, messageNumber) => {
  const responses = {
    p1: [
      "I can see the finish line ahead! I'm going to take a strategic approach and move forward carefully, avoiding any obstacles.",
      "The race is heating up! I notice P2 is gaining ground. Time to accelerate and show my racing skills!",
      "Perfect positioning! I'm going to make a calculated move to the right to gain an advantage.",
      "I can feel the momentum building! This is my moment to shine in this 3D racing environment."
    ],
    p2: [
      "Interesting strategy from P1! I'm going to counter with my own tactical approach and move forward with precision.",
      "The competition is fierce! I'm analyzing the scene and planning my next move to overtake.",
      "I see an opportunity here! Time to make a bold move and show what I'm capable of.",
      "This is getting exciting! I'm going to use my analytical skills to find the optimal path to victory."
    ]
  };

  const agentResponses = responses[agentId] || responses.p1;
  const responseIndex = messageNumber % agentResponses.length;
  
  return {
    success: true,
    data: {
      message: {
        id: `msg_${agentId}_${Date.now()}`,
        role: 'assistant',
        content: agentResponses[responseIndex],
        timestamp: Date.now(),
        conversationId: `conv_${agentId}`,
        metadata: {
          agentId,
          messageNumber,
          sceneData: {
            timestamp: Date.now(),
            raceProgress: Math.random() * 100
          }
        }
      },
      conversation: {
        id: `conv_${agentId}`,
        title: `AI Racing Conversation - ${agentId.toUpperCase()}`,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        context: {
          agentId,
          gameMode: 'racing',
          sceneType: '3d-viewer'
        }
      },
      suggestions: [
        "Move forward",
        "Analyze opponent",
        "Plan strategy"
      ],
      confidence: 0.85 + Math.random() * 0.15
    },
    error: null,
    timestamp: Date.now(),
    model: 'mock-ai-v1',
    confidence: 0.85 + Math.random() * 0.15,
    processed: false,
    agentId
  };
};

// Write AI response to Firebase
export const writeAIResponse = async (response) => {
  try {
    const responseRef = ref(database, 'aiResponses');
    const newResponseRef = await push(responseRef, response);
    console.log(`✅ [${response.agentId}] AI response written to Firebase:`, newResponseRef.key);
    return newResponseRef.key;
  } catch (error) {
    console.error(`❌ [${response.agentId}] Failed to write AI response:`, error);
    throw error;
  }
};

// Generate and save AI response
export const generateAndSaveAIResponse = async (agentId, messageNumber) => {
  try {
    console.log(`🤖 [${agentId.toUpperCase()}] Generating AI response #${messageNumber}...`);
    
    // Generate AI response (mock for now)
    const aiResponse = generateMockAIResponse(agentId, messageNumber);
    
    // Write to Firebase
    const responseId = await writeAIResponse(aiResponse);
    
    console.log(`✅ [${agentId.toUpperCase()}] AI response #${messageNumber} completed and saved`);
    return { success: true, responseId, response: aiResponse };
    
  } catch (error) {
    console.error(`❌ [${agentId.toUpperCase()}] AI response generation failed:`, error);
    return { success: false, error: error.message };
  }
};

// Mark response as processed
export const markResponseAsProcessed = async (responseId) => {
  try {
    const responseRef = ref(database, `aiResponses/${responseId}/processed`);
    await set(responseRef, true);
    console.log(`✅ Marked response ${responseId} as processed`);
  } catch (error) {
    console.error(`❌ Failed to mark response ${responseId} as processed:`, error);
    throw error;
  }
};
