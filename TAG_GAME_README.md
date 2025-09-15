# 🎮 Tag Game Controller

A Python-based AI system that makes your p1 cube and p2 cube play tag in the 3D physics scene!

## 🚀 Quick Start

### 1. Start the Python Backend
```bash
python backend/app.py
```

### 2. Run the Tag Game
```bash
python tag_game.py
```

### 3. Test the System
```bash
python test_tag_game.py
```

## 🎯 How It Works

The tag game system consists of:

1. **Python Backend** (`backend/app.py`) - Provides API endpoints for controlling cubes
2. **Tag Game Controller** (`tag_game.py`) - AI logic that makes cubes play tag
3. **Test Suite** (`test_tag_game.py`) - Tests all functionality

## 🧠 AI Behavior

### Tag Rules
- **P1 cube starts as "IT"** (the chaser)
- **P2 cube starts as the runner** (trying to avoid being tagged)
- **Tag distance**: 2 meters
- **Game area**: 20x20 meter square (-10 to +10 on X and Z axes)

### AI Strategy
- **Chaser (IT)**: Moves toward the other cube with some randomness
- **Runner**: Moves away from the chaser to avoid being tagged
- **Boundary awareness**: Cubes stay within the game area
- **Smooth movement**: Gradual acceleration and deceleration

## 📡 API Endpoints

### Game Status
- `GET /api/tag-game/status` - Get current game state

### Cube Control
- `POST /api/tag-game/move-cube` - Move a cube to a position
- `POST /api/tag-game/apply-force` - Apply force to a cube
- `POST /api/tag-game/simulate-move` - Predict movement trajectory
- `POST /api/tag-game/check-collision` - Check if cubes would collide

## 🎮 Game Features

### Real-time Updates
- 60 FPS game loop
- Live position and velocity tracking
- Real-time tag detection
- Dynamic role switching

### Smart AI
- Pathfinding to targets
- Obstacle avoidance
- Boundary enforcement
- Realistic physics simulation

### Game Statistics
- Distance between cubes
- Current "IT" status
- Game duration
- Tag count

## 🔧 Customization

### Adjust Game Parameters
Edit `tag_game.py` to modify:
```python
self.tag_distance = 2.0      # Tag distance
self.max_speed = 8.0         # Maximum cube speed
self.boundary_limits = [-10, 10]  # Game area size
```

### Modify AI Behavior
Customize the AI logic in `calculate_ai_velocity()`:
```python
def calculate_ai_velocity(self, cube_name):
    # Add your custom AI logic here
    # Return velocity vector [x, y, z]
```

### Add New Game Modes
Extend the system with:
- Multiple players
- Different game types (hide & seek, capture the flag)
- Power-ups and special abilities
- Team-based gameplay

## 🐛 Troubleshooting

### Backend Won't Start
- Check if Python 3.7+ is installed
- Install dependencies: `pip install -r backend/requirements.txt`
- Ensure port 5000 is available

### Game Not Running
- Verify backend is running on `http://localhost:5000`
- Check console for error messages
- Test with `python test_tag_game.py`

### Cubes Not Moving
- Ensure physics backend is connected
- Check API responses in console
- Verify cube names are correct ('p1' or 'p2')

## 🚀 Advanced Usage

### Integration with 3D Scene
To connect with your actual 3D scene, modify the API endpoints to:
1. Read real cube positions from Babylon.js
2. Send movement commands to the physics engine
3. Update cube transforms in real-time

### Real-time Physics
The system can be enhanced to:
- Use actual physics forces instead of position setting
- Implement realistic collision detection
- Add gravity and friction effects
- Support different cube masses and shapes

### Multiplayer Support
Extend for multiple players:
- Network synchronization
- Player authentication
- Score tracking
- Spectator mode

## 📊 Performance

- **Frame Rate**: 60 FPS target
- **Update Frequency**: Cube positions updated every 10 frames
- **Memory Usage**: Minimal (stores only game state)
- **Network**: HTTP API calls every 100ms

## 🎉 Have Fun!

The tag game system demonstrates how Python can control 3D physics objects in real-time. Use it as a foundation for more complex AI behaviors, game mechanics, or educational physics demonstrations!

---

**Happy tagging! 🏃‍♂️🏃‍♀️**
