/// <reference types="react-scripts" />

// Global window properties for physics objects
declare global {
  interface Window {
    cubePhysics: any;
    p2CubePhysics: any;
    maintainP1Orientation: () => void;
    maintainP2Orientation: () => void;
  }
}