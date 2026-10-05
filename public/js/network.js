// Counter-Strike 1.6 Direct IP Multiplayer Network Client

export class NetworkClient {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.isConnected = false;
    this.ping = 15;
    this.serverIp = '';
    this.handlers = {};

    this.lastPingSent = 0;
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  trigger(event, data) {
    if (this.handlers[event]) {
      this.handlers[event](data);
    }
  }

  connect(targetIp, playerName, team = 'T') {
    return new Promise((resolve, reject) => {
      let wsUrl = '';
      if (!targetIp || targetIp.trim() === '') {
        // Default to current host
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${proto}//${window.location.host}`;
      } else {
        targetIp = targetIp.trim();
        if (!targetIp.startsWith('ws://') && !targetIp.startsWith('wss://')) {
          const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
          wsUrl = `${proto}${targetIp}`;
        } else {
          wsUrl = targetIp;
        }
      }

      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      this.serverIp = targetIp || window.location.host;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        return reject(err);
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        this.send({
          type: 'set_team',
          team: team,
          name: playerName
        });
        this.startPingLoop();
        resolve(this);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.trigger('disconnected', {});
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse incoming message:', e);
        }
      };
    });
  }

  async getServerInfo() {
    try {
      const res = await fetch('/api/server-info');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch server-info', e);
    }
    return {
      hostname: 'CS 1.6 Dust II Dedicated Server',
      localIps: this.serverIps || [],
      port: 3000,
      playersCount: 1,
      round: 1
    };
  }

  startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSent = performance.now();
        this.send({ type: 'ping', time: this.lastPingSent });
      }
    }, 2000);
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'welcome':
        this.playerId = msg.playerId;
        this.serverIps = msg.serverIps || [];
        this.serverPort = msg.port || 3000;
        this.trigger('welcome', msg);
        break;

      case 'pong':
        this.ping = Math.round(performance.now() - msg.time);
        this.trigger('ping_update', this.ping);
        break;

      case 'player_joined':
        this.trigger('player_joined', msg.player);
        break;

      case 'player_left':
        this.trigger('player_left', msg.id);
        break;

      case 'player_moved':
        this.trigger('player_moved', msg);
        break;

      case 'player_shot':
        this.trigger('player_shot', msg);
        break;

      case 'player_damaged':
        this.trigger('player_damaged', msg);
        break;

      case 'player_killed':
        this.trigger('player_killed', msg);
        break;

      case 'bomb_planted':
        this.trigger('bomb_planted', msg);
        break;

      case 'bomb_tick':
        this.trigger('bomb_tick', msg.timer);
        break;

      case 'bomb_defused':
        this.trigger('bomb_defused', msg);
        break;

      case 'round_start':
        this.trigger('round_start', msg);
        break;

      case 'round_live':
        this.trigger('round_live', msg);
        break;

      case 'round_end':
        this.trigger('round_end', msg);
        break;

      case 'chat_message':
        this.trigger('chat_message', msg);
        break;

      case 'buy_success':
        this.trigger('buy_success', msg);
        break;

      case 'buy_failed':
        this.trigger('buy_failed', msg);
        break;
    }
  }

  send(data) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendMove(pos, yaw, pitch, isCrouching, isWalking) {
    this.send({
      type: 'player_move',
      x: pos.x,
      y: pos.y,
      z: pos.z,
      yaw: yaw,
      pitch: pitch,
      isCrouching: isCrouching,
      isWalking: isWalking
    });
  }

  sendShoot(weaponId, origin, direction) {
    this.send({
      type: 'player_shoot',
      weapon: weaponId,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z }
    });
  }

  sendHit(targetId, damage, weaponId, isHeadshot) {
    this.send({
      type: 'player_hit',
      targetId: targetId,
      damage: damage,
      weapon: weaponId,
      isHeadshot: isHeadshot
    });
  }

  sendPlant(site) {
    this.send({
      type: 'plant_bomb',
      site: site
    });
  }

  sendDefuse() {
    this.send({
      type: 'defuse_bomb'
    });
  }

  sendBuy(itemId, cost, itemType = 'weapon') {
    this.send({
      type: 'buy_item',
      itemId: itemId,
      cost: cost,
      itemType: itemType
    });
  }

  sendChat(text, isTeamOnly = false) {
    this.send({
      type: 'chat',
      text: text,
      isTeamOnly: isTeamOnly
    });
  }
}
