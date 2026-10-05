const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Game State Management
const gameState = {
  roundNumber: 1,
  roundState: 'freeze', // freeze, live, bomb_planted, round_ended
  roundTimer: 5,        // freeze time 5 seconds
  tScore: 0,
  ctScore: 0,
  tConsecutiveLosses: 0,
  ctConsecutiveLosses: 0,
  bomb: {
    planted: false,
    defused: false,
    exploded: false,
    site: null, // 'A' or 'B'
    position: null,
    timer: 45,
    planterId: null
  }
};

const players = {};
let nextPlayerId = 1;

// Helper to get local IP address
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Health check endpoint for 24/7 uptime monitoring (UptimeRobot, Pingdom, etc.)
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: Date.now(),
    playersCount: Object.keys(players).length,
    round: gameState.roundNumber
  });
});

// Server info endpoint for CS 1.6 status console command
app.get('/api/server-info', (req, res) => {
  const localIps = getLocalIpAddresses();
  res.json({
    hostname: 'CS 1.6 Dust II Dedicated Server',
    version: '1.6.0-web',
    localIps: localIps,
    port: PORT,
    playersCount: Object.keys(players).length,
    players: Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      ping: p.ping
    })),
    round: gameState.roundNumber,
    roundState: gameState.roundState,
    scores: { t: gameState.tScore, ct: gameState.ctScore }
  });
});

// Spawn Points for Dust2 (x, y, z, yaw)
const SPAWN_POINTS = {
  T: [
    { x: -50, y: 1.5, z: 90, yaw: 0 },
    { x: -45, y: 1.5, z: 95, yaw: 0 },
    { x: -55, y: 1.5, z: 95, yaw: 0 },
    { x: -40, y: 1.5, z: 100, yaw: 0 },
    { x: -60, y: 1.5, z: 100, yaw: 0 }
  ],
  CT: [
    { x: 30, y: 1.5, z: -85, yaw: Math.PI },
    { x: 35, y: 1.5, z: -90, yaw: Math.PI },
    { x: 25, y: 1.5, z: -90, yaw: Math.PI },
    { x: 40, y: 1.5, z: -95, yaw: Math.PI },
    { x: 20, y: 1.5, z: -95, yaw: Math.PI }
  ]
};

// Calculate Round End Economy
function distributeRoundEconomy(winnerTeam, reason) {
  // CS 1.6 rules:
  // Win bonus: $3250 (elimination) / $3500 (bomb exploded or defused)
  // Loss base: $1400 + $500 per consecutive loss (max $3400)
  // Bomb planted bonus: $800 to all T even if lost
  const isBombWin = reason === 'bomb_exploded' || reason === 'bomb_defused';
  const winReward = isBombWin ? 3500 : 3250;

  if (winnerTeam === 'T') {
    gameState.tScore++;
    gameState.tConsecutiveLosses = 0;
    gameState.ctConsecutiveLosses = Math.min(4, gameState.ctConsecutiveLosses + 1);
  } else if (winnerTeam === 'CT') {
    gameState.ctScore++;
    gameState.ctConsecutiveLosses = 0;
    gameState.tConsecutiveLosses = Math.min(4, gameState.tConsecutiveLosses + 1);
  }

  const ctLossReward = 1400 + gameState.ctConsecutiveLosses * 500;
  const tLossReward = 1400 + gameState.tConsecutiveLosses * 500 + (gameState.bomb.planted ? 800 : 0);

  // Apply money to players
  for (const id in players) {
    const p = players[id];
    if (p.team === winnerTeam) {
      p.money = Math.min(16000, p.money + winReward);
    } else if (p.team === 'T') {
      p.money = Math.min(16000, p.money + tLossReward);
    } else if (p.team === 'CT') {
      p.money = Math.min(16000, p.money + ctLossReward);
    }
  }

  broadcast({
    type: 'round_end',
    winner: winnerTeam,
    reason: reason,
    tScore: gameState.tScore,
    ctScore: gameState.ctScore,
    economy: {
      tReward: winnerTeam === 'T' ? winReward : tLossReward,
      ctReward: winnerTeam === 'CT' ? winReward : ctLossReward
    }
  });

  // Schedule next round after 6 seconds
  setTimeout(() => {
    startNewRound();
  }, 6000);
}

// Start a fresh round
function startNewRound() {
  gameState.roundNumber++;
  gameState.roundState = 'freeze';
  gameState.roundTimer = 5; // 5s buy / freeze time
  gameState.bomb = {
    planted: false,
    defused: false,
    exploded: false,
    site: null,
    position: null,
    timer: 45,
    planterId: null
  };

  // Reset living states and respawn players at designated spawns
  let tIndex = 0;
  let ctIndex = 0;
  const tPlayers = [];

  for (const id in players) {
    const p = players[id];
    p.health = 100;
    p.isAlive = true;
    p.hasC4 = false;

    if (p.team === 'T') {
      const spawn = SPAWN_POINTS.T[tIndex % SPAWN_POINTS.T.length];
      tIndex++;
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
      p.yaw = spawn.yaw;
      tPlayers.push(p);
    } else if (p.team === 'CT') {
      const spawn = SPAWN_POINTS.CT[ctIndex % SPAWN_POINTS.CT.length];
      ctIndex++;
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
      p.yaw = spawn.yaw;
    }
  }

  // Randomly assign C4 to one Terrorist
  if (tPlayers.length > 0) {
    const luckyT = tPlayers[Math.floor(Math.random() * tPlayers.length)];
    luckyT.hasC4 = true;
  }

  broadcast({
    type: 'round_start',
    roundNumber: gameState.roundNumber,
    roundTimer: gameState.roundTimer,
    roundState: gameState.roundState,
    players: players
  });
}

// Global Match Clock Loop (1 second tick)
setInterval(() => {
  if (gameState.roundState === 'freeze') {
    gameState.roundTimer--;
    if (gameState.roundTimer <= 0) {
      gameState.roundState = 'live';
      gameState.roundTimer = 115; // 1:55 standard CS round time
      broadcast({
        type: 'round_live',
        roundTimer: gameState.roundTimer
      });
    }
  } else if (gameState.roundState === 'live') {
    gameState.roundTimer--;
    if (gameState.roundTimer <= 0) {
      // Time ran out! Counter-Terrorists win if bomb not planted
      gameState.roundState = 'round_ended';
      distributeRoundEconomy('CT', 'time_expired');
    }
  } else if (gameState.roundState === 'bomb_planted') {
    gameState.bomb.timer--;
    broadcast({
      type: 'bomb_tick',
      timer: gameState.bomb.timer
    });

    if (gameState.bomb.timer <= 0) {
      // Bomb explodes! Terrorists win
      gameState.roundState = 'round_ended';
      gameState.bomb.exploded = true;
      distributeRoundEconomy('T', 'bomb_exploded');
    }
  }
}, 1000);

// Check if a team is completely eliminated
function checkTeamElimination() {
  if (gameState.roundState !== 'live' && gameState.roundState !== 'bomb_planted') return;

  let liveT = 0;
  let liveCT = 0;
  let totalT = 0;
  let totalCT = 0;

  for (const id in players) {
    const p = players[id];
    if (p.team === 'T') {
      totalT++;
      if (p.isAlive) liveT++;
    } else if (p.team === 'CT') {
      totalCT++;
      if (p.isAlive) liveCT++;
    }
  }

  if (totalT === 0 || totalCT === 0) return; // Wait for players

  if (liveT === 0) {
    if (gameState.roundState === 'bomb_planted') {
      // Bomb is planted: CT must defuse even if all T are dead!
      return;
    }
    // CT win by elimination
    gameState.roundState = 'round_ended';
    distributeRoundEconomy('CT', 't_eliminated');
  } else if (liveCT === 0) {
    // T win by elimination
    gameState.roundState = 'round_ended';
    distributeRoundEconomy('T', 'ct_eliminated');
  }
}

// Broadcast message to all connected clients
function broadcast(data, excludeWs = null) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(msg);
    }
  });
}

// WebSocket Connection Handling
wss.on('connection', (ws, req) => {
  const playerId = 'player_' + (nextPlayerId++);
  const clientIp = req.socket.remoteAddress;

  // Initial Player Record
  const newPlayer = {
    id: playerId,
    name: 'CS_Player_' + playerId.split('_')[1],
    team: 'T', // Default T or CT
    model: 'phoenix',
    x: -50,
    y: 1.5,
    z: 90,
    yaw: 0,
    pitch: 0,
    health: 100,
    armor: 100,
    hasHelmet: false,
    money: 800,
    kills: 0,
    deaths: 0,
    ping: 15,
    isAlive: true,
    hasC4: false,
    weapon: 'ak47',
    isCrouching: false,
    isFiring: false,
    isReloading: false
  };

  players[playerId] = newPlayer;

  // Send Welcome Packet with complete world state
  ws.send(JSON.stringify({
    type: 'welcome',
    playerId: playerId,
    gameState: gameState,
    players: players,
    serverIps: getLocalIpAddresses(),
    port: PORT
  }));

  // Notify other players
  broadcast({
    type: 'player_joined',
    player: newPlayer
  }, ws);

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = players[playerId];
      if (!player) return;

      switch (data.type) {
        case 'set_team':
          player.team = data.team; // 'T' or 'CT'
          player.model = data.model || (data.team === 'T' ? 'phoenix' : 'urban');
          player.name = data.name || player.name;

          // Reposition to appropriate spawn
          const spawns = SPAWN_POINTS[player.team];
          const spawn = spawns[Math.floor(Math.random() * spawns.length)];
          player.x = spawn.x;
          player.y = spawn.y;
          player.z = spawn.z;
          player.yaw = spawn.yaw;

          broadcast({
            type: 'player_updated',
            player: player
          });
          break;

        case 'player_move':
          // Update position and rotation
          player.x = data.x;
          player.y = data.y;
          player.z = data.z;
          player.yaw = data.yaw;
          player.pitch = data.pitch;
          player.isCrouching = data.isCrouching || false;
          player.isWalking = data.isWalking || false;

          // Forward to all other clients with minimal delay
          broadcast({
            type: 'player_moved',
            id: playerId,
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
            pitch: player.pitch,
            isCrouching: player.isCrouching,
            isWalking: player.isWalking
          }, ws);
          break;

        case 'player_shoot':
          broadcast({
            type: 'player_shot',
            id: playerId,
            weapon: data.weapon,
            origin: data.origin,
            direction: data.direction
          }, ws);
          break;

        case 'player_hit':
          // Server verified hit & damage
          const target = players[data.targetId];
          if (target && target.isAlive) {
            const damage = data.damage || 25;
            target.health = Math.max(0, target.health - damage);

            if (target.health <= 0) {
              target.isAlive = false;
              target.deaths++;
              player.kills++;
              player.money = Math.min(16000, player.money + 300); // +$300 CS frag reward

              // Check if killed player had C4
              if (target.hasC4) {
                target.hasC4 = false;
                broadcast({
                  type: 'bomb_dropped',
                  position: { x: target.x, y: target.y, z: target.z }
                });
              }

              broadcast({
                type: 'player_killed',
                killerId: playerId,
                killerName: player.name,
                killerTeam: player.team,
                victimId: target.id,
                victimName: target.name,
                victimTeam: target.team,
                weapon: data.weapon,
                isHeadshot: data.isHeadshot || false
              });

              checkTeamElimination();
            } else {
              broadcast({
                type: 'player_damaged',
                targetId: target.id,
                health: target.health,
                damage: damage
              });
            }
          }
          break;

        case 'plant_bomb':
          if (gameState.roundState === 'live' && player.team === 'T' && player.isAlive) {
            gameState.roundState = 'bomb_planted';
            gameState.bomb.planted = true;
            gameState.bomb.site = data.site || 'A';
            gameState.bomb.position = { x: player.x, y: player.y, z: player.z };
            gameState.bomb.timer = 45;
            gameState.bomb.planterId = playerId;
            player.hasC4 = false;

            // Planter gets $300 immediate bonus
            player.money = Math.min(16000, player.money + 300);

            broadcast({
              type: 'bomb_planted',
              site: gameState.bomb.site,
              position: gameState.bomb.position,
              planterName: player.name
            });
          }
          break;

        case 'defuse_bomb':
          if (gameState.roundState === 'bomb_planted' && player.team === 'CT' && player.isAlive) {
            gameState.roundState = 'round_ended';
            gameState.bomb.defused = true;

            // Defuser gets +$300 bonus
            player.money = Math.min(16000, player.money + 300);

            broadcast({
              type: 'bomb_defused',
              defuserName: player.name
            });

            distributeRoundEconomy('CT', 'bomb_defused');
          }
          break;

        case 'buy_item':
          if (gameState.roundState === 'freeze' || gameState.roundTimer >= 100) {
            const cost = data.cost || 0;
            if (player.money >= cost) {
              player.money -= cost;
              if (data.itemType === 'weapon') {
                player.weapon = data.itemId;
              } else if (data.itemId === 'kevlar') {
                player.armor = 100;
              } else if (data.itemId === 'helmet') {
                player.armor = 100;
                player.hasHelmet = true;
              } else if (data.itemId === 'defuser' && player.team === 'CT') {
                player.hasDefuser = true;
              }

              ws.send(JSON.stringify({
                type: 'buy_success',
                item: data.itemId,
                money: player.money,
                weapon: player.weapon,
                armor: player.armor,
                hasHelmet: player.hasHelmet,
                hasDefuser: player.hasDefuser
              }));

              broadcast({
                type: 'player_updated',
                player: player
              });
            } else {
              ws.send(JSON.stringify({
                type: 'buy_failed',
                reason: 'Insufficient funds'
              }));
            }
          }
          break;

        case 'chat':
          broadcast({
            type: 'chat_message',
            sender: player.name,
            team: player.team,
            text: (data.text || '').substring(0, 120),
            isTeamOnly: data.isTeamOnly || false
          });
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', time: data.time }));
          break;
      }
    } catch (e) {
      console.error('Error parsing client message:', e);
    }
  });

  ws.on('close', () => {
    delete players[playerId];
    broadcast({
      type: 'player_left',
      id: playerId
    });
    checkTeamElimination();
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log('====================================================');
  console.log('       COUNTER-STRIKE 1.6 DUST II ONLINE SERVER     ');
  console.log('====================================================');
  console.log(`Port: ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
  if (localIps.length > 0) {
    console.log('Multiplayer Network IP Addresses (Share with friends):');
    localIps.forEach(ip => {
      console.log(` -> http://${ip}:${PORT}`);
      console.log(` -> Direct IP for client: ${ip}:${PORT}`);
    });
  }
  console.log('Health Endpoint: /health (for 24/7 uptime ping)');
  console.log('====================================================');
});
