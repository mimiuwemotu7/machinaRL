export { database } from './config';
export { 
  writeAIResponse, 
  listenForAIResponses, 
  markResponseAsProcessed, 
  saveMeshPositions,
  fetchMeshPositions,
  listenForMeshPositions,
  tryBecomeMasterClient,
  updateMasterHeartbeat,
  getMasterClientInfo,
  forceBecomeMasterClient,
  type AIResponse,
  type MeshPosition,
  type MeshPositions,
  type MasterClientInfo
} from './aiService';

// Re-export Firebase functions for convenience
export { ref, onValue, off, set, get, push, DataSnapshot } from 'firebase/database';
