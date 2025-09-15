import React, { useEffect, useRef } from 'react';
import { Vector3 } from '@babylonjs/core';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';

interface MovementProps {
  cubePhysics: PhysicsAggregate | null;
  p2CubePhysics: PhysicsAggregate | null;
  selectedCube: 'p1' | 'p2';
  camMode: 'glb' | 'free';
  freeCam: any;
  freeSpeed: number;
}

const Movement: React.FC<MovementProps> = ({
  cubePhysics,
  p2CubePhysics,
  selectedCube,
  camMode,
  freeCam,
  freeSpeed
}) => {
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Handle keyboard input for free camera and cube movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if event and event.key exist
      if (!event || !event.key) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Don't interfere if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }
      
      // Prevent default for movement keys to avoid browser shortcuts
      if (['i', 'k', 'j', 'l', 'm', 'w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        event.preventDefault();
      }
      
      if (camMode === 'free') {
        // Free camera keys
        if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
          keysPressedRef.current.add(key);
        }
      } else {
        // Cube movement keys
        if (['i', 'k', 'j', 'l', 'm'].includes(key)) {
          keysPressedRef.current.add(key);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Check if event and event.key exist
      if (!event || !event.key) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Don't interfere if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
        return;
      }
      
      keysPressedRef.current.delete(key);
    };

    // Add event listeners with capture to ensure we get the events
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [camMode]);


  // Free camera movement
  useEffect(() => {
    if (!freeCam || camMode !== 'free') return;

    const moveCamera = () => {
      const speed = freeSpeed;
      const right = freeCam.getDirection(Vector3.Right());
      const forward = freeCam.getDirection(Vector3.Forward());
      const up = Vector3.Up();

      if (keysPressedRef.current.has('w')) {
        freeCam.position.addInPlace(forward.scale(speed));
      }
      if (keysPressedRef.current.has('s')) {
        freeCam.position.addInPlace(forward.scale(-speed));
      }
      if (keysPressedRef.current.has('a')) {
        freeCam.position.addInPlace(right.scale(-speed));
      }
      if (keysPressedRef.current.has('d')) {
        freeCam.position.addInPlace(right.scale(speed));
      }
      if (keysPressedRef.current.has('q')) {
        freeCam.position.addInPlace(up.scale(-speed));
      }
      if (keysPressedRef.current.has('e')) {
        freeCam.position.addInPlace(up.scale(speed));
      }
    };

    const interval = setInterval(moveCamera, 16); // ~60fps
    return () => clearInterval(interval);
  }, [freeCam, freeSpeed, camMode]);

  // Cube movement
  useEffect(() => {
    if (camMode === 'free') return; // Only move cubes when not in free camera mode

    const moveCube = () => {
      const activePhysics = selectedCube === 'p1' ? cubePhysics : p2CubePhysics;
      if (!activePhysics || !activePhysics.body) return;
      
      try {
        const moveSpeed = 3;
        const currentVelocity = activePhysics.body.getLinearVelocity();
        let newVelocity = new Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);
        
        // Apply movement based on currently pressed keys
        if (keysPressedRef.current.has('i')) {
          newVelocity.z = -moveSpeed;
        }
        if (keysPressedRef.current.has('k')) {
          newVelocity.z = moveSpeed;
        }
        if (keysPressedRef.current.has('j')) {
          newVelocity.x = -moveSpeed;
        }
        if (keysPressedRef.current.has('l')) {
          newVelocity.x = moveSpeed;
        }
        
        // Handle jumping (M key) - only if not already jumping
        if (keysPressedRef.current.has('m')) {
          // Only jump if the cube is close to the ground (Y velocity is small)
          if (Math.abs(currentVelocity.y) < 0.5) {
            newVelocity.y = 5; // Jump velocity
          }
        }
        
        // If no movement keys are pressed, gradually slow down horizontal movement
        if (!keysPressedRef.current.has('i') && !keysPressedRef.current.has('k') && !keysPressedRef.current.has('j') && !keysPressedRef.current.has('l')) {
          newVelocity.x *= 0.9; // Gradually reduce X velocity
          newVelocity.z *= 0.9; // Gradually reduce Z velocity
        }
        
        // Update velocity
        activePhysics.body.setLinearVelocity(newVelocity);
      } catch (error) {
        // Physics body was disposed or is invalid, skip this update
        return;
      }
    };

    const interval = setInterval(moveCube, 16); // ~60fps
    return () => clearInterval(interval);
  }, [cubePhysics, p2CubePhysics, selectedCube, camMode]);

  // This component doesn't render anything, it just handles movement logic
  return null;
};

export default Movement;
