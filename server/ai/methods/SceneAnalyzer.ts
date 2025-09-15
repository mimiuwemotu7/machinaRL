import { Scene, AbstractMesh, Vector3 } from '@babylonjs/core';

export interface SceneMeshData {
  id: string;
  name: string;
  position: Vector3;
  rotation: Vector3;
  scaling: Vector3;
  isVisible: boolean;
  isEnabled: boolean;
  type: string;
  boundingBox?: {
    minimum: Vector3;
    maximum: Vector3;
  };
}

export interface SceneAnalysis {
  totalMeshes: number;
  gameObjects: SceneMeshData[];
  environmentObjects: SceneMeshData[];
  obstacles: SceneMeshData[];
  interactiveElements: SceneMeshData[];
  spatialMap: {
    [key: string]: SceneMeshData[];
  };
  sceneBounds: {
    min: Vector3;
    max: Vector3;
  };
  analysisTimestamp: number;
}

export class SceneAnalyzer {
  private scene: Scene | null = null;
  private lastAnalysis: SceneAnalysis | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(scene?: Scene) {
    if (scene) {
      this.setScene(scene);
    }
  }

  /**
   * Set the Babylon scene to analyze
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.performAnalysis();
  }

  /**
   * Perform a complete scene analysis
   */
  performAnalysis(): SceneAnalysis | null {
    if (!this.scene) {
      console.warn('SceneAnalyzer: No scene set for analysis');
      return null;
    }

    console.log('🔍 SceneAnalyzer: Starting scene analysis...');

    // Get all meshes from the scene
    const allMeshes = this.scene.meshes.filter(mesh => 
      mesh && 
      mesh.name && 
      mesh.name !== '__root__' && 
      !mesh.name.startsWith('__') &&
      !mesh.name.includes('Skybox') &&
      !mesh.name.includes('skybox')
    );

    // Convert to SceneMeshData format
    const meshData: SceneMeshData[] = allMeshes.map(mesh => {
      const position = mesh.getAbsolutePosition();
      const rotation = mesh.rotation;
      const scaling = mesh.scaling;
      const boundingBox = mesh.getBoundingInfo()?.boundingBox;

      return {
        id: mesh.id,
        name: mesh.name,
        position: position.clone(),
        rotation: rotation.clone(),
        scaling: scaling.clone(),
        isVisible: mesh.isVisible,
        isEnabled: mesh.isEnabled(),
        type: mesh.getClassName(),
        boundingBox: boundingBox ? {
          minimum: boundingBox.minimum.clone(),
          maximum: boundingBox.maximum.clone()
        } : undefined
      };
    });

    // Categorize meshes
    const gameObjects = meshData.filter(mesh => 
      mesh.name.includes('p1') || 
      mesh.name.includes('p2') || 
      mesh.name.includes('cube')
    );

    const environmentObjects = meshData.filter(mesh => 
      mesh.name.includes('wall') || 
      mesh.name.includes('room') || 
      mesh.name.includes('floor') ||
      mesh.name.includes('ceiling')
    );

    const obstacles = meshData.filter(mesh => 
      mesh.name.includes('box') || 
      mesh.name.includes('blocker') ||
      mesh.name.includes('gun') ||
      mesh.name.includes('pipe') ||
      mesh.name.includes('distributor') ||
      mesh.name.includes('capsule')
    );

    const interactiveElements = meshData.filter(mesh => 
      mesh.name.includes('screen') || 
      mesh.name.includes('decoration')
    );

    // Create spatial map (grid-based)
    const spatialMap = this.createSpatialMap(meshData);

    // Calculate scene bounds
    const sceneBounds = this.calculateSceneBounds(meshData);

    const analysis: SceneAnalysis = {
      totalMeshes: meshData.length,
      gameObjects,
      environmentObjects,
      obstacles,
      interactiveElements,
      spatialMap,
      sceneBounds,
      analysisTimestamp: Date.now()
    };

    this.lastAnalysis = analysis;

    console.log('✅ SceneAnalyzer: Analysis complete', {
      totalMeshes: analysis.totalMeshes,
      gameObjects: analysis.gameObjects.length,
      environmentObjects: analysis.environmentObjects.length,
      obstacles: analysis.obstacles.length,
      interactiveElements: analysis.interactiveElements.length
    });

    return analysis;
  }

  /**
   * Get the last analysis result
   */
  getLastAnalysis(): SceneAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * Start continuous analysis
   */
  startContinuousAnalysis(intervalMs: number = 1000): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, intervalMs);

    console.log(`🔄 SceneAnalyzer: Started continuous analysis (${intervalMs}ms interval)`);
  }

  /**
   * Stop continuous analysis
   */
  stopContinuousAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('⏹️ SceneAnalyzer: Stopped continuous analysis');
    }
  }

  /**
   * Get AI-friendly scene description
   */
  getAISceneDescription(): string {
    if (!this.lastAnalysis) {
      return 'No scene analysis available';
    }

    const analysis = this.lastAnalysis;
    
    let description = `SCENE ANALYSIS (${new Date(analysis.analysisTimestamp).toLocaleTimeString()}):\n\n`;
    
    description += `TOTAL OBJECTS: ${analysis.totalMeshes}\n\n`;
    
    description += `GAME OBJECTS (${analysis.gameObjects.length}):\n`;
    analysis.gameObjects.forEach(obj => {
      description += `- ${obj.name}: Position(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)}) ${obj.isEnabled ? 'ENABLED' : 'DISABLED'}\n`;
    });
    
    description += `\nENVIRONMENT OBJECTS (${analysis.environmentObjects.length}):\n`;
    analysis.environmentObjects.forEach(obj => {
      description += `- ${obj.name}: Position(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})\n`;
    });
    
    description += `\nOBSTACLES (${analysis.obstacles.length}):\n`;
    analysis.obstacles.forEach(obj => {
      description += `- ${obj.name}: Position(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})\n`;
    });
    
    description += `\nSCENE BOUNDS:\n`;
    description += `- Min: (${analysis.sceneBounds.min.x.toFixed(2)}, ${analysis.sceneBounds.min.y.toFixed(2)}, ${analysis.sceneBounds.min.z.toFixed(2)})\n`;
    description += `- Max: (${analysis.sceneBounds.max.x.toFixed(2)}, ${analysis.sceneBounds.max.y.toFixed(2)}, ${analysis.sceneBounds.max.z.toFixed(2)})\n`;

    return description;
  }

  /**
   * Find objects near a position
   */
  findObjectsNear(position: Vector3, radius: number): SceneMeshData[] {
    if (!this.lastAnalysis) return [];

    return this.lastAnalysis.gameObjects
      .concat(this.lastAnalysis.obstacles)
      .concat(this.lastAnalysis.environmentObjects)
      .filter(obj => {
        const distance = Vector3.Distance(position, obj.position);
        return distance <= radius;
      });
  }

  /**
   * Get pathfinding obstacles
   */
  getPathfindingObstacles(): SceneMeshData[] {
    if (!this.lastAnalysis) return [];

    return this.lastAnalysis.obstacles
      .concat(this.lastAnalysis.environmentObjects)
      .filter(obj => obj.isEnabled && obj.isVisible);
  }

  /**
   * Create spatial map for efficient queries
   */
  private createSpatialMap(meshes: SceneMeshData[]): { [key: string]: SceneMeshData[] } {
    const gridSize = 2.0; // 2-unit grid cells
    const spatialMap: { [key: string]: SceneMeshData[] } = {};

    meshes.forEach(mesh => {
      const gridX = Math.floor(mesh.position.x / gridSize);
      const gridZ = Math.floor(mesh.position.z / gridSize);
      const key = `${gridX},${gridZ}`;

      if (!spatialMap[key]) {
        spatialMap[key] = [];
      }
      spatialMap[key].push(mesh);
    });

    return spatialMap;
  }

  /**
   * Calculate scene bounds
   */
  private calculateSceneBounds(meshes: SceneMeshData[]): { min: Vector3; max: Vector3 } {
    if (meshes.length === 0) {
      return {
        min: Vector3.Zero(),
        max: Vector3.Zero()
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    meshes.forEach(mesh => {
      minX = Math.min(minX, mesh.position.x);
      minY = Math.min(minY, mesh.position.y);
      minZ = Math.min(minZ, mesh.position.z);
      maxX = Math.max(maxX, mesh.position.x);
      maxY = Math.max(maxY, mesh.position.y);
      maxZ = Math.max(maxZ, mesh.position.z);
    });

    return {
      min: new Vector3(minX, minY, minZ),
      max: new Vector3(maxX, maxY, maxZ)
    };
  }

  /**
   * Dispose of the analyzer
   */
  dispose(): void {
    this.stopContinuousAnalysis();
    this.scene = null;
    this.lastAnalysis = null;
  }
}
