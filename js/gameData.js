// ============================================================
// GLOBAL ECONOMIC WARS - Game Data Configuration
// ============================================================

export const ALLIANCES = {
  EU: {
    id: 'EU',
    name: 'European Union',
    color: '#003399',
    lightColor: '#4d79cc',
    bonus: 'Double rent from all EU countries',
    resource: 'tech'
  },
  EASTERN: {
    id: 'EASTERN',
    name: 'Eastern Partnership',
    color: '#8B4513',
    lightColor: '#b87333',
    bonus: 'Earn 50 influence per turn',
    resource: 'agriculture'
  },
  ASIAN_TIGERS: {
    id: 'ASIAN_TIGERS',
    name: 'Asian Tigers',
    color: '#DC143C',
    lightColor: '#ff4d6a',
    bonus: 'Tech Hub costs reduced by 50%',
    resource: 'tech'
  },
  SOUTH_ASIAN: {
    id: 'SOUTH_ASIAN',
    name: 'South Asian Union',
    color: '#FF8C00',
    lightColor: '#ffb347',
    bonus: 'Collect $200 when any player lands on your properties',
    resource: 'agriculture'
  },
  BRICS: {
    id: 'BRICS',
    name: 'BRICS Nations',
    color: '#228B22',
    lightColor: '#4dbd4d',
    bonus: '+100 influence when collecting rent',
    resource: 'oil'
  },
  OIL_NATIONS: {
    id: 'OIL_NATIONS',
    name: 'Oil Nations',
    color: '#000000',
    lightColor: '#4d4d4d',
    bonus: 'Collect oil royalties: $300/turn',
    resource: 'oil'
  },
  AMERICAS: {
    id: 'AMERICAS',
    name: 'Americas',
    color: '#4169E1',
    lightColor: '#7094e8',
    bonus: 'Free development upgrade once per round',
    resource: 'tourism'
  },
  AFRICAN_RISING: {
    id: 'AFRICAN_RISING',
    name: 'African Rising',
    color: '#9932CC',
    lightColor: '#b366d9',
    bonus: 'Tourism income: $250/turn',
    resource: 'tourism'
  }
};

export const RESOURCES = {
  oil: { name: 'Oil', icon: '🛢️', description: '+10% rent for each oil country owned' },
  tech: { name: 'Technology', icon: '💻', description: '+10% rent for each tech country owned' },
  agriculture: { name: 'Agriculture', icon: '🌾', description: '+10% rent for each agri country owned' },
  tourism: { name: 'Tourism', icon: '✈️', description: '+10% rent for each tourism country owned' }
};

export const DEVELOPMENT_TIERS = [
  { level: 0, name: 'Undeveloped', icon: '', multiplier: 1 },
  { level: 1, name: 'Local Markets', icon: '🏪', multiplier: 2, costMultiplier: 0.5 },
  { level: 2, name: 'Factories', icon: '🏭', multiplier: 3, costMultiplier: 0.75 },
  { level: 3, name: 'Tech Hubs', icon: '🏙️', multiplier: 5, costMultiplier: 1.0 },
  { level: 4, name: 'Economic Capital', icon: '🏛️', multiplier: 8, costMultiplier: 1.5 }
];

// Final Board Layout - 40 spaces
// 22 countries across 8 alliances, 4 special, 6 cards, 2 tax, 4 transport, 2 infrastructure

export const BOARD = [
  // === BOTTOM ROW (positions 0-10) ===
  { id: 0, type: 'special', subtype: 'go', name: 'Global Summit', icon: '🌐' },
  { id: 1, type: 'country', name: 'Moldova', alliance: 'EASTERN', price: 600, flag: '🇲🇩', resource: 'agriculture', rents: [20, 40, 120, 360, 640, 900] },
  { id: 2, type: 'card', subtype: 'diplomaticCable', name: 'Diplomatic Cable', icon: '📜' },
  { id: 3, type: 'country', name: 'Armenia', alliance: 'EASTERN', price: 800, flag: '🇦🇲', resource: 'tech', rents: [30, 60, 180, 500, 700, 1000], featured: true },
  { id: 4, type: 'tax', name: 'Import Tariff', amount: 200, icon: '💰' },
  { id: 5, type: 'transport', name: 'Maritime Routes', price: 2000, icon: '🚢', rents: [250, 500, 1000, 2000] },
  { id: 6, type: 'country', name: 'Ukraine', alliance: 'EASTERN', price: 1000, flag: '🇺🇦', resource: 'agriculture', rents: [40, 80, 220, 600, 800, 1100] },
  { id: 7, type: 'card', subtype: 'globalNews', name: 'Global News', icon: '📰' },
  { id: 8, type: 'country', name: 'Nigeria', alliance: 'AFRICAN_RISING', price: 1000, flag: '🇳🇬', resource: 'oil', rents: [40, 80, 220, 600, 800, 1100] },
  { id: 9, type: 'country', name: 'Kenya', alliance: 'AFRICAN_RISING', price: 1200, flag: '🇰🇪', resource: 'tourism', rents: [50, 100, 300, 750, 950, 1300] },
  { id: 10, type: 'special', subtype: 'sanctions', name: 'Trade Sanctions', icon: '⛔' },

  // === LEFT COLUMN (positions 11-20) ===
  { id: 11, type: 'country', name: 'Egypt', alliance: 'AFRICAN_RISING', price: 1200, flag: '🇪🇬', resource: 'tourism', rents: [50, 100, 300, 750, 950, 1300] },
  { id: 12, type: 'infrastructure', name: 'Internet Backbone', price: 1500, icon: '🌐' },
  { id: 13, type: 'country', name: 'South Africa', alliance: 'BRICS', price: 1400, flag: '🇿🇦', resource: 'tourism', rents: [55, 110, 330, 800, 1050, 1400] },
  { id: 14, type: 'country', name: 'India', alliance: 'SOUTH_ASIAN', price: 1600, flag: '🇮🇳', resource: 'tech', rents: [65, 130, 400, 950, 1150, 1500], featured: true },
  { id: 15, type: 'transport', name: 'Rail Networks', price: 2000, icon: '🚂', rents: [250, 500, 1000, 2000] },
  { id: 16, type: 'country', name: 'Bangladesh', alliance: 'SOUTH_ASIAN', price: 1400, flag: '🇧🇩', resource: 'agriculture', rents: [55, 110, 330, 800, 1050, 1400] },
  { id: 17, type: 'card', subtype: 'diplomaticCable', name: 'Diplomatic Cable', icon: '📜' },
  { id: 18, type: 'country', name: 'Sri Lanka', alliance: 'SOUTH_ASIAN', price: 1600, flag: '🇱🇰', resource: 'tourism', rents: [65, 130, 400, 950, 1150, 1500] },
  { id: 19, type: 'country', name: 'Nepal', alliance: 'SOUTH_ASIAN', price: 1200, flag: '🇳🇵', resource: 'tourism', rents: [50, 100, 300, 750, 950, 1300] },
  { id: 20, type: 'special', subtype: 'freetrade', name: 'Free Trade Zone', icon: '🆓' },

  // === TOP ROW (positions 21-30) ===
  { id: 21, type: 'country', name: 'France', alliance: 'EU', price: 2200, flag: '🇫🇷', resource: 'tourism', rents: [85, 170, 500, 1100, 1400, 1800] },
  { id: 22, type: 'card', subtype: 'globalNews', name: 'Global News', icon: '📰' },
  { id: 23, type: 'country', name: 'Germany', alliance: 'EU', price: 2400, flag: '🇩🇪', resource: 'tech', rents: [90, 180, 540, 1200, 1500, 2000] },
  { id: 24, type: 'country', name: 'United Kingdom', alliance: 'EU', price: 2400, flag: '🇬🇧', resource: 'tech', rents: [90, 180, 540, 1200, 1500, 2000] },
  { id: 25, type: 'transport', name: 'Air Routes', price: 2000, icon: '✈️', rents: [250, 500, 1000, 2000] },
  { id: 26, type: 'country', name: 'Japan', alliance: 'ASIAN_TIGERS', price: 2800, flag: '🇯🇵', resource: 'tech', rents: [110, 220, 660, 1500, 1800, 2400] },
  { id: 27, type: 'country', name: 'South Korea', alliance: 'ASIAN_TIGERS', price: 2600, flag: '🇰🇷', resource: 'tech', rents: [100, 200, 600, 1400, 1700, 2200] },
  { id: 28, type: 'infrastructure', name: 'Shipping Lanes', price: 1500, icon: '⚓' },
  { id: 29, type: 'country', name: 'China', alliance: 'BRICS', price: 3000, flag: '🇨🇳', resource: 'tech', rents: [120, 240, 720, 1600, 2000, 2600] },
  { id: 30, type: 'special', subtype: 'incident', name: 'International Incident', icon: '🚨' },

  // === RIGHT COLUMN (positions 31-39) ===
  { id: 31, type: 'country', name: 'Brazil', alliance: 'BRICS', price: 2800, flag: '🇧🇷', resource: 'agriculture', rents: [110, 220, 660, 1500, 1800, 2400] },
  { id: 32, type: 'country', name: 'Singapore', alliance: 'ASIAN_TIGERS', price: 2600, flag: '🇸🇬', resource: 'tech', rents: [100, 200, 600, 1400, 1700, 2200] },
  { id: 33, type: 'card', subtype: 'diplomaticCable', name: 'Diplomatic Cable', icon: '📜' },
  { id: 34, type: 'country', name: 'Saudi Arabia', alliance: 'OIL_NATIONS', price: 3200, flag: '🇸🇦', resource: 'oil', rents: [130, 260, 780, 1800, 2200, 2800] },
  { id: 35, type: 'transport', name: 'Digital Networks', price: 2000, icon: '📡', rents: [250, 500, 1000, 2000] },
  { id: 36, type: 'country', name: 'Canada', alliance: 'AMERICAS', price: 3200, flag: '🇨🇦', resource: 'agriculture', rents: [130, 260, 780, 1800, 2200, 2800] },
  { id: 37, type: 'country', name: 'UAE', alliance: 'OIL_NATIONS', price: 3400, flag: '🇦🇪', resource: 'oil', rents: [140, 280, 840, 1900, 2400, 3000] },
  { id: 38, type: 'tax', name: 'Luxury Tax', amount: 300, icon: '💎' },
  { id: 39, type: 'country', name: 'USA', alliance: 'AMERICAS', price: 4000, flag: '🇺🇸', resource: 'tech', rents: [150, 300, 900, 2000, 2500, 3200] }
];

// Global News Cards (16+)
export const GLOBAL_NEWS_CARDS = [
  { id: 'gn1', title: 'Global Pandemic', text: 'Tourism industry collapses. All tourism countries pay $100 per development level.', effect: 'tourism_penalty', amount: 100 },
  { id: 'gn2', title: 'Oil Price Surge', text: 'Oil prices skyrocket! Oil country owners collect $200 from the bank.', effect: 'oil_bonus', amount: 200 },
  { id: 'gn3', title: 'Tech Boom', text: 'Silicon Valley effect! Tech countries earn double rent this round.', effect: 'tech_double_rent', duration: 1 },
  { id: 'gn4', title: 'Climate Summit', text: 'Green initiative grants! Receive $50 per country you own.', effect: 'per_country_bonus', amount: 50 },
  { id: 'gn5', title: 'Trade War', text: 'Tariffs everywhere! All players pay $100 per foreign alliance they own properties in.', effect: 'trade_war_tax', amount: 100 },
  { id: 'gn6', title: 'World Cup Hosting', text: 'Tourism boost! Advance to the nearest tourism country. If unowned, you may buy it at half price.', effect: 'advance_tourism', discount: 0.5 },
  { id: 'gn7', title: 'Refugee Crisis', text: 'Humanitarian costs. Pay $300 to the bank.', effect: 'pay_bank', amount: 300 },
  { id: 'gn8', title: 'Space Race', text: 'Technological advancement! All Tech Hub developments earn +$100 this round.', effect: 'tech_hub_bonus', amount: 100 },
  { id: 'gn9', title: 'Currency Crisis', text: 'Markets crash! All players lose 10% of their cash (rounded to nearest $100).', effect: 'lose_percentage', percent: 10 },
  { id: 'gn10', title: 'Peace Treaty', text: 'Diplomatic breakthrough! All players in Trade Sanctions are freed.', effect: 'free_all_sanctioned' },
  { id: 'gn11', title: 'Agricultural Revolution', text: 'Bumper harvest! Agriculture countries pay owners $150 bonus.', effect: 'agriculture_bonus', amount: 150 },
  { id: 'gn12', title: 'Infrastructure Boom', text: 'Government spending! Each development you own earns $25.', effect: 'per_development_bonus', amount: 25 },
  { id: 'gn13', title: 'Economic Recession', text: 'Markets downturn. Rent is halved for all properties this round.', effect: 'half_rent', duration: 1 },
  { id: 'gn14', title: 'G20 Summit', text: 'International cooperation! Gain 100 influence points.', effect: 'gain_influence', amount: 100 },
  { id: 'gn15', title: 'Earthquake', text: 'Natural disaster! Your most expensive property loses 1 development level.', effect: 'lose_development' },
  { id: 'gn16', title: 'UN Aid Package', text: 'Humanitarian aid! Collect $200 from the bank.', effect: 'collect_bank', amount: 200 },
  { id: 'gn17', title: 'Crypto Crash', text: 'Digital currencies collapse! Tech country rents halved this round.', effect: 'tech_half_rent', duration: 1 },
  { id: 'gn18', title: 'Olympic Games', text: 'Sports brings unity! Every player gains 25 influence.', effect: 'all_gain_influence', amount: 25 }
];

// Diplomatic Cable Cards (16+)
export const DIPLOMATIC_CABLE_CARDS = [
  { id: 'dc1', title: 'Foreign Investment', text: 'A wealthy investor backs your ventures. Collect $500.', effect: 'collect', amount: 500 },
  { id: 'dc2', title: 'Embassy Donation', text: 'Your embassy receives a generous donation. Collect $200.', effect: 'collect', amount: 200 },
  { id: 'dc3', title: 'Trade Agreement', text: 'New bilateral trade deal! Advance to Global Summit and collect salary.', effect: 'advance_go' },
  { id: 'dc4', title: 'Diplomatic Immunity', text: 'Get out of Trade Sanctions free. Keep this card until used.', effect: 'get_out_free', keepable: true },
  { id: 'dc5', title: 'Tax Haven', text: 'You discover an offshore account. Collect $100 per property owned.', effect: 'per_property_collect', amount: 100 },
  { id: 'dc6', title: 'Spy Scandal', text: 'Intelligence leak! Pay each player $50.', effect: 'pay_all_players', amount: 50 },
  { id: 'dc7', title: 'Summit Invitation', text: 'VIP invitation! Gain 75 influence points.', effect: 'gain_influence', amount: 75 },
  { id: 'dc8', title: 'Infrastructure Grant', text: 'Development grant! Free development upgrade on any country you own.', effect: 'free_upgrade' },
  { id: 'dc9', title: 'Border Dispute', text: 'Territorial tensions! Go to Trade Sanctions.', effect: 'go_sanctions' },
  { id: 'dc10', title: 'Peace Envoy', text: 'Diplomatic mission! Advance to nearest unowned country and you may buy it.', effect: 'advance_unowned' },
  { id: 'dc11', title: 'Aid Package', text: 'International aid received. Collect $300.', effect: 'collect', amount: 300 },
  { id: 'dc12', title: 'Election Scandal', text: 'Political crisis at home! Pay $200 in damage control.', effect: 'pay', amount: 200 },
  { id: 'dc13', title: 'Trade Delegation', text: 'Successful delegation! Collect $25 from each player.', effect: 'collect_from_all', amount: 25 },
  { id: 'dc14', title: 'Arms Deal', text: 'Controversial but profitable. Collect $400 but lose 50 influence.', effect: 'arms_deal', collectAmount: 400, influenceLoss: 50 },
  { id: 'dc15', title: 'Cultural Exchange', text: 'Soft power initiative! Gain 50 influence and collect $100.', effect: 'cultural_exchange', influence: 50, amount: 100 },
  { id: 'dc16', title: 'Cyber Attack', text: 'Your systems compromised! Pay $150 in recovery costs.', effect: 'pay', amount: 150 },
  { id: 'dc17', title: 'Advance to India', text: 'Special economic summit in Mumbai! Advance to India.', effect: 'advance_to', spaceId: 14 },
  { id: 'dc18', title: 'Heritage Fund', text: 'Cultural heritage grant! Collect $250.', effect: 'collect', amount: 250 }
];

export const PLAYER_COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
  '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'
];

export const PLAYER_AVATARS = ['🧳', '📋', '🎩', '👔', '🗂️', '💼', '📊', '🏆'];

export const STARTING_MONEY = 15000;
export const GO_SALARY = 2000;
export const SANCTIONS_BAIL = 500;
export const INFLUENCE_TO_WIN = 1000;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
