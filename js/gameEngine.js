// ============================================================
// GLOBAL ECONOMIC WARS - Core Game Engine
// ============================================================

import { BOARD, ALLIANCES, DEVELOPMENT_TIERS, GLOBAL_NEWS_CARDS, DIPLOMATIC_CABLE_CARDS,
         STARTING_MONEY, GO_SALARY, SANCTIONS_BAIL, INFLUENCE_TO_WIN, PLAYER_COLORS, PLAYER_AVATARS } from './gameData.js';

// ---- Utility ----
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, total: d1 + d2, isDoubles: d1 === d2 };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ---- Player Factory ----
function createPlayer(name, index) {
  return {
    id: generateId(),
    name,
    color: PLAYER_COLORS[index],
    avatar: PLAYER_AVATARS[index],
    money: STARTING_MONEY,
    position: 0,
    properties: [],       // space IDs
    influence: 0,
    inSanctions: false,
    sanctionsTurns: 0,
    hasGetOutFree: false,
    bankrupt: false,
    doublesCount: 0,
    turnsPlayed: 0,
    totalRentCollected: 0,
    totalRentPaid: 0,
    developmentCount: 0,
    connected: true
  };
}

// ---- Game State Factory ----
export function createGameState(playerNames) {
  const players = playerNames.map((name, i) => createPlayer(name, i));
  const globalNewsDeck = shuffle([...GLOBAL_NEWS_CARDS]);
  const diplomaticDeck = shuffle([...DIPLOMATIC_CABLE_CARDS]);

  return {
    id: generateId(),
    players,
    currentPlayerIndex: 0,
    phase: 'pre-roll',  // pre-roll, rolling, moving, landed, action, trade, end-turn
    board: BOARD.map(space => ({
      ...space,
      owner: null,
      developmentLevel: 0,
      mortgaged: false
    })),
    globalNewsDeck,
    diplomaticDeck,
    globalNewsDiscard: [],
    diplomaticDiscard: [],
    lastDice: null,
    turnNumber: 1,
    roundNumber: 1,
    log: [],
    tradeOffers: [],
    currentCard: null,
    activeEffects: [],   // timed effects like "double rent this round"
    negotiationPhaseUsed: false,
    winner: null,
    gameOver: false,
    settings: {
      turnTimer: 0,      // 0 = no timer, else seconds
      influenceWin: INFLUENCE_TO_WIN,
      startingMoney: STARTING_MONEY,
      goSalary: GO_SALARY
    }
  };
}

// ---- Core Game Logic ----
export class GameEngine {
  constructor(state) {
    this.state = state;
    this.listeners = [];
    this.animationCallbacks = [];
  }

  // Subscribe to state changes
  on(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  onAnimation(callback) {
    this.animationCallbacks.push(callback);
    return () => { this.animationCallbacks = this.animationCallbacks.filter(c => c !== callback); };
  }

  emit() {
    this.listeners.forEach(cb => cb(this.state));
  }

  emitAnimation(type, data) {
    this.animationCallbacks.forEach(cb => cb(type, data));
  }

  log(msg, type = 'info') {
    this.state.log.push({
      time: Date.now(),
      turn: this.state.turnNumber,
      message: msg,
      type
    });
    if (this.state.log.length > 200) this.state.log.shift();
  }

  getCurrentPlayer() {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getSpace(id) {
    return this.state.board[id];
  }

  getPlayerById(id) {
    return this.state.players.find(p => p.id === id);
  }

  getActivePlayers() {
    return this.state.players.filter(p => !p.bankrupt);
  }

  // Count how many of an alliance a player owns
  getAllianceCount(playerId, allianceId) {
    const allianceSpaces = this.state.board.filter(s => s.type === 'country' && s.alliance === allianceId);
    const owned = allianceSpaces.filter(s => s.owner === playerId);
    return { owned: owned.length, total: allianceSpaces.length };
  }

  hasCompleteAlliance(playerId, allianceId) {
    const { owned, total } = this.getAllianceCount(playerId, allianceId);
    return owned === total && total > 0;
  }

  // Count transport networks owned
  getTransportCount(playerId) {
    return this.state.board.filter(s => s.type === 'transport' && s.owner === playerId).length;
  }

  // Count infrastructure owned
  getInfrastructureCount(playerId) {
    return this.state.board.filter(s => s.type === 'infrastructure' && s.owner === playerId).length;
  }

  // Resource diversity bonus
  getResourceBonus(playerId) {
    const resources = new Set();
    this.state.board.filter(s => s.owner === playerId && s.resource).forEach(s => resources.add(s.resource));
    // Bonus: 5% per unique resource type
    return resources.size * 0.05;
  }

  // Calculate rent for a space
  calculateRent(spaceId, diceTotal) {
    const space = this.getSpace(spaceId);
    if (!space.owner || space.mortgaged) return 0;

    if (space.type === 'transport') {
      const count = this.getTransportCount(space.owner);
      return space.rents[count - 1] || 0;
    }

    if (space.type === 'infrastructure') {
      const infraCount = this.getInfrastructureCount(space.owner);
      return diceTotal * (infraCount >= 2 ? 8 : 4);
    }

    if (space.type === 'country') {
      let rent = space.rents[space.developmentLevel] || space.rents[0];

      // Alliance completion bonus (undeveloped properties get double rent)
      if (this.hasCompleteAlliance(space.owner, space.alliance) && space.developmentLevel === 0) {
        rent *= 2;
      }

      // EU alliance bonus: double rent on all EU countries
      if (space.alliance === 'EU' && this.hasCompleteAlliance(space.owner, 'EU') && space.developmentLevel > 0) {
        rent *= 2;
      }

      // South Asian Union bonus: extra $200 when any player lands
      if (space.alliance === 'SOUTH_ASIAN' && this.hasCompleteAlliance(space.owner, 'SOUTH_ASIAN')) {
        rent += 200;
      }

      // Resource diversity bonus
      rent = Math.floor(rent * (1 + this.getResourceBonus(space.owner)));

      // Check embargo effect
      for (const effect of this.state.activeEffects) {
        if (effect.type === 'embargo' && effect.targetId === space.owner) return 0;
        if (effect.type === 'half_rent') rent = Math.floor(rent / 2);
        if (effect.type === 'tech_double_rent' && space.resource === 'tech') rent *= 2;
        if (effect.type === 'tech_half_rent' && space.resource === 'tech') rent = Math.floor(rent / 2);
      }

      return rent;
    }

    return 0;
  }

  // Get development cost for a space
  getDevelopmentCost(spaceId) {
    const space = this.getSpace(spaceId);
    if (space.type !== 'country') return Infinity;
    if (space.developmentLevel >= 4) return Infinity;

    const nextLevel = space.developmentLevel + 1;
    const tier = DEVELOPMENT_TIERS[nextLevel];
    let cost = Math.floor(space.price * tier.costMultiplier);

    // Alliance bonus: if Asian Tigers, Tech Hubs cost 50% less
    if (space.alliance === 'ASIAN_TIGERS' && nextLevel === 3 && this.hasCompleteAlliance(space.owner, 'ASIAN_TIGERS')) {
      cost = Math.floor(cost * 0.5);
    }

    // Economic Capital (tier 4) only allowed if full alliance AND only 1 per alliance
    if (nextLevel === 4) {
      if (!this.hasCompleteAlliance(space.owner, space.alliance)) return Infinity;
      const allianceSpaces = this.state.board.filter(s => s.alliance === space.alliance && s.owner === space.owner);
      if (allianceSpaces.some(s => s.developmentLevel === 4)) return Infinity;
    }

    return cost;
  }

  // ---- Actions ----

  rollDiceAction() {
    const player = this.getCurrentPlayer();

    console.log(`[ENGINE] rollDiceAction - Phase: ${this.state.phase}, Player: ${player.name}, Bankrupt: ${player.bankrupt}`);

    if (this.state.phase !== 'pre-roll') {
      console.warn(`[ENGINE] rollDiceAction blocked - not in pre-roll phase (current: ${this.state.phase})`);
      return null;
    }
    if (player.bankrupt) {
      console.warn(`[ENGINE] rollDiceAction - player bankrupt, advancing turn`);
      this.nextTurn();
      return null;
    }

    const dice = rollDice();
    this.state.lastDice = dice;
    this.state.phase = 'rolling';
    this.emitAnimation('dice', dice);
    this.log(`${player.name} rolled ${dice.d1} + ${dice.d2} = ${dice.total}${dice.isDoubles ? ' (Doubles!)' : ''}`);

    // Handle sanctions
    if (player.inSanctions) {
      if (dice.isDoubles) {
        player.inSanctions = false;
        player.sanctionsTurns = 0;
        this.log(`${player.name} rolled doubles and escapes Trade Sanctions!`, 'success');
      } else if (player.sanctionsTurns >= 3) {
        player.inSanctions = false;
        player.sanctionsTurns = 0;
        this.adjustMoney(player, -SANCTIONS_BAIL);
        this.log(`${player.name} forced to pay $${SANCTIONS_BAIL} bail after 3 turns in Sanctions.`, 'warning');
      } else {
        player.sanctionsTurns++;
        this.log(`${player.name} remains in Trade Sanctions (turn ${player.sanctionsTurns}/3).`);
        this.state.phase = 'end-turn';
        this.emit();
        return dice;
      }
    }

    // Doubles tracking
    if (dice.isDoubles) {
      player.doublesCount++;
      if (player.doublesCount >= 3) {
        this.sendToSanctions(player);
        this.log(`${player.name} rolled 3 doubles in a row! Sent to Trade Sanctions!`, 'warning');
        this.state.phase = 'end-turn';
        this.emit();
        return dice;
      }
    } else {
      player.doublesCount = 0;
    }

    // Move player (handleLanding will call emit)
    this.movePlayer(player, dice.total);
    return dice;
  }

  movePlayer(player, spaces) {
    const oldPos = player.position;
    const newPos = (player.position + spaces) % 40;

    // Check if passed GO
    if (newPos < oldPos && spaces > 0) {
      const salary = this.calculateGoSalary(player);
      this.adjustMoney(player, salary);
      player.influence += 20;
      this.log(`${player.name} passes Global Summit! Collects $${salary} and 20 influence.`, 'success');
    }

    player.position = newPos;
    this.state.phase = 'moving';
    this.emitAnimation('move', { playerId: player.id, from: oldPos, to: newPos });

    // Handle landing synchronously - UI manages its own animation timing
    this.handleLanding(player);
  }

  movePlayerTo(player, targetPos, collectGo = true) {
    const oldPos = player.position;
    if (collectGo && targetPos < oldPos) {
      const salary = this.calculateGoSalary(player);
      this.adjustMoney(player, salary);
      player.influence += 20;
      this.log(`${player.name} passes Global Summit! Collects $${salary} and 20 influence.`, 'success');
    }
    player.position = targetPos;
    this.emitAnimation('move', { playerId: player.id, from: oldPos, to: targetPos });
    this.handleLanding(player);
  }

  calculateGoSalary(player) {
    let salary = this.state.settings.goSalary;
    // Influence bonus: +$10 per 50 influence
    salary += Math.floor(player.influence / 50) * 10;
    return salary;
  }

  handleLanding(player) {
    const space = this.getSpace(player.position);
    this.state.phase = 'landed';
    this.log(`${player.name} lands on ${space.name}.`);

    switch (space.type) {
      case 'country':
      case 'transport':
      case 'infrastructure':
        if (!space.owner) {
          this.state.phase = 'action'; // player can buy
        } else if (space.owner !== player.id && !space.mortgaged) {
          this.payRent(player, space);
        } else {
          this.state.phase = 'end-turn';
        }
        break;

      case 'card':
        this.drawCard(player, space.subtype);
        break;

      case 'tax':
        this.adjustMoney(player, -space.amount);
        this.log(`${player.name} pays ${space.name}: $${space.amount}.`, 'warning');
        this.state.phase = 'end-turn';
        break;

      case 'special':
        this.handleSpecialSpace(player, space);
        break;

      default:
        this.state.phase = 'end-turn';
    }

    this.checkBankruptcy(player);
    this.checkWinCondition();
    this.emit();
  }

  payRent(player, space) {
    const rent = this.calculateRent(space.id, this.state.lastDice?.total || 7);
    const owner = this.getPlayerById(space.owner);

    if (rent > 0 && owner && !owner.bankrupt) {
      const actualPaid = Math.min(rent, player.money);
      this.adjustMoney(player, -actualPaid);
      this.adjustMoney(owner, actualPaid);
      owner.influence += Math.floor(actualPaid / 100);
      owner.totalRentCollected += actualPaid;
      player.totalRentPaid += actualPaid;

      // BRICS alliance bonus
      if (this.hasCompleteAlliance(owner.id, 'BRICS')) {
        owner.influence += Math.floor(actualPaid / 10);
      }

      this.log(`${player.name} pays $${actualPaid} rent to ${owner.name} for ${space.name}.`, 'rent');
      this.emitAnimation('payment', { from: player.id, to: owner.id, amount: actualPaid });
    }
    this.state.phase = 'end-turn';
  }

  handleSpecialSpace(player, space) {
    switch (space.subtype) {
      case 'go':
        // Already handled by passing go
        this.state.phase = 'end-turn';
        break;

      case 'sanctions':
        // Just visiting - no penalty
        this.log(`${player.name} is just visiting Trade Sanctions.`);
        this.state.phase = 'end-turn';
        break;

      case 'freetrade':
        const bonus = 100;
        this.adjustMoney(player, bonus);
        player.influence += 10;
        this.log(`${player.name} enters the Free Trade Zone! Collects $${bonus} and 10 influence.`, 'success');
        this.state.phase = 'end-turn';
        break;

      case 'incident':
        this.sendToSanctions(player);
        this.log(`${player.name} causes an International Incident! Sent to Trade Sanctions!`, 'warning');
        this.state.phase = 'end-turn';
        break;
    }
  }

  sendToSanctions(player) {
    player.position = 10;
    player.inSanctions = true;
    player.sanctionsTurns = 0;
    player.doublesCount = 0;
    this.emitAnimation('sanctions', { playerId: player.id });
  }

  payBail(player) {
    if (!player.inSanctions) return false;

    if (player.hasGetOutFree) {
      player.hasGetOutFree = false;
      player.inSanctions = false;
      player.sanctionsTurns = 0;
      this.log(`${player.name} uses Diplomatic Immunity card to escape Sanctions!`, 'success');
    } else if (player.money >= SANCTIONS_BAIL) {
      this.adjustMoney(player, -SANCTIONS_BAIL);
      player.inSanctions = false;
      player.sanctionsTurns = 0;
      this.log(`${player.name} pays $${SANCTIONS_BAIL} to exit Trade Sanctions.`);
    } else {
      return false;
    }
    this.emit();
    return true;
  }

  drawCard(player, deckType) {
    let deck, discard;
    if (deckType === 'globalNews') {
      deck = this.state.globalNewsDeck;
      discard = this.state.globalNewsDiscard;
    } else {
      deck = this.state.diplomaticDeck;
      discard = this.state.diplomaticDiscard;
    }

    if (deck.length === 0) {
      // Reshuffle discard
      const reshuffled = shuffle(discard.splice(0));
      deck.push(...reshuffled);
    }

    const card = deck.pop();
    if (!card) { this.state.phase = 'end-turn'; return; }

    this.state.currentCard = card;
    this.log(`${player.name} draws: ${card.title} - ${card.text}`);
    this.emitAnimation('card', { card, deckType });

    this.applyCardEffect(player, card);

    if (!card.keepable) {
      discard.push(card);
    }
    this.state.currentCard = null;
    this.state.phase = 'end-turn';
  }

  applyCardEffect(player, card) {
    switch (card.effect) {
      case 'collect':
      case 'collect_bank':
        this.adjustMoney(player, card.amount);
        this.log(`${player.name} collects $${card.amount}.`, 'success');
        break;

      case 'pay':
      case 'pay_bank':
        this.adjustMoney(player, -card.amount);
        this.log(`${player.name} pays $${card.amount}.`, 'warning');
        break;

      case 'advance_go':
        this.movePlayerTo(player, 0, true);
        break;

      case 'get_out_free':
        player.hasGetOutFree = true;
        this.log(`${player.name} receives Diplomatic Immunity!`, 'success');
        break;

      case 'go_sanctions':
        this.sendToSanctions(player);
        break;

      case 'gain_influence':
        player.influence += card.amount;
        this.log(`${player.name} gains ${card.amount} influence!`, 'success');
        break;

      case 'all_gain_influence':
        this.getActivePlayers().forEach(p => { p.influence += card.amount; });
        this.log(`All players gain ${card.amount} influence!`, 'success');
        break;

      case 'pay_all_players':
        this.getActivePlayers().forEach(p => {
          if (p.id !== player.id) {
            const amount = Math.min(card.amount, player.money);
            this.adjustMoney(player, -amount);
            this.adjustMoney(p, amount);
          }
        });
        break;

      case 'collect_from_all':
        this.getActivePlayers().forEach(p => {
          if (p.id !== player.id) {
            const amount = Math.min(card.amount, p.money);
            this.adjustMoney(p, -amount);
            this.adjustMoney(player, amount);
          }
        });
        break;

      case 'per_property_collect':
        const propCount = player.properties.length;
        const total = propCount * card.amount;
        this.adjustMoney(player, total);
        this.log(`${player.name} collects $${total} ($${card.amount} x ${propCount} properties).`, 'success');
        break;

      case 'per_country_bonus':
        const cCount = player.properties.filter(pid => this.getSpace(pid).type === 'country').length;
        const cTotal = cCount * card.amount;
        this.adjustMoney(player, cTotal);
        break;

      case 'per_development_bonus':
        let devTotal = 0;
        player.properties.forEach(pid => {
          const s = this.getSpace(pid);
          if (s.developmentLevel > 0) devTotal += s.developmentLevel * card.amount;
        });
        this.adjustMoney(player, devTotal);
        this.log(`${player.name} collects $${devTotal} from developments.`, 'success');
        break;

      case 'oil_bonus':
        if (player.properties.some(pid => this.getSpace(pid).resource === 'oil')) {
          this.adjustMoney(player, card.amount);
          this.log(`${player.name} collects $${card.amount} from oil surge!`, 'success');
        }
        break;

      case 'agriculture_bonus':
        player.properties.forEach(pid => {
          const s = this.getSpace(pid);
          if (s.resource === 'agriculture' && s.owner === player.id) {
            this.adjustMoney(player, card.amount);
          }
        });
        break;

      case 'tourism_penalty':
        player.properties.forEach(pid => {
          const s = this.getSpace(pid);
          if (s.resource === 'tourism' && s.developmentLevel > 0) {
            this.adjustMoney(player, -(card.amount * s.developmentLevel));
          }
        });
        break;

      case 'lose_percentage':
        const loss = Math.floor(player.money * (card.percent / 100) / 100) * 100;
        this.adjustMoney(player, -loss);
        this.log(`${player.name} loses $${loss} in the currency crisis!`, 'warning');
        break;

      case 'free_all_sanctioned':
        this.state.players.forEach(p => {
          if (p.inSanctions) {
            p.inSanctions = false;
            p.sanctionsTurns = 0;
            this.log(`${p.name} freed from Trade Sanctions!`, 'success');
          }
        });
        break;

      case 'half_rent':
      case 'tech_double_rent':
      case 'tech_half_rent':
        this.state.activeEffects.push({
          type: card.effect,
          expiresRound: this.state.roundNumber + (card.duration || 1)
        });
        break;

      case 'lose_development':
        const expensiveProps = player.properties
          .map(pid => this.getSpace(pid))
          .filter(s => s.developmentLevel > 0)
          .sort((a, b) => b.price - a.price);
        if (expensiveProps.length > 0) {
          expensiveProps[0].developmentLevel--;
          this.log(`${expensiveProps[0].name} loses a development level!`, 'warning');
        }
        break;

      case 'free_upgrade':
        // Mark for player to choose
        this.state.pendingFreeUpgrade = player.id;
        break;

      case 'advance_to':
        this.movePlayerTo(player, card.spaceId, true);
        break;

      case 'advance_tourism':
        // Find nearest tourism country
        for (let i = 1; i < 40; i++) {
          const pos = (player.position + i) % 40;
          const s = this.getSpace(pos);
          if (s.type === 'country' && s.resource === 'tourism') {
            this.movePlayerTo(player, pos, true);
            break;
          }
        }
        break;

      case 'advance_unowned':
        for (let i = 1; i < 40; i++) {
          const pos = (player.position + i) % 40;
          const s = this.getSpace(pos);
          if (s.type === 'country' && !s.owner) {
            this.movePlayerTo(player, pos, true);
            break;
          }
        }
        break;

      case 'arms_deal':
        this.adjustMoney(player, card.collectAmount);
        player.influence = Math.max(0, player.influence - card.influenceLoss);
        this.log(`${player.name} collects $${card.collectAmount} but loses ${card.influenceLoss} influence.`);
        break;

      case 'cultural_exchange':
        this.adjustMoney(player, card.amount);
        player.influence += card.influence;
        break;

      case 'trade_war_tax':
        const alliances = new Set();
        player.properties.forEach(pid => {
          const s = this.getSpace(pid);
          if (s.alliance) alliances.add(s.alliance);
        });
        const tax = alliances.size * card.amount;
        this.adjustMoney(player, -tax);
        this.log(`${player.name} pays $${tax} in trade war tariffs (${alliances.size} alliances).`, 'warning');
        break;

      case 'tech_hub_bonus':
        player.properties.forEach(pid => {
          const s = this.getSpace(pid);
          if (s.developmentLevel >= 3) {
            this.adjustMoney(player, card.amount);
          }
        });
        break;
    }
  }

  // ---- Property Management ----

  buyProperty(playerId) {
    const player = this.getPlayerById(playerId);
    const space = this.getSpace(player.position);

    if (space.owner || !['country', 'transport', 'infrastructure'].includes(space.type)) return false;
    if (player.money < space.price) return false;

    this.adjustMoney(player, -space.price);
    space.owner = playerId;
    player.properties.push(space.id);
    player.influence += 10;

    this.log(`${player.name} purchases ${space.name} for $${space.price}!`, 'purchase');
    this.emitAnimation('purchase', { playerId, spaceId: space.id });
    this.state.phase = 'end-turn';
    this.emit();
    return true;
  }

  declinePurchase() {
    this.state.phase = 'end-turn';
    this.emit();
  }

  developProperty(playerId, spaceId) {
    const player = this.getPlayerById(playerId);
    const space = this.getSpace(spaceId);

    if (space.type !== 'country' || space.owner !== playerId) return false;
    if (!this.hasCompleteAlliance(playerId, space.alliance)) return false;

    const cost = this.getDevelopmentCost(spaceId);
    if (cost === Infinity || player.money < cost) return false;

    this.adjustMoney(player, -cost);
    space.developmentLevel++;
    player.developmentCount++;
    player.influence += 5 * space.developmentLevel;

    const tierName = DEVELOPMENT_TIERS[space.developmentLevel].name;
    this.log(`${player.name} develops ${space.name} to ${tierName} ($${cost})!`, 'development');
    this.emitAnimation('develop', { spaceId, level: space.developmentLevel });
    this.emit();
    return true;
  }

  mortgageProperty(playerId, spaceId) {
    const space = this.getSpace(spaceId);
    if (space.owner !== playerId || space.mortgaged || space.developmentLevel > 0) return false;

    space.mortgaged = true;
    const value = Math.floor(space.price / 2);
    const player = this.getPlayerById(playerId);
    this.adjustMoney(player, value);

    this.log(`${player.name} mortgages ${space.name} for $${value}.`);
    this.emit();
    return true;
  }

  unmortgageProperty(playerId, spaceId) {
    const space = this.getSpace(spaceId);
    if (space.owner !== playerId || !space.mortgaged) return false;

    const cost = Math.floor(space.price * 0.55); // 10% interest
    const player = this.getPlayerById(playerId);
    if (player.money < cost) return false;

    this.adjustMoney(player, -cost);
    space.mortgaged = false;

    this.log(`${player.name} unmortgages ${space.name} for $${cost}.`);
    this.emit();
    return true;
  }

  sellDevelopment(playerId, spaceId) {
    const space = this.getSpace(spaceId);
    if (space.owner !== playerId || space.developmentLevel <= 0) return false;

    const tier = DEVELOPMENT_TIERS[space.developmentLevel];
    const refund = Math.floor(space.price * tier.costMultiplier * 0.5);
    const player = this.getPlayerById(playerId);

    space.developmentLevel--;
    this.adjustMoney(player, refund);

    this.log(`${player.name} sells development on ${space.name} for $${refund}.`);
    this.emit();
    return true;
  }

  // ---- Trading ----

  proposeTrade(fromId, toId, offer) {
    // offer = { giveMoney, getMoney, giveProperties: [ids], getProperties: [ids] }
    const trade = {
      id: generateId(),
      fromId,
      toId,
      ...offer,
      status: 'pending'
    };
    this.state.tradeOffers.push(trade);
    const from = this.getPlayerById(fromId);
    const to = this.getPlayerById(toId);
    this.log(`${from.name} proposes a trade to ${to.name}.`, 'trade');
    this.emit();
    return trade;
  }

  acceptTrade(tradeId) {
    const trade = this.state.tradeOffers.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'pending') return false;

    const from = this.getPlayerById(trade.fromId);
    const to = this.getPlayerById(trade.toId);

    // Validate
    if (from.money < (trade.giveMoney || 0) || to.money < (trade.getMoney || 0)) return false;

    // Execute trade
    if (trade.giveMoney) {
      this.adjustMoney(from, -trade.giveMoney);
      this.adjustMoney(to, trade.giveMoney);
    }
    if (trade.getMoney) {
      this.adjustMoney(to, -trade.getMoney);
      this.adjustMoney(from, trade.getMoney);
    }

    (trade.giveProperties || []).forEach(spaceId => {
      const space = this.getSpace(spaceId);
      space.owner = trade.toId;
      from.properties = from.properties.filter(p => p !== spaceId);
      to.properties.push(spaceId);
    });

    (trade.getProperties || []).forEach(spaceId => {
      const space = this.getSpace(spaceId);
      space.owner = trade.fromId;
      to.properties = to.properties.filter(p => p !== spaceId);
      from.properties.push(spaceId);
    });

    trade.status = 'accepted';
    this.log(`Trade accepted between ${from.name} and ${to.name}!`, 'trade');
    this.emitAnimation('trade', { fromId: trade.fromId, toId: trade.toId });
    this.emit();
    return true;
  }

  rejectTrade(tradeId) {
    const trade = this.state.tradeOffers.find(t => t.id === tradeId);
    if (trade) {
      trade.status = 'rejected';
      this.log(`Trade rejected.`, 'trade');
    }
    this.emit();
  }

  // ---- Influence Actions ----

  useInfluenceAction(playerId, action, targetId) {
    const player = this.getPlayerById(playerId);

    switch (action) {
      case 'embargo':
        // Cost: 200 influence. Target player's properties earn no rent for 1 round
        if (player.influence < 200) return false;
        player.influence -= 200;
        this.state.activeEffects.push({
          type: 'embargo',
          targetId,
          expiresRound: this.state.roundNumber + 1
        });
        const target = this.getPlayerById(targetId);
        this.log(`${player.name} imposes a Trade Embargo on ${target.name}!`, 'influence');
        break;

      case 'summit':
        // Cost: 150 influence. All players gain $500
        if (player.influence < 150) return false;
        player.influence -= 150;
        this.getActivePlayers().forEach(p => this.adjustMoney(p, 500));
        this.log(`${player.name} calls a Summit Meeting! All players receive $500.`, 'influence');
        break;

      case 'development_grant':
        // Cost: 100 influence. Free upgrade on one property
        if (player.influence < 100) return false;
        player.influence -= 100;
        this.state.pendingFreeUpgrade = playerId;
        this.log(`${player.name} uses influence for a Development Grant!`, 'influence');
        break;

      default:
        return false;
    }

    this.emit();
    return true;
  }

  // ---- Turn Management ----

  endTurn() {
    const player = this.getCurrentPlayer();
    player.turnsPlayed++;

    console.log(`[ENGINE] endTurn - Player: ${player.name}, LastDice: ${JSON.stringify(this.state.lastDice)}, InSanctions: ${player.inSanctions}`);

    // Check for doubles - extra turn
    if (this.state.lastDice?.isDoubles && !player.inSanctions && !player.bankrupt) {
      this.state.phase = 'pre-roll';
      this.log(`${player.name} gets another turn (doubles)!`, 'info');
      console.log(`[ENGINE] endTurn - Doubles! Same player gets another turn, phase set to: ${this.state.phase}`);
      this.emit();
      return;
    }

    console.log('[ENGINE] endTurn - No doubles, calling nextTurn');
    this.nextTurn();
  }

  nextTurn() {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length <= 1) {
      this.endGame();
      return;
    }

    // Move to next non-bankrupt player
    let nextIdx = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    let safety = 0;
    while (this.state.players[nextIdx].bankrupt && safety < this.state.players.length) {
      nextIdx = (nextIdx + 1) % this.state.players.length;
      safety++;
    }
    if (safety >= this.state.players.length) { this.endGame(); return; }

    // Check if we completed a round
    if (nextIdx <= this.state.currentPlayerIndex) {
      this.state.roundNumber++;
      this.state.negotiationPhaseUsed = false;

      // Clean up expired effects
      this.state.activeEffects = this.state.activeEffects.filter(
        e => e.expiresRound > this.state.roundNumber
      );

      // Alliance bonuses per round
      this.getActivePlayers().forEach(player => {
        // Oil Nations: $300/turn if complete
        if (this.hasCompleteAlliance(player.id, 'OIL_NATIONS')) {
          this.adjustMoney(player, 300);
          this.log(`${player.name} collects $300 from Oil Royalties!`, 'success');
        }
        // Eastern Partnership: 50 influence/turn
        if (this.hasCompleteAlliance(player.id, 'EASTERN')) {
          player.influence += 50;
        }
        // African Rising: $250/turn
        if (this.hasCompleteAlliance(player.id, 'AFRICAN_RISING')) {
          this.adjustMoney(player, 250);
          this.log(`${player.name} collects $250 from Tourism Income!`, 'success');
        }
        // Americas: free upgrade handled via flag
        if (this.hasCompleteAlliance(player.id, 'AMERICAS')) {
          this.state.pendingFreeUpgrade = player.id;
        }
      });
    }

    this.state.currentPlayerIndex = nextIdx;
    this.state.turnNumber++;
    this.state.phase = 'pre-roll';
    this.state.lastDice = null;
    this.state.currentCard = null;

    console.log(`[ENGINE] nextTurn complete - Turn: ${this.state.turnNumber}, Player: ${this.state.players[nextIdx].name}, Phase: ${this.state.phase}`);

    this.emit();
  }

  // ---- Money & Bankruptcy ----

  adjustMoney(player, amount) {
    player.money += amount;
    if (player.money < 0) player.money = 0;
  }

  checkBankruptcy(player) {
    if (player.money <= 0 && !player.bankrupt) {
      // Check if player has assets to sell
      const hasAssets = player.properties.some(pid => {
        const s = this.getSpace(pid);
        return s.developmentLevel > 0 || !s.mortgaged;
      });

      if (!hasAssets) {
        this.declareBankruptcy(player);
      }
    }
  }

  declareBankruptcy(player) {
    player.bankrupt = true;
    // Return all properties to unowned
    player.properties.forEach(pid => {
      const space = this.getSpace(pid);
      space.owner = null;
      space.developmentLevel = 0;
      space.mortgaged = false;
    });
    player.properties = [];

    this.log(`${player.name} has gone BANKRUPT!`, 'bankrupt');
    this.emitAnimation('bankrupt', { playerId: player.id });
    this.checkWinCondition();
    this.emit();
  }

  // ---- Win Conditions ----

  checkWinCondition() {
    const active = this.getActivePlayers();

    // Check influence victory
    for (const player of active) {
      if (player.influence >= this.state.settings.influenceWin) {
        this.state.winner = player.id;
        this.state.gameOver = true;
        this.log(`${player.name} wins with ${player.influence} Influence Points!`, 'victory');
        this.emitAnimation('victory', { playerId: player.id, type: 'influence' });
        this.emit();
        return;
      }
    }

    // Check last player standing
    if (active.length === 1) {
      this.state.winner = active[0].id;
      this.state.gameOver = true;
      this.log(`${active[0].name} wins as the last player standing!`, 'victory');
      this.emitAnimation('victory', { playerId: active[0].id, type: 'laststanding' });
      this.emit();
      return;
    }

    // Check 2 players remaining - richest wins
    if (active.length === 2 && this.state.players.length > 2) {
      // Game continues until influence or 1 left
    }
  }

  endGame() {
    const active = this.getActivePlayers();
    if (active.length > 0) {
      // Winner is richest by total wealth
      const sorted = active.sort((a, b) => {
        const wealthA = this.calculateTotalWealth(a);
        const wealthB = this.calculateTotalWealth(b);
        return wealthB - wealthA;
      });
      this.state.winner = sorted[0].id;
    }
    this.state.gameOver = true;
    this.emit();
  }

  calculateTotalWealth(player) {
    let wealth = player.money;
    player.properties.forEach(pid => {
      const space = this.getSpace(pid);
      wealth += space.price;
      if (space.developmentLevel > 0) {
        for (let i = 1; i <= space.developmentLevel; i++) {
          wealth += Math.floor(space.price * DEVELOPMENT_TIERS[i].costMultiplier);
        }
      }
    });
    wealth += player.influence * 10; // Influence has monetary value
    return wealth;
  }

  // ---- Serialization ----

  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }

  static deserialize(data) {
    return new GameEngine(data);
  }
}
