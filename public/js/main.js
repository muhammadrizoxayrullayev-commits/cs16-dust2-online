import { NetworkClient } from './network.js';
import { GameEngine } from './game.js';
import { CS_WEAPONS } from './economy.js';
import { CSConsole } from './console.js';

function initApp() {
  const canvas = document.getElementById('game-canvas');
  const network = new NetworkClient();
  let game = null;
  let csConsole = null;

  // FPS Counter tracking
  let lastFpsTime = performance.now();
  let frameCount = 0;
  const fpsElem = document.getElementById('fps-counter');

  // Connection UI Elements
  const connectModal = document.getElementById('connect-modal');
  const serverIpInput = document.getElementById('server-ip-input');
  const playerNameInput = document.getElementById('player-name-input');
  const quickPlayBtn = document.getElementById('quick-play-btn');
  const joinBtn = document.getElementById('join-btn');
  const connectStatus = document.getElementById('connect-status');

  // Pre-fill default host
  if (serverIpInput) {
    serverIpInput.value = window.location.host || 'localhost:3000';
  }

  // Team Selection Buttons in Connect Modal
  let selectedTeam = 'T';
  const teamBtns = document.querySelectorAll('.team-card');
  teamBtns.forEach(card => {
    card.addEventListener('click', () => {
      teamBtns.forEach(c => c.style.borderColor = '#495e49');
      card.style.borderColor = card.dataset.team === 'T' ? '#e5973b' : '#58a0e8';
      selectedTeam = card.dataset.team;
    });
  });

  function startPlayNow() {
    const name = playerNameInput ? (playerNameInput.value.trim() || 'CS_Player') : 'CS_Player';
    if (connectModal) connectModal.style.display = 'none';

    // Silent background connect to local host
    const defaultHost = window.location.host || 'localhost:3000';
    network.connect(defaultHost, name, selectedTeam).catch(e => {
      console.log('Playing in offline/local bot mode.');
    });

    initGame(name, selectedTeam);

    // Request pointer lock for FPS camera
    if (canvas) {
      setTimeout(() => {
        try { canvas.requestPointerLock(); } catch (err) {}
      }, 100);
    }
  }

  // Expose globally as safe fallback
  window.startInstantGame = startPlayNow;

  // 1. INSTANT START (WITH BOTS) - Click listener
  if (quickPlayBtn) {
    quickPlayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startPlayNow();
    });
  }

  // 2. CONNECT TO SPECIFIC IP (From Menu)
  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      const targetIp = serverIpInput.value.trim() || window.location.host;
      const name = playerNameInput.value.trim() || 'CS_Player';

      connectStatus.innerText = 'Connecting to ' + targetIp + '...';
      connectStatus.style.color = '#ffbc00';

      try {
        await network.connect(targetIp, name, selectedTeam);
        connectStatus.innerText = 'Connected!';
        connectStatus.style.color = '#4cd964';
      } catch (err) {
        console.warn('Network connection notice:', err);
      }

      connectModal.style.display = 'none';
      initGame(name, selectedTeam);
    });
  }

  function initGame(name, team) {
    if (game) return; // Prevent duplicate init

    game = new GameEngine(canvas, network);
    game.player.name = name;
    game.player.team = team;
    game.respawnPlayer();

    // Initialize Developer Console [~]
    csConsole = new CSConsole(game, network);
    game.csConsole = csConsole;

    setupBuyMenu();
    setupChat();
    setupPingDisplay();

    // Start FPS loop
    requestAnimationFrame(renderLoop);
  }

  function renderLoop(time) {
    requestAnimationFrame(renderLoop);

    // Calculate FPS
    frameCount++;
    if (time - lastFpsTime >= 1000) {
      if (fpsElem) {
        fpsElem.innerText = `${frameCount} FPS | Ping: ${network.ping}ms`;
      }
      frameCount = 0;
      lastFpsTime = time;
    }

    if (game) {
      game.render();
    }
  }

  // Buy Menu Logic
  function setupBuyMenu() {
    const buyMenu = document.getElementById('buy-menu');
    const closeBtn = document.getElementById('buy-close-btn');
    const itemsContainer = document.getElementById('buy-items-list');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (game) game.toggleBuyMenu();
      });
    }

    // Category click
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        renderBuyCategory(cat, itemsContainer);
      });
    });

    // Default category rifles
    renderBuyCategory('rifles', itemsContainer);
  }

  function renderBuyCategory(category, container) {
    if (!container) return;
    container.innerHTML = '';

    for (const id in CS_WEAPONS) {
      const item = CS_WEAPONS[id];
      if (item.category !== category) continue;

      const btn = document.createElement('button');
      btn.className = 'cs-btn';
      btn.innerHTML = `
        <span>${item.name}</span>
        <span class="item-price">$${item.price}</span>
      `;

      btn.addEventListener('click', () => {
        if (!game) return;
        const buyResult = game.economy.buy(item.id, game.player.team);
        if (buyResult.success) {
          if (item.category === 'equipment') {
            if (item.id === 'kevlar') game.player.armor = 100;
            if (item.id === 'helmet') { game.player.armor = 100; game.player.hasHelmet = true; }
            if (item.id === 'defuser' && game.player.team === 'CT') game.player.hasDefuser = true;
          } else {
            game.weaponManager.weapons[item.slot] = {
              id: item.id,
              ammo: item.clipSize,
              reserve: item.maxReserve
            };
            game.weaponManager.selectSlot(item.slot);
          }
          game.updateHUD();
          game.toggleBuyMenu();
        } else {
          alert(buyResult.reason);
        }
      });

      container.appendChild(btn);
    }
  }

  // Chat system
  function setupChat() {
    const chatInputBox = document.getElementById('chat-input-box');
    const chatInput = document.getElementById('chat-input');
    const chatLog = document.getElementById('chat-log');

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyY' && (!chatInputBox.style.display || chatInputBox.style.display === 'none')) {
        e.preventDefault();
        document.exitPointerLock();
        chatInputBox.style.display = 'block';
        chatInput.focus();
      }
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text && game) {
          network.sendChat(text, false);
          addChatMessage(game.player.name, game.player.team, text);
        }
        chatInput.value = '';
        chatInputBox.style.display = 'none';
        canvas.requestPointerLock();
      } else if (e.key === 'Escape') {
        chatInput.value = '';
        chatInputBox.style.display = 'none';
        canvas.requestPointerLock();
      }
    });

    network.on('chat_message', (data) => {
      addChatMessage(data.sender, data.team, data.text);
    });

    function addChatMessage(sender, team, text) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg';
      msg.innerHTML = `<span class="chat-sender ${team.toLowerCase()}">${sender}:</span> ${escapeHtml(text)}`;
      chatLog.appendChild(msg);

      setTimeout(() => {
        if (msg.parentNode) chatLog.removeChild(msg);
      }, 8000);
    }

    function escapeHtml(string) {
      return String(string).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[s]));
    }
  }

  function setupPingDisplay() {
    network.on('ping_update', (ping) => {
      const pingElem = document.getElementById('hud-ping-val');
      if (pingElem) pingElem.innerText = ping;
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
