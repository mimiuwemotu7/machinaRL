import React, { useState } from 'react';
import { getMovementCodeService } from '../ai/services/MovementCodeService';
import { getCodeExecutionService } from '../ai/services/CodeExecutionService';

interface MovementTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MovementTestPanel: React.FC<MovementTestPanelProps> = ({ isOpen, onClose }) => {
  const [testCommand, setTestCommand] = useState('move the red cube forward');
  const [generatedCode, setGeneratedCode] = useState('');
  const [executionResult, setExecutionResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testMovementCommand = async () => {
    if (!testCommand.trim()) return;

    setIsLoading(true);
    setGeneratedCode('');
    setExecutionResult('');

    try {
      // Generate movement code
      const movementService = getMovementCodeService();
      const codeResponse = await movementService.generateMovementCode(testCommand);

      if (codeResponse.success && codeResponse.data) {
        setGeneratedCode(codeResponse.data.code);
        
        // Execute the code
        const executionService = getCodeExecutionService();
        const executionContext = {
          scene: (window as any).currentScene,
          cubePhysics: (window as any).cubePhysics,
          p2CubePhysics: (window as any).p2CubePhysics,
          originalPositions: (window as any).originalPositions
        };

        const result = await executionService.executeCodeSafely(codeResponse.data.code, executionContext);
        
        if (result.success) {
          setExecutionResult(`✅ Code executed successfully in ${result.executionTime}ms`);
        } else {
          setExecutionResult(`❌ Execution failed: ${result.error}`);
        }
      } else {
        setExecutionResult(`❌ Code generation failed: ${codeResponse.error}`);
      }
    } catch (error) {
      setExecutionResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exampleCommands = [
    'move the blue cube forward',
    'make P1 jump',
    'move both cubes left',
    'stop the red cube',
    'reset P1 to original position',
    'blue cube 2 cm',
    'move P1 5 units forward',
    'red cube 1 meter left',
    'blue cube 0.5 meters right',
    'both cubes 2 meters forward'
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.95)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #4CAF50',
      minWidth: '500px',
      maxWidth: '80vw',
      maxHeight: '80vh',
      overflow: 'auto',
      fontFamily: 'monospace',
      zIndex: 2000
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#4CAF50' }}>🎮 AI Movement Test Panel</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#FFC107' }}>
          Test Command:
        </label>
        <input
          type="text"
          value={testCommand}
          onChange={(e) => setTestCommand(e.target.value)}
          placeholder="e.g., move the red cube forward"
          style={{
            width: '100%',
            padding: '8px',
            background: '#333',
            border: '1px solid #666',
            color: 'white',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#FFC107' }}>
          Example Commands:
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {exampleCommands.map((cmd, index) => (
            <button
              key={index}
              onClick={() => setTestCommand(cmd)}
              style={{
                background: '#333',
                border: '1px solid #666',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={testMovementCommand}
        disabled={isLoading || !testCommand.trim()}
        style={{
          width: '100%',
          padding: '12px',
          background: isLoading ? '#666' : '#4CAF50',
          border: 'none',
          color: 'white',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        {isLoading ? '⏳ Testing...' : '🚀 Test Movement Command'}
      </button>

      {generatedCode && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#FFC107' }}>
            Generated Code:
          </label>
          <pre style={{
            background: '#222',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #666',
            maxHeight: '200px'
          }}>
            {generatedCode}
          </pre>
        </div>
      )}

      {executionResult && (
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#FFC107' }}>
            Execution Result:
          </label>
          <div style={{
            background: '#222',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #666',
            fontSize: '14px'
          }}>
            {executionResult}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        <p>💡 <strong>Tips:</strong></p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Use "blue cube" or "P1" for the first cube</li>
          <li>Use "red cube" or "P2" for the second cube</li>
          <li>Use "both" to control both cubes</li>
          <li>Commands: move, jump, stop, reset</li>
          <li>Directions: forward, backward, left, right, up, down</li>
          <li>Distance: "2 cm", "0.5 meters", "1 meter", "5 units"</li>
          <li>Examples: "blue cube 2 cm", "red cube 1 meter right", "P1 0.5 meters forward"</li>
        </ul>
      </div>
    </div>
  );
};

export default MovementTestPanel;
