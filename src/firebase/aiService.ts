import { database } from './config';
import { ref, push, onValue, off, DataSnapshot, set, get } from 'firebase/database';

// Types for our AI response data - matching the existing AI system structure
export interface AIResponse {
  id?: string;
  success: boolean;
  data?: {
    message: {
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: number;
      conversationId: string;
      metadata?: Record<string, any>;
    };
    conversation: {
      id: string;
      userId?: string;
      title: string;
      messages: any[];
      createdAt: number;
      updatedAt: number;
      context?: Record<string, any>;
    };
    suggestions?: string[];
    confidence: number;
  };
  error?: string;
  timestamp: number;
  model?: string;
  confidence?: number;
  processed: boolean;
  agentId?: 'p1' | 'p2' | 'system';
}

// Write AI response to Firebase
export const writeAIResponse = async (response: Omit<AIResponse, 'id' | 'timestamp'>): Promise<string> => {
  const responseRef = ref(database, 'aiResponses');
  const newResponse: AIResponse = {
    ...response,
    timestamp: Date.now(),
  };
  
  const newResponseRef = await push(responseRef, newResponse);
  return newResponseRef.key || '';
};

// Listen for new AI responses
export const listenForAIResponses = (
  callback: (responses: AIResponse[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const responsesRef = ref(database, 'aiResponses');
  
  const handleData = (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    if (data) {
      const responses: AIResponse[] = Object.entries(data).map(([key, value]) => ({
        id: key,
        ...(value as Omit<AIResponse, 'id'>)
      }));
      callback(responses);
    } else {
      callback([]);
    }
  };

  const handleError = (error: Error) => {
    console.error('Firebase listener error:', error);
    onError?.(error);
  };

  onValue(responsesRef, handleData, { onlyOnce: false });
  
  // Return cleanup function
  return () => {
    off(responsesRef, 'value', handleData);
  };
};

// Mark a response as processed
export const markResponseAsProcessed = async (responseId: string): Promise<void> => {
  const responseRef = ref(database, `aiResponses/${responseId}/processed`);
  await set(responseRef, true);
  console.log(`✅ Marked response ${responseId} as processed`);
};

// Mesh position types
export interface MeshPosition {
  meshId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  timestamp: number;
}

export interface MeshPositions {
  [meshId: string]: MeshPosition;
}

// Save mesh positions to Firebase
export const saveMeshPositions = async (positions: MeshPositions): Promise<void> => {
  const positionsRef = ref(database, 'meshPositions');
  await set(positionsRef, positions);
  console.log(`✅ Saved mesh positions to Firebase:`, Object.keys(positions).length, 'meshes');
};

// Fetch latest mesh positions from Firebase
export const fetchMeshPositions = async (): Promise<MeshPositions | null> => {
  const positionsRef = ref(database, 'meshPositions');
  const snapshot = await get(positionsRef);
  
  if (snapshot.exists()) {
    const positions = snapshot.val();
    console.log(`✅ Fetched mesh positions from Firebase:`, Object.keys(positions).length, 'meshes');
    return positions;
  } else {
    console.log(`⚠️ No mesh positions found in Firebase`);
    return null;
  }
};

// Listen for mesh position changes
export const listenForMeshPositions = (
  callback: (positions: MeshPositions | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const positionsRef = ref(database, 'meshPositions');
  
  const handleData = (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      const positions = snapshot.val();
      callback(positions);
    } else {
      callback(null);
    }
  };

  const handleError = (error: Error) => {
    console.error('Firebase mesh positions listener error:', error);
    onError?.(error);
  };

  onValue(positionsRef, handleData, { onlyOnce: false });
  
  // Return cleanup function
  return () => {
    off(positionsRef, 'value', handleData);
  };
};

// Master client management
export interface MasterClientInfo {
  clientId: string;
  timestamp: number;
  isActive: boolean;
}

// Try to become the master client (atomic operation) - Admin only
export const tryBecomeMasterClient = async (clientId: string, isAdmin: boolean = false): Promise<boolean> => {
  console.log(`🔍 [tryBecomeMasterClient] Starting for client: ${clientId}, isAdmin: ${isAdmin}`);
  
  // Only admin clients can become master
  if (!isAdmin) {
    console.log(`🚫 [${clientId}] Non-admin client cannot become master - admin mode required`);
    return false;
  }
  
  const masterRef = ref(database, 'masterClient');
  const clientInfo: MasterClientInfo = {
    clientId,
    timestamp: Date.now(),
    isActive: true
  };

  try {
    console.log(`🔍 [tryBecomeMasterClient] Checking current master...`);
    const currentMaster = await get(masterRef);
    
    if (!currentMaster.exists()) {
      // No master exists, try to become master
      console.log(`🔍 [tryBecomeMasterClient] No master exists, attempting to become master...`);
      await set(masterRef, clientInfo);
      console.log(`👑 [${clientId}] Successfully became master client (Admin)`);
      return true;
    } else {
      const masterData = currentMaster.val() as MasterClientInfo;
      console.log(`🔍 [tryBecomeMasterClient] Current master: ${masterData.clientId}, timestamp: ${masterData.timestamp}`);
      
      const timeSinceLastUpdate = Date.now() - masterData.timestamp;
      console.log(`🔍 [tryBecomeMasterClient] Time since last update: ${timeSinceLastUpdate}ms`);
      
      if (timeSinceLastUpdate > 30000) {
        // Master is stale, take over
        console.log(`🔍 [tryBecomeMasterClient] Master is stale, taking over...`);
        await set(masterRef, clientInfo);
        console.log(`👑 [${clientId}] Took over from stale master client (Admin)`);
        return true;
      } else {
        // Master is still active
        console.log(`📖 [${clientId}] Master client is active: ${masterData.clientId}`);
        return false;
      }
    }
  } catch (error) {
    console.error('Error trying to become master client:', error);
    return false;
  }
};

// Update master client heartbeat
export const updateMasterHeartbeat = async (clientId: string): Promise<void> => {
  const masterRef = ref(database, 'masterClient');
  const clientInfo: MasterClientInfo = {
    clientId,
    timestamp: Date.now(),
    isActive: true
  };
  
  try {
    await set(masterRef, clientInfo);
  } catch (error) {
    console.error('Error updating master heartbeat:', error);
  }
};

// Get current master client info
export const getMasterClientInfo = async (): Promise<MasterClientInfo | null> => {
  const masterRef = ref(database, 'masterClient');
  try {
    const snapshot = await get(masterRef);
    if (snapshot.exists()) {
      return snapshot.val() as MasterClientInfo;
    }
    return null;
  } catch (error) {
    console.error('Error getting master client info:', error);
    return null;
  }
};

// Force become master client (overrides any existing master) - Admin only
export const forceBecomeMasterClient = async (clientId: string, isAdmin: boolean = false): Promise<boolean> => {
  console.log(`🔍 [forceBecomeMasterClient] Forcing client ${clientId} to become master, isAdmin: ${isAdmin}`);
  
  // Only admin clients can force master status
  if (!isAdmin) {
    console.log(`🚫 [${clientId}] Non-admin client cannot force master - admin mode required`);
    return false;
  }
  
  const masterRef = ref(database, 'masterClient');
  const clientInfo: MasterClientInfo = {
    clientId,
    timestamp: Date.now(),
    isActive: true
  };

  try {
    console.log(`🔍 [forceBecomeMasterClient] Writing to Firebase:`, clientInfo);
    await set(masterRef, clientInfo);
    console.log(`👑 [${clientId}] Successfully FORCED to become master client (Admin) - Database updated`);
    return true;
  } catch (error) {
    console.error('Error forcing to become master client:', error);
    return false;
  }
};
