# Global Economic Wars - Project Documentation

## Overview
A browser-based multiplayer board game inspired by property trading games (Monopoly-style) but with unique mechanics centered around countries and global economics. Players compete as global investors to build economic empires.

## Project Structure
```
Online Monopoly/
├── index.html              # Entry point, loads PeerJS CDN and modules
├── claude.md               # This documentation file
├── css/
│   └── styles.css          # Complete styling (~1500 lines, dark diplomatic theme)
└── js/
    ├── gameData.js         # Board configuration, cards, alliances, constants
    ├── gameEngine.js       # Core game logic, state management, rules
    ├── ui.js               # UI rendering, event handling, animations
    ├── soundManager.js     # Web Audio API sound effects
    └── network.js          # PeerJS WebRTC multiplayer (NEEDS WORK)
```

## How to Run Locally
```bash
# Any HTTP server works (ES modules require server, not file://)
python -m http.server 8080
# Then open http://localhost:8080
```

## Game Mechanics

### Victory Conditions
1. **Influence Victory**: First to reach 1000 Influence Points
2. **Last Standing**: Be the last solvent player

### Board Layout (40 spaces, clockwise)
- **Corners**: Global Summit (GO), Trade Sanctions (Jail), Free Trade Zone, International Incident
- **Countries**: 23 countries across 8 alliances
- **Other**: 4 transports, 2 infrastructure, 2 taxes, 5 card spaces

### Alliances & Their Bonuses
| Alliance | Countries | Completion Bonus |
|----------|-----------|------------------|
| EASTERN | Moldova, Armenia, Ukraine | +50 influence/turn |
| AFRICAN_RISING | Nigeria, Kenya, Egypt | $250 tourism income/turn |
| SOUTH_ASIAN | India, Bangladesh, Sri Lanka, Nepal | +$200 on all rent collected |
| BRICS | South Africa, China, Brazil | +100 influence per rent payment |
| EU | France, Germany, UK | Double rent on developed properties |
| ASIAN_TIGERS | Japan, South Korea, Singapore | Tech Hub costs -50% |
| OIL_NATIONS | Saudi Arabia, UAE | $300 oil royalties/turn |
| AMERICAS | Canada, USA | Free development upgrade/round |

### Development Tiers (replaces houses/hotels)
1. **Local Markets** (🏪) - Cost: 50% of price, 2x rent
2. **Factories** (🏭) - Cost: 75% of price, 3x rent
3. **Tech Hubs** (🏙️) - Cost: 100% of price, 5x rent
4. **Economic Capital** (🏛️) - Cost: 150% of price, 8x rent (max 1 per alliance)

### Resources
Countries produce: oil 🛢️, tech 💻, agriculture 🌾, tourism ✈️
- Owning diverse resources grants +5% rent per unique type

### Special Mechanics
- **Influence Actions**: Spend influence for Trade Embargo (200), Summit Meeting (150), Dev Grant (100)
- **Card Decks**: Global News (world events) and Diplomatic Cables (personal events)
- **Trade Sanctions**: Like jail - roll doubles, pay $500, or use Diplomatic Immunity card

### Key Constants (in gameData.js)
- Starting Money: $15,000
- GO Salary: $2,000 + bonuses
- Sanctions Bail: $500
- Influence to Win: 1,000

## Recent Changes (Latest First)

### v0.3 - Bug Fixes (Current)
- **Fixed dice rolling bug**: Dice animation no longer gets stuck after 2nd turn
  - Added comprehensive logging for debugging turn transitions
  - Improved animation flag management
  - Added error handling around engine calls
- **Fixed flag emoji display**: Country flags now display properly on Windows
  - Flag emojis were showing as letter codes (e.g., "IN" instead of 🇮🇳)
  - Added `getFlagHtml()` function that uses flagcdn.com images as fallback
  - Flags now use actual PNG images from CDN for cross-platform compatibility
- **UI improvements**:
  - Player tokens increased to 24px with pulse animation
  - Flags increased to 22px with drop-shadow
  - Dice display always visible and larger (52px)

### v0.2 - Debug Tools
- Added comprehensive debug console commands
- `window.enableDebug()` enables debug mode
- Debug commands: giveMoney, giveProperty, giveInfluence, moveTo, etc.

### v0.1 - Initial Release
- Complete game implementation with all mechanics
- Local hot-seat multiplayer
- PeerJS online multiplayer (unreliable)

## Known Issues & TODO

### CRITICAL: Multiplayer Not Working
**Problem**: PeerJS WebRTC connections fail in many scenarios:
- Same browser tabs (localhost testing)
- Different networks (NAT/firewall issues)
- GitHub Pages deployment

**Root Cause**:
- WebRTC requires both peers to exchange ICE candidates via signaling server
- PeerJS public server is unreliable
- No TURN server fallback for relaying when direct connection fails
- Same-origin tabs may have issues with peer discovery

**Solution Needed**: Replace PeerJS with WebSocket server:
1. Create Node.js/Express + Socket.io backend
2. Host on Render.com (free tier) or similar
3. Server acts as message relay, no peer-to-peer needed
4. 100% reliable connections

### Testing Multiplayer Locally
Current workaround for local testing:
1. Use two different browsers (Chrome + Firefox)
2. Or use Chrome + Chrome Incognito (different sessions)
3. Open DevTools console (F12) to see connection logs

### Other TODOs
- [ ] Implement proper WebSocket multiplayer backend
- [ ] Add turn timer option
- [ ] Spectator mode
- [ ] Reconnection handling (player disconnect/rejoin)
- [ ] Mobile responsive improvements
- [ ] Add more card variety
- [ ] Auction system when player declines to buy

## File Details

### gameData.js
- `ALLIANCES` - Alliance definitions with colors and bonuses
- `RESOURCES` - Resource types and their effects
- `DEVELOPMENT_TIERS` - Building upgrade levels
- `BOARD` - Array of 40 space objects
- `GLOBAL_NEWS_CARDS` - 18 world event cards
- `DIPLOMATIC_CABLE_CARDS` - 18 personal event cards
- Constants: STARTING_MONEY, GO_SALARY, etc.

### gameEngine.js
- `createGameState(playerNames)` - Factory to create initial state
- `GameEngine` class:
  - State management and event emission
  - `rollDiceAction()` - Handle dice roll
  - `movePlayer()` / `movePlayerTo()` - Movement logic
  - `handleLanding()` - Process landing on spaces
  - `calculateRent()` - Rent with all bonuses
  - `buyProperty()` / `developProperty()` - Property management
  - `proposeTrade()` / `acceptTrade()` - Trading system
  - `useInfluenceAction()` - Influence powers
  - `checkWinCondition()` - Victory detection

### ui.js
- `initApp()` - Entry point, initializes state
- `render()` - Main render dispatcher
- `renderLobby()` / `renderGame()` - Screen renderers
- `renderBoard()` - 11x11 CSS grid board
- `renderPlayerCard()` - Player info panels
- `renderActionPanel()` - Context-sensitive actions
- `attachGameEvents()` - Event listener setup
- `handleRollDice()` - Dice animation + engine call (with detailed logging)
- `getFlagHtml()` - Converts flag emoji to image for cross-platform display
- Debug tools at bottom (window.enableDebug(), window.debug.*)

### network.js (NEEDS REPLACEMENT)
- `NetworkManager` class
- Uses PeerJS for WebRTC
- Host creates room with 5-char code
- Clients connect via room code
- Currently unreliable - needs WebSocket replacement

### soundManager.js
- `SoundManager` class using Web Audio API
- Generates tones procedurally (no audio files needed)
- Methods: playDiceRoll, playPurchase, playRentPaid, playVictory, etc.

## Architecture Notes

### State Flow
```
User Action → UI Handler → GameEngine method → State Update → emit() → render()
```

### Board Coordinate System
- 11x11 CSS Grid
- `getSpacePosition(id)` converts space ID (0-39) to {row, col}
- Clockwise: Bottom (0-10) → Left (11-20) → Top (21-30) → Right (31-39)
- Grid positions are 1-indexed in CSS

### Rendering
- Full re-render on state change (simple but works)
- Template literals for HTML generation
- Event listeners re-attached after each render

## Deployment Notes

### Static Hosting (Current - Local Game Only)
Works on: GitHub Pages, Netlify, Vercel, any static host
- Local multiplayer (hot-seat) works fine
- Online multiplayer unreliable due to WebRTC issues

### With Backend Server (TODO)
For reliable online multiplayer:
1. Deploy static files to Netlify/GitHub Pages
2. Deploy WebSocket server to Render.com
3. Update network.js to use WebSocket instead of PeerJS
4. Configure CORS properly

## Testing & Debug Mode

### Testing Multiplayer Locally
PeerJS doesn't work well with same-browser tabs. Use one of these:
1. **Two different browsers**: Chrome + Firefox
2. **Chrome + Incognito**: Normal window + Incognito window (Ctrl+Shift+N)
3. **Just test locally**: Use hot-seat mode (all players on same device)

### Debug Console Commands
Open browser DevTools (F12), go to Console tab, then:

```javascript
// Enable debug mode first
window.enableDebug()

// Available commands:
window.debug.giveMoney(5000)              // Give current player $5000
window.debug.giveProperty(14)             // Give property (India is id 14)
window.debug.giveInfluence(500)           // Give 500 influence
window.debug.moveTo(10)                   // Move to Trade Sanctions
window.debug.completeAlliance('EASTERN')  // Give all Eastern Partnership countries
window.debug.drawCard('globalNews')       // Draw a Global News card
window.debug.bankruptPlayer(1)            // Bankrupt player at index 1
window.debug.simulateTurn()               // Roll dice and move
window.debug.forceEndTurn()               // Force end current turn
window.debug.skipToPlayer(2)              // Skip to player index 2
window.debug.getState()                   // View full game state
window.debug.listSpaces()                 // List all 40 board spaces
window.debug.listAlliances()              // List all alliances
```

### Key Space IDs for Testing
- 0: Global Summit (GO)
- 3: Armenia (featured)
- 10: Trade Sanctions (Jail)
- 14: India (featured)
- 20: Free Trade Zone
- 30: International Incident
- 39: USA (most expensive)

## Quick Reference

### Starting a Local Game
1. Open http://localhost:8080
2. Set number of players (2-8)
3. Enter names (or leave blank for defaults)
4. Click "Start Game"
5. Players take turns on same device

### Game Controls
- **Space/Enter**: Roll dice or End Turn
- **Click board spaces**: View details
- **Save button**: Saves to localStorage
- **Load button**: Appears if save exists

## Future Enhancements
- WebSocket multiplayer server
- Mobile-optimized layout
- Sound volume controls
- Game replay/history
- Custom rules options
- AI opponents
