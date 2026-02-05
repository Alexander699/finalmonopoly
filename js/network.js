// ============================================================
// GLOBAL ECONOMIC WARS - Network Manager (PeerJS WebRTC)
// ============================================================

// Uses PeerJS for WebRTC peer-to-peer connections
// Host acts as authority; clients send actions, host broadcasts state

// PeerJS configuration with ICE servers for better connectivity
const PEER_CONFIG = {
  debug: 1, // 0 = none, 1 = errors, 2 = warnings, 3 = all
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      // Free TURN servers (limited but help with NAT traversal)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
};

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> connection
    this.isHost = false;
    this.roomCode = '';
    this.playerName = '';
    this.callback = null;
    this.players = [];
    this.localPlayerId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  host(name, callback) {
    this.isHost = true;
    this.playerName = name;
    this.callback = callback;
    this.roomCode = this.generateRoomCode();
    this.players = [name];

    // Create peer with room code as ID prefix
    const peerId = 'gew-' + this.roomCode;

    try {
      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log('Host peer opened with ID:', id);
        callback('room-created', { code: this.roomCode });
      });

      this.peer.on('connection', (conn) => {
        console.log('New connection from:', conn.peer);

        conn.on('open', () => {
          console.log('Connection opened with:', conn.peer);
          conn.on('data', (data) => this.handleHostMessage(conn, data));
        });

        conn.on('close', () => {
          console.log('Connection closed:', conn.peer);
          this.handleDisconnect(conn);
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        let message = 'Connection error: ' + err.type;
        if (err.type === 'unavailable-id') {
          message = 'Room code already in use. Try again.';
        } else if (err.type === 'network') {
          message = 'Network error. Check your internet connection.';
        } else if (err.type === 'server-error') {
          message = 'Server error. The PeerJS server may be down.';
        }
        callback('error', { message });
      });

      this.peer.on('disconnected', () => {
        console.log('Peer disconnected, attempting to reconnect...');
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.peer.reconnect();
        }
      });

    } catch (e) {
      console.error('Failed to create peer:', e);
      callback('error', { message: 'PeerJS not available. Make sure you have internet connection.' });
    }
  }

  join(name, code, callback) {
    this.isHost = false;
    this.playerName = name;
    this.roomCode = code.toUpperCase();
    this.callback = callback;

    const peerId = 'gew-' + this.roomCode + '-' + Math.random().toString(36).substr(2, 6);

    try {
      this.peer = new Peer(peerId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        console.log('Client peer opened with ID:', id);
        const hostId = 'gew-' + this.roomCode;
        console.log('Connecting to host:', hostId);

        const conn = this.peer.connect(hostId, {
          reliable: true,
          serialization: 'json'
        });

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.connections.has('host')) {
            callback('error', { message: 'Could not connect to room. The host may not exist or may be behind a firewall.' });
          }
        }, 15000);

        conn.on('open', () => {
          console.log('Connected to host!');
          clearTimeout(connectionTimeout);
          this.connections.set('host', conn);
          conn.send({ type: 'join', name: this.playerName });
        });

        conn.on('data', (data) => this.handleClientMessage(data));

        conn.on('close', () => {
          console.log('Connection to host closed');
          callback('error', { message: 'Lost connection to host' });
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          clearTimeout(connectionTimeout);
          callback('error', { message: 'Connection error: ' + err.message });
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        let message = 'Could not connect: ' + err.type;
        if (err.type === 'peer-unavailable') {
          message = 'Room not found. Check the room code and make sure the host is online.';
        } else if (err.type === 'network') {
          message = 'Network error. Check your internet connection.';
        }
        callback('error', { message });
      });

    } catch (e) {
      console.error('Failed to create peer:', e);
      callback('error', { message: 'PeerJS not available. Make sure you have internet connection.' });
    }
  }

  // Host message handling
  handleHostMessage(conn, data) {
    console.log('Host received:', data.type);
    switch (data.type) {
      case 'join':
        if (this.players.length >= 8) {
          conn.send({ type: 'error', message: 'Room is full' });
          return;
        }
        this.connections.set(data.name, conn);
        this.players.push(data.name);
        conn.send({ type: 'joined', players: [...this.players] });

        // Broadcast to all players
        this.broadcast({ type: 'player-joined', players: [...this.players] });
        this.callback('player-joined', { players: [...this.players] });
        break;

      case 'action':
        // Host processes action and broadcasts result
        this.callback('action', data.payload || data);
        break;

      case 'chat':
        this.broadcast(data);
        this.callback('chat', data);
        break;
    }
  }

  // Client message handling
  handleClientMessage(data) {
    console.log('Client received:', data.type);
    switch (data.type) {
      case 'joined':
        this.callback('joined', { players: data.players });
        break;
      case 'player-joined':
      case 'player-left':
        this.callback(data.type, { players: data.players });
        break;
      case 'game-start':
        this.localPlayerId = data.localId;
        this.callback('game-start', data);
        break;
      case 'state-update':
        this.callback('state-update', data);
        break;
      case 'chat':
        this.callback('chat', data);
        break;
      case 'error':
        this.callback('error', data);
        break;
    }
  }

  handleDisconnect(conn) {
    for (const [name, c] of this.connections) {
      if (c === conn) {
        this.connections.delete(name);
        this.players = this.players.filter(p => p !== name);
        this.broadcast({ type: 'player-left', players: [...this.players] });
        this.callback('player-left', { players: [...this.players] });
        break;
      }
    }
  }

  broadcast(data) {
    for (const [, conn] of this.connections) {
      try { conn.send(data); } catch (e) { /* ignore */ }
    }
  }

  sendAction(action) {
    if (this.isHost) {
      // Process locally
      return;
    }
    const conn = this.connections.get('host');
    if (conn) {
      conn.send({ type: 'action', payload: action });
    }
  }

  sendChat(msg) {
    if (this.isHost) {
      this.broadcast({ type: 'chat', ...msg });
    } else {
      const conn = this.connections.get('host');
      if (conn) conn.send({ type: 'chat', ...msg });
    }
  }

  startGame() {
    if (!this.isHost) return;

    // Import and create game state
    import('./gameEngine.js').then(({ createGameState }) => {
      const state = createGameState(this.players);

      // Assign player IDs to connections
      this.players.forEach((name, i) => {
        const player = state.players[i];
        if (i === 0) {
          // Host
          this.localPlayerId = player.id;
          this.callback('game-start', { state, localId: player.id });
        } else {
          const conn = this.connections.get(name);
          if (conn) {
            conn.send({ type: 'game-start', state, localId: player.id });
          }
        }
      });
    });
  }

  broadcastState(state) {
    this.broadcast({ type: 'state-update', state });
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
