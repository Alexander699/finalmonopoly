// ============================================================
// GLOBAL ECONOMIC WARS - UI Renderer
// ============================================================

import { BOARD, ALLIANCES, DEVELOPMENT_TIERS, PLAYER_COLORS, PLAYER_AVATARS,
         STARTING_MONEY, GO_SALARY, SANCTIONS_BAIL, INFLUENCE_TO_WIN, MAX_PLAYERS, MIN_PLAYERS } from './gameData.js';
import { GameEngine, createGameState } from './gameEngine.js';
import { SoundManager } from './soundManager.js';
import { NetworkManager } from './network.js';

// ---- App State ----
let engine = null;
let sound = new SoundManager();
let network = null;
let localPlayerId = null;
let debugMode = false; // Set to true via console: window.enableDebug()
let selectedTradePartner = null;
let tradeOffer = { giveMoney: 0, getMoney: 0, giveProperties: [], getProperties: [] };
let showPropertyPanel = false;
let showTradePanel = false;
let showLogPanel = false;
let showChatPanel = false;
let chatMessages = [];
let chatInput = '';
let animatingDice = false;
let diceValues = [1, 1];
let diceAnimationTimer = null;
let lastTurnKey = null;
let showCardModal = false;
let currentCardDisplay = null;
let appScreen = 'lobby'; // lobby, game, gameover
let lobbyPlayers = [];
let lobbyRoomCode = '';
let lobbyPlayerName = '';
let lobbyIsHost = false;
let lobbyError = '';
let selectedPropertyForDev = null;

// ---- Board Layout Helpers ----
// Board is 11x11 grid. Spaces go clockwise:
// Bottom row: 0(BR corner) to 10(BL corner) - left to right visually reversed
// Left column: 11 to 20(TL corner) - bottom to top
// Top row: 21 to 30(TR corner) - left to right
// Right column: 31 to 39 - top to bottom

function getSpacePosition(id) {
  if (id <= 10) {
    // Bottom row: right to left (0=bottom-right, 10=bottom-left)
    return { row: 10, col: 10 - id };
  } else if (id <= 19) {
    // Left column: bottom to top (11=row9, 19=row1)
    return { row: 10 - (id - 10), col: 0 };
  } else if (id === 20) {
    return { row: 0, col: 0 }; // Top-left corner
  } else if (id <= 30) {
    // Top row: left to right (21=col1, 30=col10)
    return { row: 0, col: id - 20 };
  } else {
    // Right column: top to bottom (31=row1, 39=row9)
    return { row: id - 30, col: 10 };
  }
}

// ---- Render Functions ----

export function initApp() {
  // Initialize lobby with 2 players by default
  if (lobbyPlayers.length === 0) {
    lobbyPlayers = ['', ''];
  }
  render();

  // Handle window resize
  window.addEventListener('resize', () => render());

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (appScreen !== 'game' || !engine) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const player = engine.getCurrentPlayer();
      if (player.id === localPlayerId) {
        if (engine.state.phase === 'pre-roll') handleRollDice();
        else if (engine.state.phase === 'end-turn') handleEndTurn();
      }
    }
  });
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  switch (appScreen) {
    case 'lobby':
      app.innerHTML = renderLobby();
      attachLobbyEvents();
      break;
    case 'game':
      app.innerHTML = renderGame();
      attachGameEvents();
      break;
    case 'gameover':
      app.innerHTML = renderGameOver();
      attachGameOverEvents();
      break;
  }
}

// ============================================================
// LOBBY SCREEN
// ============================================================

function renderLobby() {
  return `
    <div class="lobby-screen">
      <div class="lobby-bg"></div>
      <div class="lobby-container">
        <div class="lobby-header">
          <h1 class="lobby-title">
            <span class="title-icon">🌍</span>
            Global Economic Wars
            <span class="title-icon">💰</span>
          </h1>
          <p class="lobby-subtitle">Build Your Economic Empire Across Nations</p>
        </div>

        <div class="lobby-panels">
          <!-- Local Game Panel -->
          <div class="lobby-panel">
            <h2>🎮 Local Game</h2>
            <p class="panel-desc">Play on this device with friends</p>

            <div class="player-setup">
              <div class="player-count-selector">
                <label>Number of Players:</label>
                <div class="count-btns">
                  ${[2,3,4,5,6,7,8].map(n => `
                    <button class="count-btn ${lobbyPlayers.length === n ? 'active' : ''}" data-count="${n}">${n}</button>
                  `).join('')}
                </div>
              </div>

              <div class="player-names-list">
                ${(lobbyPlayers.length === 0 ? Array(2).fill('') : lobbyPlayers).map((name, i) => `
                  <div class="player-name-row">
                    <span class="player-color-dot" style="background:${PLAYER_COLORS[i]}"></span>
                    <span class="player-avatar-pick">${PLAYER_AVATARS[i]}</span>
                    <input type="text" class="player-name-input" data-index="${i}"
                           value="${name}" placeholder="Player ${i + 1}" maxlength="16" />
                  </div>
                `).join('')}
              </div>

              <button class="btn btn-primary btn-lg start-local-btn">
                🚀 Start Game
              </button>
            </div>
          </div>

          <!-- Online Panel -->
          <div class="lobby-panel">
            <h2>🌐 Online Game</h2>
            <p class="panel-desc">Play with friends over the internet</p>

            <div class="online-setup">
              <div class="online-section">
                <h3>Host a Game</h3>
                <input type="text" class="input-field host-name-input"
                       placeholder="Your name" maxlength="16" value="${lobbyPlayerName}" />
                <button class="btn btn-success host-btn">
                  📡 Create Room
                </button>
              </div>

              <div class="divider"><span>OR</span></div>

              <div class="online-section">
                <h3>Join a Game</h3>
                <input type="text" class="input-field join-name-input"
                       placeholder="Your name" maxlength="16" />
                <input type="text" class="input-field join-code-input"
                       placeholder="Room Code" maxlength="6" style="text-transform:uppercase" />
                <button class="btn btn-info join-btn">
                  🔗 Join Room
                </button>
              </div>

              ${lobbyRoomCode ? `
                <div class="room-code-display">
                  <p>Room Code:</p>
                  <div class="room-code">${lobbyRoomCode}</div>
                  <p class="waiting-text">Waiting for players... (${lobbyPlayers.length}/${MAX_PLAYERS})</p>
                  <div class="lobby-players-list">
                    ${lobbyPlayers.map((p, i) => `
                      <div class="lobby-player-chip" style="border-color:${PLAYER_COLORS[i]}">
                        ${PLAYER_AVATARS[i]} ${p}
                      </div>
                    `).join('')}
                  </div>
                  ${lobbyIsHost ? `
                    <button class="btn btn-primary btn-lg start-online-btn" ${lobbyPlayers.length < 2 ? 'disabled' : ''}>
                      🚀 Start Game
                    </button>
                  ` : '<p class="waiting-text">Waiting for host to start...</p>'}
                </div>
              ` : ''}

              ${lobbyError ? `<div class="lobby-error">${lobbyError}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="lobby-footer">
          <div class="game-rules-preview">
            <h3>How to Win</h3>
            <div class="rules-grid">
              <div class="rule-item">
                <span class="rule-icon">🏆</span>
                <span>Reach ${INFLUENCE_TO_WIN} Influence Points</span>
              </div>
              <div class="rule-item">
                <span class="rule-icon">💰</span>
                <span>Be the last player standing</span>
              </div>
              <div class="rule-item">
                <span class="rule-icon">🤝</span>
                <span>Form Trade Alliances for bonuses</span>
              </div>
              <div class="rule-item">
                <span class="rule-icon">🏗️</span>
                <span>Develop countries through 4 tiers</span>
              </div>
            </div>
          </div>
          ${localStorage.getItem('globalEconWars_save') ? `
            <div style="margin-top:12px;text-align:center;">
              <button class="btn btn-warning load-game-btn">💾 Load Saved Game</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function attachLobbyEvents() {
  // Load saved game
  const loadBtn = document.querySelector('.load-game-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      handleLoadGame();
    });
  }

  // Player count buttons
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count);
      lobbyPlayers = Array(count).fill('').map((_, i) => lobbyPlayers[i] || '');
      render();
    });
  });

  // Player name inputs
  document.querySelectorAll('.player-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(input.dataset.index);
      if (lobbyPlayers.length === 0) lobbyPlayers = ['', ''];
      lobbyPlayers[idx] = e.target.value;
    });
  });

  // Start local game
  const startBtn = document.querySelector('.start-local-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (lobbyPlayers.length === 0) lobbyPlayers = ['', ''];
      const names = lobbyPlayers.map((n, i) => n.trim() || `Player ${i + 1}`);
      if (names.length < 2) return;
      startLocalGame(names);
    });
  }

  // Host game
  const hostBtn = document.querySelector('.host-btn');
  if (hostBtn) {
    hostBtn.addEventListener('click', () => {
      const nameInput = document.querySelector('.host-name-input');
      const name = nameInput?.value.trim() || 'Host';
      hostOnlineGame(name);
    });
  }

  // Join game
  const joinBtn = document.querySelector('.join-btn');
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      const name = document.querySelector('.join-name-input')?.value.trim() || 'Player';
      const code = document.querySelector('.join-code-input')?.value.trim().toUpperCase() || '';
      if (!code) { lobbyError = 'Please enter a room code'; render(); return; }
      joinOnlineGame(name, code);
    });
  }

  // Start online game
  const startOnlineBtn = document.querySelector('.start-online-btn');
  if (startOnlineBtn) {
    startOnlineBtn.addEventListener('click', () => {
      if (network && lobbyIsHost) {
        network.startGame();
      }
    });
  }

  // Initialize player list if empty
  if (lobbyPlayers.length === 0) {
    lobbyPlayers = ['', ''];
  }
}

function startLocalGame(names) {
  sound.init();
  const state = createGameState(names);
  engine = new GameEngine(state);
  localPlayerId = null; // Local mode = all players on same device

  engine.on(() => {
    syncDiceAnimationWithTurn();
    render();
  });
  engine.onAnimation((type, data) => handleAnimation(type, data));

  appScreen = 'game';
  sound.playClick();
  render();
}

function hostOnlineGame(name) {
  sound.init();
  network = new NetworkManager();
  lobbyPlayerName = name;
  lobbyIsHost = true;
  lobbyPlayers = [name];

  network.host(name, (event, data) => {
    switch (event) {
      case 'room-created':
        lobbyRoomCode = data.code;
        render();
        break;
      case 'player-joined':
        lobbyPlayers = data.players;
        render();
        break;
      case 'player-left':
        lobbyPlayers = data.players;
        render();
        break;
      case 'game-start':
        engine = new GameEngine(data.state);
        localPlayerId = data.localId;
        engine.on(() => {
          syncDiceAnimationWithTurn();
          render();
        });
        engine.onAnimation((type, d) => handleAnimation(type, d));
        appScreen = 'game';
        render();
        break;
      case 'state-update':
        if (engine) {
          engine.state = data.state;
          syncDiceAnimationWithTurn();
          render();
        }
        break;
      case 'chat':
        chatMessages.push(data);
        render();
        break;
      case 'error':
        lobbyError = data.message;
        render();
        break;
    }
  });
}

function joinOnlineGame(name, code) {
  sound.init();
  network = new NetworkManager();
  lobbyPlayerName = name;
  lobbyIsHost = false;

  network.join(name, code, (event, data) => {
    switch (event) {
      case 'joined':
        lobbyRoomCode = code;
        lobbyPlayers = data.players;
        render();
        break;
      case 'player-joined':
      case 'player-left':
        lobbyPlayers = data.players;
        render();
        break;
      case 'game-start':
        engine = new GameEngine(data.state);
        localPlayerId = data.localId;
        engine.on(() => {
          syncDiceAnimationWithTurn();
          render();
        });
        engine.onAnimation((type, d) => handleAnimation(type, d));
        appScreen = 'game';
        render();
        break;
      case 'state-update':
        if (engine) {
          engine.state = data.state;
          syncDiceAnimationWithTurn();
          render();
        }
        break;
      case 'chat':
        chatMessages.push(data);
        render();
        break;
      case 'error':
        lobbyError = data.message;
        render();
        break;
    }
  });
}

// ============================================================
// GAME SCREEN
// ============================================================

function renderGame() {
  if (!engine) return '<div>Loading...</div>';
  const state = engine.state;
  const currentPlayer = engine.getCurrentPlayer();
  const isMyTurn = !localPlayerId || currentPlayer.id === localPlayerId;

  return `
    <div class="game-screen">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="top-bar-left">
          <span class="game-title">🌍 Global Economic Wars</span>
          <span class="turn-info">Round ${state.roundNumber} · Turn ${state.turnNumber}</span>
        </div>
        <div class="top-bar-center">
          <div class="current-player-indicator" style="border-color:${currentPlayer.color}">
            <span>${currentPlayer.avatar} ${currentPlayer.name}'s Turn</span>
            ${currentPlayer.inSanctions ? '<span class="sanctions-badge">⛔ Sanctioned</span>' : ''}
          </div>
        </div>
        <div class="top-bar-right">
          <button class="icon-btn" id="btn-sound" title="Toggle Sound">${sound.enabled ? '🔊' : '🔇'}</button>
          <button class="icon-btn" id="btn-music" title="Toggle Music">${sound.musicEnabled ? '🎵' : '🎵'}</button>
          <button class="icon-btn" id="btn-log" title="Game Log">📋</button>
          <button class="icon-btn" id="btn-chat" title="Chat">💬</button>
          <button class="icon-btn" id="btn-save" title="Save Game">💾</button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="game-layout">
        <!-- Player Panel (Left) -->
        <div class="player-panel">
          ${state.players.map(p => renderPlayerCard(p, currentPlayer.id === p.id)).join('')}
        </div>

        <!-- Board (Center) -->
        <div class="board-container">
          ${renderBoard()}
        </div>

        <!-- Action Panel (Right) -->
        <div class="action-panel">
          ${renderActionPanel(currentPlayer, isMyTurn)}
        </div>
      </div>

      <!-- Modals -->
      ${showPropertyPanel ? renderPropertyPanel() : ''}
      ${showTradePanel ? renderTradePanel() : ''}
      ${showLogPanel ? renderLogPanel() : ''}
      ${showChatPanel ? renderChatPanel() : ''}
      ${showCardModal ? renderCardModal() : ''}
      ${state.gameOver ? renderGameOverOverlay() : ''}
    </div>
  `;
}

function renderPlayerCard(player, isCurrent) {
  const wealth = engine.calculateTotalWealth(player);
  const influencePercent = Math.min(100, (player.influence / INFLUENCE_TO_WIN) * 100);

  return `
    <div class="player-card ${isCurrent ? 'current' : ''} ${player.bankrupt ? 'bankrupt' : ''}"
         style="border-left: 4px solid ${player.color}">
      <div class="player-card-header">
        <span class="player-avatar-small" style="background:${player.color}">${player.avatar}</span>
        <div class="player-card-name">
          <span class="player-name">${player.name}</span>
          ${player.bankrupt ? '<span class="bankrupt-label">BANKRUPT</span>' : ''}
          ${player.inSanctions ? '<span class="sanctions-label">SANCTIONED</span>' : ''}
        </div>
      </div>
      <div class="player-card-stats">
        <div class="stat">
          <span class="stat-label">Cash</span>
          <span class="stat-value money">$${player.money.toLocaleString()}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Properties</span>
          <span class="stat-value">${player.properties.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Wealth</span>
          <span class="stat-value">$${wealth.toLocaleString()}</span>
        </div>
        <div class="stat influence-stat">
          <span class="stat-label">Influence</span>
          <span class="stat-value">${player.influence}/${INFLUENCE_TO_WIN}</span>
          <div class="influence-bar">
            <div class="influence-fill" style="width:${influencePercent}%;background:${player.color}"></div>
          </div>
        </div>
      </div>
      ${player.properties.length > 0 ? `
        <div class="player-properties-mini">
          ${player.properties.slice(0, 8).map(pid => {
            const s = engine.getSpace(pid);
            const a = ALLIANCES[s.alliance];
            const flagOrIcon = s.flag ? getFlagHtml(s.flag) : (s.icon || '');
            return `<span class="prop-dot" style="background:${a ? a.color : '#666'}" title="${s.name}">${flagOrIcon}</span>`;
          }).join('')}
          ${player.properties.length > 8 ? `<span class="prop-dot more">+${player.properties.length - 8}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function renderBoard() {
  const state = engine.state;
  let html = '<div class="board">';

  // Render center area
  html += '<div class="board-center">';
  html += '<div class="center-logo">🌍</div>';
  html += '<div class="center-title">GLOBAL<br>ECONOMIC<br>WARS</div>';
  html += '<div class="center-dice-area">';
  // Always show dice display (shows last values or initial 1,1)
  html += `<div class="dice-display ${animatingDice ? 'rolling' : ''}">`;
  html += `<div class="die">${getDiceFace(diceValues[0])}</div>`;
  html += `<div class="die">${getDiceFace(diceValues[1])}</div>`;
  html += `</div>`;
  html += '</div>';
  html += '</div>';

  // Render all 40 spaces
  for (let i = 0; i < 40; i++) {
    const space = state.board[i];
    const pos = getSpacePosition(i);
    const isCorner = [0, 10, 20, 30].includes(i);

    // Determine side for orientation
    let side;
    if (i <= 10) side = 'bottom';
    else if (i <= 20) side = 'left';
    else if (i <= 30) side = 'top';
    else side = 'right';

    // Players on this space
    const playersHere = state.players.filter(p => !p.bankrupt && p.position === i);

    // Alliance color
    const alliance = space.alliance ? ALLIANCES[space.alliance] : null;

    html += `<div class="space space-${side} ${isCorner ? 'corner' : ''} ${space.type}"
                  style="grid-row:${pos.row + 1};grid-column:${pos.col + 1};"
                  data-space-id="${i}">`;

    // Color bar for countries
    if (alliance) {
      html += `<div class="space-color-bar" style="background:${alliance.color}"></div>`;
    }

    // Space content
    if (isCorner) {
      html += renderCornerSpace(space);
    } else {
      html += renderRegularSpace(space, side);
    }

    // Ownership indicator
    if (space.owner) {
      const owner = engine.getPlayerById(space.owner);
      html += `<div class="owner-indicator" style="background:${owner.color}"></div>`;
    }

    // Development indicators
    if (space.developmentLevel > 0) {
      html += `<div class="dev-indicators">`;
      if (space.developmentLevel === 4) {
        html += `<span class="dev-capital">🏛️</span>`;
      } else {
        for (let d = 0; d < space.developmentLevel; d++) {
          html += `<span class="dev-pip">${DEVELOPMENT_TIERS[d + 1].icon}</span>`;
        }
      }
      html += `</div>`;
    }

    // Mortgage overlay
    if (space.mortgaged) {
      html += `<div class="mortgaged-overlay">M</div>`;
    }

    // Player tokens
    if (playersHere.length > 0) {
      html += `<div class="player-tokens">`;
      playersHere.forEach(p => {
        html += `<div class="player-token" style="background:${p.color}" title="${p.name}">${p.avatar}</div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  }

  html += '</div>';
  return html;
}

function renderCornerSpace(space) {
  return `
    <div class="corner-content">
      <div class="corner-icon">${space.icon}</div>
      <div class="corner-name">${space.name}</div>
    </div>
  `;
}

function renderRegularSpace(space, side) {
  let content = '';

  switch (space.type) {
    case 'country':
      content = `
        <div class="space-flag">${getFlagHtml(space.flag)}</div>
        <div class="space-name">${space.name}</div>
        <div class="space-price">${space.owner ? '' : '$' + space.price}</div>
      `;
      break;
    case 'transport':
      content = `
        <div class="space-icon">${space.icon}</div>
        <div class="space-name">${space.name}</div>
        <div class="space-price">${space.owner ? '' : '$' + space.price}</div>
      `;
      break;
    case 'infrastructure':
      content = `
        <div class="space-icon">${space.icon}</div>
        <div class="space-name">${space.name}</div>
        <div class="space-price">${space.owner ? '' : '$' + space.price}</div>
      `;
      break;
    case 'card':
      content = `
        <div class="space-icon">${space.icon}</div>
        <div class="space-name">${space.name}</div>
      `;
      break;
    case 'tax':
      content = `
        <div class="space-icon">${space.icon}</div>
        <div class="space-name">${space.name}</div>
        <div class="space-price">$${space.amount}</div>
      `;
      break;
    default:
      content = `
        <div class="space-icon">${space.icon || ''}</div>
        <div class="space-name">${space.name}</div>
      `;
  }

  return `<div class="space-inner">${content}</div>`;
}

function renderActionPanel(currentPlayer, isMyTurn) {
  const state = engine.state;
  const space = engine.getSpace(currentPlayer.position);

  let html = '<div class="action-content">';

  // Current space info
  html += `
    <div class="current-space-info">
      <h3>📍 ${space.name}</h3>
      ${space.type === 'country' ? `
        <div class="space-detail-card" style="border-color:${ALLIANCES[space.alliance]?.color || '#ccc'}">
          <div class="sdc-header" style="background:${ALLIANCES[space.alliance]?.color || '#ccc'}">
            <span>${getFlagHtml(space.flag)} ${space.name}</span>
            <span>${ALLIANCES[space.alliance]?.name || ''}</span>
          </div>
          <div class="sdc-body">
            <div class="sdc-row"><span>Price:</span><span>$${space.price}</span></div>
            <div class="sdc-row"><span>Base Rent:</span><span>$${space.rents[0]}</span></div>
            ${space.rents
              .slice(1, DEVELOPMENT_TIERS.length)
              .map((r, i) => {
                const tier = DEVELOPMENT_TIERS[i + 1];
                if (!tier) return '';
                return `<div class="sdc-row"><span>${tier.icon} ${tier.name}:</span><span>$${r}</span></div>`;
              }).join('')}
            <div class="sdc-row"><span>Resource:</span><span>${space.resource}</span></div>
            ${space.owner ? `
              <div class="sdc-row"><span>Owner:</span><span style="color:${engine.getPlayerById(space.owner)?.color}">${engine.getPlayerById(space.owner)?.name}</span></div>
              <div class="sdc-row"><span>Level:</span><span>${DEVELOPMENT_TIERS[space.developmentLevel]?.name || `Level ${space.developmentLevel}`}</span></div>
              <div class="sdc-row"><span>Current Rent:</span><span>$${engine.calculateRent(space.id, 7)}</span></div>
            ` : '<div class="sdc-unowned">UNOWNED</div>'}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Action buttons based on phase
  html += '<div class="action-buttons">';

  if (isMyTurn) {
    switch (state.phase) {
      case 'pre-roll':
        if (currentPlayer.inSanctions) {
          html += `
            <button class="btn btn-primary btn-lg" id="btn-roll">🎲 Roll for Doubles</button>
            <button class="btn btn-warning" id="btn-bail">💰 Pay Bail ($${SANCTIONS_BAIL})</button>
            ${currentPlayer.hasGetOutFree ? '<button class="btn btn-success" id="btn-immunity">📜 Use Diplomatic Immunity</button>' : ''}
          `;
        } else {
          html += `<button class="btn btn-primary btn-lg" id="btn-roll">🎲 Roll Dice</button>`;
        }
        break;

      case 'action':
        if (!space.owner && ['country', 'transport', 'infrastructure'].includes(space.type)) {
          html += `
            <button class="btn btn-success btn-lg" id="btn-buy" ${currentPlayer.money < space.price ? 'disabled' : ''}>
              🏷️ Buy ${space.name} ($${space.price})
            </button>
            <button class="btn btn-secondary" id="btn-decline">❌ Decline</button>
          `;
        }
        break;

      case 'end-turn':
        html += `<button class="btn btn-primary btn-lg" id="btn-end-turn">⏭️ End Turn</button>`;
        break;
    }
  } else {
    html += `<div class="waiting-msg">Waiting for ${currentPlayer.name}...</div>`;
  }

  html += '</div>';

  // Management buttons (always available on your turn)
  if (isMyTurn && currentPlayer.properties.length > 0) {
    html += `
      <div class="management-section">
        <h4>Management</h4>
        <button class="btn btn-sm btn-info" id="btn-properties">🏢 Properties</button>
        <button class="btn btn-sm btn-warning" id="btn-trade">🤝 Trade</button>
      </div>
    `;
  }

  // Influence actions
  if (isMyTurn && currentPlayer.influence >= 100) {
    html += `
      <div class="influence-section">
        <h4>⭐ Influence Actions</h4>
        ${currentPlayer.influence >= 200 ? `
          <button class="btn btn-sm btn-danger" id="btn-embargo">⛔ Trade Embargo (200 inf)</button>
        ` : ''}
        ${currentPlayer.influence >= 150 ? `
          <button class="btn btn-sm btn-success" id="btn-summit">🌐 Summit Meeting (150 inf)</button>
        ` : ''}
        ${currentPlayer.influence >= 100 ? `
          <button class="btn btn-sm btn-info" id="btn-dev-grant">🏗️ Dev Grant (100 inf)</button>
        ` : ''}
      </div>
    `;
  }

  // Always available
  html += `
    <div class="quick-actions">
      <button class="btn btn-sm btn-outline" id="btn-trade-open">🤝 Propose Trade</button>
      <button class="btn btn-sm btn-outline" id="btn-props-open">📊 View Properties</button>
    </div>
  `;

  // Mini log (last 5 entries)
  const recentLogs = state.log.slice(-5).reverse();
  if (recentLogs.length > 0) {
    html += `
      <div class="mini-log">
        <h4>Recent Activity</h4>
        ${recentLogs.map(l => `<div class="mini-log-entry log-${l.type}">${l.message}</div>`).join('')}
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// ---- Property Management Panel ----
function renderPropertyPanel() {
  const state = engine.state;
  const currentPlayer = engine.getCurrentPlayer();

  let html = `
    <div class="modal-overlay" id="property-modal-overlay">
      <div class="modal property-modal">
        <div class="modal-header">
          <h2>🏢 Property Management</h2>
          <button class="modal-close" id="close-props">&times;</button>
        </div>
        <div class="modal-body">
          <div class="property-tabs">
            <button class="prop-tab active" data-tab="mine">My Properties</button>
            <button class="prop-tab" data-tab="all">All Properties</button>
            <button class="prop-tab" data-tab="alliances">Alliances</button>
          </div>
          <div class="property-list">
  `;

  // My properties
  currentPlayer.properties.forEach(pid => {
    const space = engine.getSpace(pid);
    const alliance = ALLIANCES[space.alliance];
    const devCost = engine.getDevelopmentCost(pid);
    const canDevelop = devCost !== Infinity && currentPlayer.money >= devCost &&
                       engine.hasCompleteAlliance(currentPlayer.id, space.alliance);

    html += `
      <div class="property-item" style="border-left:4px solid ${alliance?.color || '#666'}">
        <div class="prop-info">
          <span class="prop-flag">${space.flag ? getFlagHtml(space.flag) : space.icon}</span>
          <div>
            <div class="prop-name">${space.name}</div>
            <div class="prop-alliance">${alliance?.name || space.type}</div>
            <div class="prop-level">${DEVELOPMENT_TIERS[space.developmentLevel]?.name || `Level ${space.developmentLevel}`} ${DEVELOPMENT_TIERS[space.developmentLevel]?.icon || ''}</div>
          </div>
        </div>
        <div class="prop-actions">
          ${space.type === 'country' && canDevelop ? `
            <button class="btn btn-xs btn-success" data-develop="${pid}">
              ⬆️ Develop ($${devCost})
            </button>
          ` : ''}
          ${space.developmentLevel > 0 ? `
            <button class="btn btn-xs btn-warning" data-sell-dev="${pid}">
              ⬇️ Sell Dev
            </button>
          ` : ''}
          ${!space.mortgaged && space.developmentLevel === 0 ? `
            <button class="btn btn-xs btn-danger" data-mortgage="${pid}">
              💳 Mortgage ($${Math.floor(space.price / 2)})
            </button>
          ` : ''}
          ${space.mortgaged ? `
            <button class="btn btn-xs btn-info" data-unmortgage="${pid}">
              💳 Unmortgage ($${Math.floor(space.price * 0.55)})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });

  if (currentPlayer.properties.length === 0) {
    html += '<div class="no-properties">No properties owned yet.</div>';
  }

  html += '</div></div></div></div>';
  return html;
}

// ---- Trade Panel ----
function renderTradePanel() {
  const state = engine.state;
  const currentPlayer = engine.getCurrentPlayer();
  const otherPlayers = state.players.filter(p => !p.bankrupt && p.id !== currentPlayer.id);

  let html = `
    <div class="modal-overlay" id="trade-modal-overlay">
      <div class="modal trade-modal">
        <div class="modal-header">
          <h2>🤝 Trade Negotiation</h2>
          <button class="modal-close" id="close-trade">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Select partner -->
          <div class="trade-partner-select">
            <label>Trade with:</label>
            <div class="partner-chips">
              ${otherPlayers.map(p => `
                <button class="partner-chip ${selectedTradePartner === p.id ? 'selected' : ''}"
                        data-partner="${p.id}" style="border-color:${p.color}">
                  ${p.avatar} ${p.name}
                </button>
              `).join('')}
            </div>
          </div>

          ${selectedTradePartner ? (() => {
            const partner = engine.getPlayerById(selectedTradePartner);
            return `
              <div class="trade-columns">
                <!-- You offer -->
                <div class="trade-column">
                  <h3 style="color:${currentPlayer.color}">You Offer</h3>
                  <div class="trade-money">
                    <label>Money: $</label>
                    <input type="number" class="trade-money-input" id="trade-give-money"
                           value="${tradeOffer.giveMoney}" min="0" max="${currentPlayer.money}" step="100" />
                  </div>
                  <div class="trade-props-list">
                    ${currentPlayer.properties.map(pid => {
                      const s = engine.getSpace(pid);
                      const checked = tradeOffer.giveProperties.includes(pid);
                      const flagOrIcon = s.flag ? getFlagHtml(s.flag) : s.icon;
                      return `
                        <label class="trade-prop-checkbox">
                          <input type="checkbox" data-give-prop="${pid}" ${checked ? 'checked' : ''} />
                          ${flagOrIcon} ${s.name}
                        </label>
                      `;
                    }).join('') || '<p>No properties</p>'}
                  </div>
                </div>

                <!-- You receive -->
                <div class="trade-column">
                  <h3 style="color:${partner.color}">You Receive</h3>
                  <div class="trade-money">
                    <label>Money: $</label>
                    <input type="number" class="trade-money-input" id="trade-get-money"
                           value="${tradeOffer.getMoney}" min="0" max="${partner.money}" step="100" />
                  </div>
                  <div class="trade-props-list">
                    ${partner.properties.map(pid => {
                      const s = engine.getSpace(pid);
                      const checked = tradeOffer.getProperties.includes(pid);
                      const flagOrIcon = s.flag ? getFlagHtml(s.flag) : s.icon;
                      return `
                        <label class="trade-prop-checkbox">
                          <input type="checkbox" data-get-prop="${pid}" ${checked ? 'checked' : ''} />
                          ${flagOrIcon} ${s.name}
                        </label>
                      `;
                    }).join('') || '<p>No properties</p>'}
                  </div>
                </div>
              </div>

              <button class="btn btn-primary btn-lg" id="btn-send-trade">📤 Send Trade Offer</button>
            `;
          })() : '<p class="trade-hint">Select a player to trade with</p>'}

          <!-- Pending trades -->
          ${state.tradeOffers.filter(t => t.status === 'pending').length > 0 ? `
            <div class="pending-trades">
              <h3>📬 Pending Trade Offers</h3>
              ${state.tradeOffers.filter(t => t.status === 'pending').map(trade => {
                const from = engine.getPlayerById(trade.fromId);
                const to = engine.getPlayerById(trade.toId);
                const canAccept = trade.toId === currentPlayer.id;
                return `
                  <div class="trade-offer-card">
                    <div class="toc-header">${from.name} → ${to.name}</div>
                    <div class="toc-details">
                      ${trade.giveMoney ? `<span>Offers $${trade.giveMoney}</span>` : ''}
                      ${trade.getMoney ? `<span>Requests $${trade.getMoney}</span>` : ''}
                      ${(trade.giveProperties || []).map(pid => `<span>Offers ${engine.getSpace(pid).name}</span>`).join('')}
                      ${(trade.getProperties || []).map(pid => `<span>Wants ${engine.getSpace(pid).name}</span>`).join('')}
                    </div>
                    ${canAccept ? `
                      <div class="toc-actions">
                        <button class="btn btn-sm btn-success" data-accept-trade="${trade.id}">✅ Accept</button>
                        <button class="btn btn-sm btn-danger" data-reject-trade="${trade.id}">❌ Reject</button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  return html;
}

// ---- Log Panel ----
function renderLogPanel() {
  const logs = engine.state.log.slice(-50).reverse();
  return `
    <div class="modal-overlay" id="log-modal-overlay">
      <div class="modal log-modal">
        <div class="modal-header">
          <h2>📋 Game Log</h2>
          <button class="modal-close" id="close-log">&times;</button>
        </div>
        <div class="modal-body">
          <div class="log-entries">
            ${logs.map(l => `
              <div class="log-entry log-${l.type}">
                <span class="log-turn">T${l.turn}</span>
                <span class="log-msg">${l.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Chat Panel ----
function renderChatPanel() {
  return `
    <div class="modal-overlay" id="chat-modal-overlay">
      <div class="modal chat-modal">
        <div class="modal-header">
          <h2>💬 Chat</h2>
          <button class="modal-close" id="close-chat">&times;</button>
        </div>
        <div class="modal-body">
          <div class="chat-messages">
            ${chatMessages.map(m => `
              <div class="chat-msg">
                <span class="chat-author" style="color:${m.color || '#fff'}">${m.name}:</span>
                <span class="chat-text">${escapeHtml(m.text)}</span>
              </div>
            `).join('')}
          </div>
          <div class="chat-input-row">
            <input type="text" class="chat-input" id="chat-input" placeholder="Type message..." maxlength="200" />
            <button class="btn btn-primary" id="btn-send-chat">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Card Modal ----
function renderCardModal() {
  if (!currentCardDisplay) return '';
  const card = currentCardDisplay;
  const isGlobal = card.id?.startsWith('gn');

  return `
    <div class="modal-overlay card-modal-overlay" id="card-modal-overlay">
      <div class="card-display ${isGlobal ? 'global-news' : 'diplomatic-cable'}">
        <div class="card-header">${isGlobal ? '📰 GLOBAL NEWS' : '📜 DIPLOMATIC CABLE'}</div>
        <div class="card-title">${card.title}</div>
        <div class="card-text">${card.text}</div>
        <button class="btn btn-primary" id="btn-close-card">OK</button>
      </div>
    </div>
  `;
}

// ---- Game Over Overlay ----
function renderGameOverOverlay() {
  const winner = engine.getPlayerById(engine.state.winner);
  if (!winner) return '';

  return `
    <div class="modal-overlay gameover-overlay">
      <div class="gameover-content">
        <div class="gameover-crown">👑</div>
        <h1 class="gameover-title">VICTORY!</h1>
        <div class="gameover-winner" style="color:${winner.color}">
          <span class="winner-avatar">${winner.avatar}</span>
          <span class="winner-name">${winner.name}</span>
        </div>
        <div class="gameover-stats">
          <div class="gos-row"><span>Total Wealth:</span><span>$${engine.calculateTotalWealth(winner).toLocaleString()}</span></div>
          <div class="gos-row"><span>Influence:</span><span>${winner.influence}</span></div>
          <div class="gos-row"><span>Properties:</span><span>${winner.properties.length}</span></div>
          <div class="gos-row"><span>Rent Collected:</span><span>$${winner.totalRentCollected.toLocaleString()}</span></div>
        </div>
        <div class="gameover-rankings">
          <h3>Final Rankings</h3>
          ${engine.state.players
            .sort((a, b) => engine.calculateTotalWealth(b) - engine.calculateTotalWealth(a))
            .map((p, i) => `
              <div class="ranking-row">
                <span class="rank">#${i + 1}</span>
                <span class="rank-avatar" style="background:${p.color}">${p.avatar}</span>
                <span class="rank-name">${p.name}</span>
                <span class="rank-wealth">$${engine.calculateTotalWealth(p).toLocaleString()}</span>
              </div>
            `).join('')}
        </div>
        <button class="btn btn-primary btn-lg" id="btn-new-game">🔄 New Game</button>
      </div>
    </div>
  `;
}

function renderGameOver() {
  return renderGameOverOverlay();
}

// ---- Event Attachments ----

function attachGameEvents() {
  // Top bar buttons
  document.getElementById('btn-sound')?.addEventListener('click', () => { sound.toggle(); render(); });
  document.getElementById('btn-music')?.addEventListener('click', () => { sound.toggleMusic(); render(); });
  document.getElementById('btn-log')?.addEventListener('click', () => { showLogPanel = !showLogPanel; render(); });
  document.getElementById('btn-chat')?.addEventListener('click', () => { showChatPanel = !showChatPanel; render(); });
  document.getElementById('btn-save')?.addEventListener('click', handleSaveGame);

  // Game actions
  document.getElementById('btn-roll')?.addEventListener('click', handleRollDice);
  document.getElementById('btn-bail')?.addEventListener('click', handlePayBail);
  document.getElementById('btn-immunity')?.addEventListener('click', handleUseImmunity);
  document.getElementById('btn-buy')?.addEventListener('click', handleBuyProperty);
  document.getElementById('btn-decline')?.addEventListener('click', handleDecline);
  document.getElementById('btn-end-turn')?.addEventListener('click', handleEndTurn);

  // Property/Trade buttons
  document.getElementById('btn-properties')?.addEventListener('click', () => { showPropertyPanel = true; render(); });
  document.getElementById('btn-props-open')?.addEventListener('click', () => { showPropertyPanel = true; render(); });
  document.getElementById('btn-trade')?.addEventListener('click', () => { showTradePanel = true; render(); });
  document.getElementById('btn-trade-open')?.addEventListener('click', () => { showTradePanel = true; render(); });

  // Influence actions
  document.getElementById('btn-embargo')?.addEventListener('click', () => handleInfluenceAction('embargo'));
  document.getElementById('btn-summit')?.addEventListener('click', () => handleInfluenceAction('summit'));
  document.getElementById('btn-dev-grant')?.addEventListener('click', () => handleInfluenceAction('development_grant'));

  // Modal closes
  document.getElementById('close-props')?.addEventListener('click', () => { showPropertyPanel = false; render(); });
  document.getElementById('close-trade')?.addEventListener('click', () => { showTradePanel = false; render(); });
  document.getElementById('close-log')?.addEventListener('click', () => { showLogPanel = false; render(); });
  document.getElementById('close-chat')?.addEventListener('click', () => { showChatPanel = false; render(); });
  document.getElementById('btn-close-card')?.addEventListener('click', () => { showCardModal = false; currentCardDisplay = null; render(); });

  // Modal overlay clicks
  ['property-modal-overlay', 'trade-modal-overlay', 'log-modal-overlay', 'chat-modal-overlay', 'card-modal-overlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) {
        showPropertyPanel = false; showTradePanel = false; showLogPanel = false;
        showChatPanel = false; showCardModal = false; currentCardDisplay = null;
        render();
      }
    });
  });

  // Property management actions
  document.querySelectorAll('[data-develop]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = parseInt(btn.dataset.develop);
      engine.developProperty(engine.getCurrentPlayer().id, pid);
      sound.playDevelop();
    });
  });
  document.querySelectorAll('[data-mortgage]').forEach(btn => {
    btn.addEventListener('click', () => {
      engine.mortgageProperty(engine.getCurrentPlayer().id, parseInt(btn.dataset.mortgage));
    });
  });
  document.querySelectorAll('[data-unmortgage]').forEach(btn => {
    btn.addEventListener('click', () => {
      engine.unmortgageProperty(engine.getCurrentPlayer().id, parseInt(btn.dataset.unmortgage));
    });
  });
  document.querySelectorAll('[data-sell-dev]').forEach(btn => {
    btn.addEventListener('click', () => {
      engine.sellDevelopment(engine.getCurrentPlayer().id, parseInt(btn.dataset.sellDev));
    });
  });

  // Trade partner selection
  document.querySelectorAll('[data-partner]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTradePartner = btn.dataset.partner;
      tradeOffer = { giveMoney: 0, getMoney: 0, giveProperties: [], getProperties: [] };
      render();
    });
  });

  // Trade money inputs
  document.getElementById('trade-give-money')?.addEventListener('change', (e) => {
    tradeOffer.giveMoney = parseInt(e.target.value) || 0;
  });
  document.getElementById('trade-get-money')?.addEventListener('change', (e) => {
    tradeOffer.getMoney = parseInt(e.target.value) || 0;
  });

  // Trade property checkboxes
  document.querySelectorAll('[data-give-prop]').forEach(cb => {
    cb.addEventListener('change', () => {
      const pid = parseInt(cb.dataset.giveProp);
      if (cb.checked) tradeOffer.giveProperties.push(pid);
      else tradeOffer.giveProperties = tradeOffer.giveProperties.filter(p => p !== pid);
    });
  });
  document.querySelectorAll('[data-get-prop]').forEach(cb => {
    cb.addEventListener('change', () => {
      const pid = parseInt(cb.dataset.getProp);
      if (cb.checked) tradeOffer.getProperties.push(pid);
      else tradeOffer.getProperties = tradeOffer.getProperties.filter(p => p !== pid);
    });
  });

  // Send trade
  document.getElementById('btn-send-trade')?.addEventListener('click', handleSendTrade);

  // Accept/reject trades
  document.querySelectorAll('[data-accept-trade]').forEach(btn => {
    btn.addEventListener('click', () => engine.acceptTrade(btn.dataset.acceptTrade));
  });
  document.querySelectorAll('[data-reject-trade]').forEach(btn => {
    btn.addEventListener('click', () => engine.rejectTrade(btn.dataset.rejectTrade));
  });

  // Chat
  document.getElementById('btn-send-chat')?.addEventListener('click', handleSendChat);
  document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });

  // New game button
  document.getElementById('btn-new-game')?.addEventListener('click', () => {
    engine = null;
    appScreen = 'lobby';
    lobbyPlayers = [];
    render();
  });

  // Space click for info
  document.querySelectorAll('[data-space-id]').forEach(el => {
    el.addEventListener('click', () => {
      // Could show space details
    });
  });
}

function attachGameOverEvents() {
  document.getElementById('btn-new-game')?.addEventListener('click', () => {
    engine = null;
    appScreen = 'lobby';
    lobbyPlayers = [];
    render();
  });
}

// ---- Action Handlers ----

// Flag to prevent multiple dice rolls at once - declared at module level
let diceAnimationInProgress = false;

function stopDiceAnimation() {
  if (diceAnimationTimer) {
    clearInterval(diceAnimationTimer);
    diceAnimationTimer = null;
  }
  diceAnimationInProgress = false;
  animatingDice = false;
  const diceDisplay = document.querySelector('.dice-display');
  if (diceDisplay) {
    diceDisplay.classList.remove('rolling');
  }
}

function syncDiceAnimationWithTurn() {
  if (!engine || appScreen !== 'game') return;
  const currentPhase = engine.state.phase;
  const turnKey = `${engine.state.turnNumber}:${engine.state.currentPlayerIndex}`;
  const turnChanged = lastTurnKey && turnKey !== lastTurnKey;
  const phaseShouldNotAnimate = currentPhase !== 'pre-roll' && currentPhase !== 'rolling';

  if ((turnChanged || phaseShouldNotAnimate) && (diceAnimationTimer || diceAnimationInProgress || animatingDice)) {
    stopDiceAnimation();
  }
  lastTurnKey = turnKey;
}

function handleRollDice() {
  // Defensive checks with detailed logging
  if (!engine) {
    console.error('[DICE] No engine available');
    return;
  }

  const currentPhase = engine.state.phase;
  const currentPlayer = engine.getCurrentPlayer();

  console.log(`[DICE] handleRollDice called - Phase: ${currentPhase}, Player: ${currentPlayer?.name}, AnimInProgress: ${diceAnimationInProgress}`);

  if (currentPhase !== 'pre-roll') {
    console.warn(`[DICE] Blocked - Not in pre-roll phase (current: ${currentPhase})`);
    return;
  }

  if (diceAnimationInProgress) {
    console.warn('[DICE] Blocked - Animation already in progress');
    return;
  }

  if (currentPlayer?.bankrupt) {
    console.warn('[DICE] Blocked - Current player is bankrupt');
    return;
  }

  // Lock dice rolling
  diceAnimationInProgress = true;
  animatingDice = true;

  console.log('[DICE] Starting dice animation...');
  sound.playDiceRoll();

  // Dice animation - only update the dice display, not full re-render
  let rolls = 0;
  diceAnimationTimer = setInterval(() => {
    diceValues = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    rolls++;

    // Only update dice display, not full render (to avoid losing event handlers)
    const diceDisplay = document.querySelector('.dice-display');
    if (diceDisplay) {
      diceDisplay.innerHTML = `
        <div class="die">${getDiceFace(diceValues[0])}</div>
        <div class="die">${getDiceFace(diceValues[1])}</div>
      `;
      diceDisplay.classList.add('rolling');
    }

    if (rolls >= 10) {
      if (diceAnimationTimer) {
        clearInterval(diceAnimationTimer);
        diceAnimationTimer = null;
      }
      animatingDice = false;
      const diceDisplay = document.querySelector('.dice-display');
      if (diceDisplay) {
        diceDisplay.classList.remove('rolling');
      }

      console.log('[DICE] Animation complete, executing roll...');

      // Now actually roll in the engine
      try {
        const result = engine.rollDiceAction();
        console.log(`[DICE] rollDiceAction result:`, result, `New phase: ${engine.state.phase}`);

        if (result) {
          diceValues = [result.d1, result.d2];
        }
      } catch (error) {
        console.error('[DICE] Error in rollDiceAction:', error);
      } finally {
        stopDiceAnimation();
      }

      // Full render after engine processes the roll
      render();

      console.log(`[DICE] Render complete. Final phase: ${engine.state.phase}`);
    }
  }, 80);
}

function handlePayBail() {
  const player = engine.getCurrentPlayer();
  if (player.hasGetOutFree) {
    engine.payBail(player);
  } else {
    engine.payBail(player);
  }
  render();
}

function handleUseImmunity() {
  const player = engine.getCurrentPlayer();
  player.hasGetOutFree = true; // ensure flag is set before calling payBail
  engine.payBail(player);
  render();
}

function handleBuyProperty() {
  const player = engine.getCurrentPlayer();
  const success = engine.buyProperty(player.id);
  if (success) sound.playPurchase();
  else sound.playError();
}

function handleDecline() {
  engine.declinePurchase();
}

function handleEndTurn() {
  if (!engine) {
    console.error('[END_TURN] No engine available');
    return;
  }

  const beforePhase = engine.state.phase;
  const beforePlayer = engine.getCurrentPlayer()?.name;
  const beforePlayerIndex = engine.state.currentPlayerIndex;

  console.log(`[END_TURN] Called - Phase: ${beforePhase}, Player: ${beforePlayer} (idx: ${beforePlayerIndex})`);

  if (beforePhase !== 'end-turn') {
    console.warn(`[END_TURN] Warning - Not in end-turn phase (current: ${beforePhase})`);
  }

  stopDiceAnimation();

  try {
    engine.endTurn();
  } catch (error) {
    console.error('[END_TURN] Error:', error);
  }

  const afterPhase = engine.state.phase;
  const afterPlayer = engine.getCurrentPlayer()?.name;
  const afterPlayerIndex = engine.state.currentPlayerIndex;

  console.log(`[END_TURN] Complete - Phase: ${afterPhase}, Player: ${afterPlayer} (idx: ${afterPlayerIndex})`);

  sound.playClick();
}

function handleInfluenceAction(action) {
  const player = engine.getCurrentPlayer();
  if (action === 'embargo') {
    // Need to select target - for now pick first opponent
    const others = engine.getActivePlayers().filter(p => p.id !== player.id);
    if (others.length > 0) {
      engine.useInfluenceAction(player.id, action, others[0].id);
    }
  } else {
    engine.useInfluenceAction(player.id, action);
  }
}

function handleSendTrade() {
  if (!selectedTradePartner) return;
  const player = engine.getCurrentPlayer();
  engine.proposeTrade(player.id, selectedTradePartner, { ...tradeOffer });
  showTradePanel = false;
  tradeOffer = { giveMoney: 0, getMoney: 0, giveProperties: [], getProperties: [] };
  selectedTradePartner = null;
  sound.playClick();
  render();
}

function handleSendChat() {
  const input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;
  const player = engine.getCurrentPlayer();
  const msg = {
    name: player.name,
    color: player.color,
    text: input.value.trim(),
    time: Date.now()
  };
  chatMessages.push(msg);
  if (network) network.sendChat(msg);
  input.value = '';
  render();
}

function handleSaveGame() {
  if (!engine) return;
  const data = JSON.stringify(engine.serialize());
  localStorage.setItem('globalEconWars_save', data);
  alert('Game saved!');
}

function handleLoadGame() {
  const data = localStorage.getItem('globalEconWars_save');
  if (!data) return false;
  try {
    const state = JSON.parse(data);
    engine = new GameEngine(state);
    engine.on(() => {
      syncDiceAnimationWithTurn();
      render();
    });
    engine.onAnimation((type, data) => handleAnimation(type, data));
    appScreen = 'game';
    render();
    return true;
  } catch (e) {
    return false;
  }
}

// ---- Animation Handler ----

function handleAnimation(type, data) {
  switch (type) {
    case 'dice':
      sound.playDiceRoll();
      break;
    case 'move':
      sound.playMove();
      break;
    case 'purchase':
      sound.playPurchase();
      break;
    case 'payment':
      sound.playRentPaid();
      break;
    case 'card':
      sound.playCard();
      currentCardDisplay = data.card;
      showCardModal = true;
      render();
      break;
    case 'sanctions':
      sound.playSanctions();
      break;
    case 'bankrupt':
      sound.playBankrupt();
      break;
    case 'victory':
      sound.playVictory();
      break;
    case 'develop':
      sound.playDevelop();
      break;
  }
}

// ---- Helpers ----

function getDiceFace(value) {
  const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return faces[value] || '⚀';
}

// Country code to flag emoji mapping (for browsers that don't render flag emojis properly)
// Using regional indicator symbols approach, plus fallback to image-based flags
const FLAG_TO_CODE = {
  '🇲🇩': 'MD', '🇦🇲': 'AM', '🇺🇦': 'UA', '🇳🇬': 'NG', '🇰🇪': 'KE',
  '🇪🇬': 'EG', '🇿🇦': 'ZA', '🇮🇳': 'IN', '🇧🇩': 'BD', '🇱🇰': 'LK',
  '🇳🇵': 'NP', '🇫🇷': 'FR', '🇩🇪': 'DE', '🇬🇧': 'GB', '🇯🇵': 'JP',
  '🇰🇷': 'KR', '🇨🇳': 'CN', '🇧🇷': 'BR', '🇸🇬': 'SG', '🇸🇦': 'SA',
  '🇨🇦': 'CA', '🇦🇪': 'AE', '🇺🇸': 'US'
};

// Convert flag emoji to an img tag using flagcdn.com
function getFlagHtml(flagEmoji) {
  const code = FLAG_TO_CODE[flagEmoji];
  if (code) {
    // Use flagcdn.com for reliable SVG flags
    return `<img src="https://flagcdn.com/w40/${code.toLowerCase()}.png" alt="${flagEmoji}" class="country-flag-img" onerror="this.outerHTML='${flagEmoji}'">`;
  }
  return flagEmoji;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export for use
window.initApp = initApp;
window.handleLoadGame = handleLoadGame;

// ============================================================
// DEBUG / TESTING UTILITIES
// ============================================================
// Access these via browser console (F12)

window.enableDebug = () => {
  debugMode = true;
  console.log('Debug mode enabled. Available commands:');
  console.log('  window.debug.giveMoney(amount) - Give current player money');
  console.log('  window.debug.giveProperty(spaceId) - Give current player a property');
  console.log('  window.debug.giveInfluence(amount) - Give current player influence');
  console.log('  window.debug.moveTo(spaceId) - Move current player to space');
  console.log('  window.debug.completeAlliance(allianceId) - Give all properties of an alliance');
  console.log('  window.debug.drawCard(type) - Draw a card ("globalNews" or "diplomaticCable")');
  console.log('  window.debug.bankruptPlayer(index) - Bankrupt a player');
  console.log('  window.debug.getState() - Get current game state');
  console.log('  window.debug.listSpaces() - List all board spaces');
  console.log('  window.debug.listAlliances() - List all alliances');
  return 'Debug mode active!';
};

window.debug = {
  giveMoney: (amount) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    engine.adjustMoney(player, amount);
    engine.emit();
    return `Gave ${player.name} $${amount}. New balance: $${player.money}`;
  },

  giveProperty: (spaceId) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    const space = engine.getSpace(spaceId);
    if (!space) return 'Invalid space ID';
    if (space.type !== 'country' && space.type !== 'transport' && space.type !== 'infrastructure') {
      return 'Not a purchasable space';
    }
    space.owner = player.id;
    if (!player.properties.includes(spaceId)) {
      player.properties.push(spaceId);
    }
    engine.emit();
    return `Gave ${player.name} property: ${space.name}`;
  },

  giveInfluence: (amount) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    player.influence += amount;
    engine.emit();
    return `Gave ${player.name} ${amount} influence. New total: ${player.influence}`;
  },

  moveTo: (spaceId) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    player.position = spaceId;
    engine.emit();
    return `Moved ${player.name} to space ${spaceId}: ${engine.getSpace(spaceId).name}`;
  },

  completeAlliance: (allianceId) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    const spaces = engine.state.board.filter(s => s.alliance === allianceId);
    if (spaces.length === 0) return 'Invalid alliance ID';
    spaces.forEach(s => {
      s.owner = player.id;
      if (!player.properties.includes(s.id)) {
        player.properties.push(s.id);
      }
    });
    engine.emit();
    return `Gave ${player.name} all ${spaces.length} properties of ${allianceId}`;
  },

  drawCard: (type) => {
    if (!engine) return 'No game active';
    const player = engine.getCurrentPlayer();
    engine.drawCard(player, type);
    return `Drew ${type} card`;
  },

  bankruptPlayer: (index) => {
    if (!engine) return 'No game active';
    const player = engine.state.players[index];
    if (!player) return 'Invalid player index';
    engine.declareBankruptcy(player);
    return `${player.name} is now bankrupt`;
  },

  getState: () => {
    if (!engine) return 'No game active';
    return engine.state;
  },

  listSpaces: () => {
    if (!engine) return 'No game active';
    return engine.state.board.map(s => `${s.id}: ${s.name} (${s.type}${s.alliance ? ', ' + s.alliance : ''})`);
  },

  listAlliances: () => {
    return Object.keys(ALLIANCES).map(id => {
      const a = ALLIANCES[id];
      return `${id}: ${a.name} - ${a.bonus}`;
    });
  },

  // Simulate a full turn
  simulateTurn: () => {
    if (!engine) return 'No game active';
    if (engine.state.phase !== 'pre-roll') return 'Not in pre-roll phase';
    const dice = engine.rollDiceAction();
    return `Rolled ${dice.d1} + ${dice.d2} = ${dice.total}`;
  },

  // Force end current turn
  forceEndTurn: () => {
    if (!engine) return 'No game active';
    engine.state.phase = 'end-turn';
    engine.endTurn();
    return 'Turn ended';
  },

  // Skip to specific player
  skipToPlayer: (index) => {
    if (!engine) return 'No game active';
    engine.state.currentPlayerIndex = index;
    engine.state.phase = 'pre-roll';
    engine.emit();
    return `Now ${engine.getCurrentPlayer().name}'s turn`;
  }
};
