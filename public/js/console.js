// Counter-Strike 1.6 Developer Console Module

export class CSConsole {
  constructor(game, network) {
    this.game = game;
    this.network = network;

    this.isOpen = false;
    this.history = [];
    this.historyIndex = -1;

    this.consoleElem = document.getElementById('cs-console');
    this.logElem = document.getElementById('console-log');
    this.inputElem = document.getElementById('console-input');
    this.submitBtn = document.getElementById('console-submit-btn');
    this.closeBtn = document.getElementById('console-close-btn');

    this.init();
  }

  init() {
    this.print('Counter-Strike 1.6 Web Console initialized.');
    this.print('Type "help" for a list of available commands.');
    this.print('Type "status" to display server multiplayer IP addresses.');

    if (this.submitBtn && this.inputElem) {
      this.submitBtn.addEventListener('click', () => this.handleInput());
      this.inputElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleInput();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateHistory(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateHistory(1);
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Toggle on ~ (Backquote) or F10
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.code === 'F10') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    const toggleBtn = document.getElementById('hud-console-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    if (this.consoleElem) {
      this.consoleElem.style.display = 'flex';
      document.exitPointerLock();
      if (this.inputElem) {
        this.inputElem.focus();
        this.inputElem.select();
      }
    }
  }

  close() {
    this.isOpen = false;
    if (this.consoleElem) {
      this.consoleElem.style.display = 'none';
      const canvas = document.getElementById('game-canvas');
      if (canvas) canvas.requestPointerLock();
    }
  }

  print(text, type = 'normal') {
    if (!this.logElem) return;
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    line.innerText = text;
    this.logElem.appendChild(line);
    this.logElem.scrollTop = this.logElem.scrollHeight;
  }

  navigateHistory(dir) {
    if (this.history.length === 0) return;
    this.historyIndex += dir;
    if (this.historyIndex < 0) this.historyIndex = 0;
    if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length;
      this.inputElem.value = '';
      return;
    }
    this.inputElem.value = this.history[this.historyIndex];
  }

  async handleInput() {
    const raw = this.inputElem.value.trim();
    if (!raw) return;

    this.history.push(raw);
    this.historyIndex = this.history.length;
    this.inputElem.value = '';

    this.print(`] ${raw}`, 'command');
    await this.executeCommand(raw);
  }

  async executeCommand(raw) {
    const parts = raw.split(' ').filter(p => p.length > 0);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'status':
        await this.cmdStatus();
        break;

      case 'add_bot':
      case 'bot_add':
      case 'addbot':
        this.cmdAddBot(args);
        break;

      case 'kick_bot':
      case 'bot_kick':
      case 'kickbots':
      case 'botkick':
        this.cmdKickBot(args);
        break;

      case 'connect':
        this.cmdConnect(args[0]);
        break;

      case 'restart':
      case 'sv_restart':
      case 'sv_restartround':
        this.cmdRestart();
        break;

      case 'clear':
      case 'cls':
        if (this.logElem) this.logElem.innerHTML = '';
        break;

      case 'help':
        this.cmdHelp();
        break;

      case 'name':
        if (args.length > 0 && this.game) {
          this.game.player.name = args.join(' ');
          this.print(`Player name changed to "${this.game.player.name}"`, 'success');
          this.game.updateHUD();
        } else {
          this.print('Usage: name <your_nickname>', 'warn');
        }
        break;

      case 'volume':
        if (args[0] !== undefined) {
          const v = parseFloat(args[0]);
          if (!isNaN(v)) {
            import('./audio.js').then(m => m.soundEngine.setVolume(v));
            this.print(`Volume set to ${v}`, 'success');
          }
        } else {
          this.print('Usage: volume <0.0 - 1.0>', 'warn');
        }
        break;

      default:
        // If user directly typed an IP address like 192.168.1.15:3000
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(cmd) || cmd.includes(':3000')) {
          this.cmdConnect(cmd);
        } else {
          this.print(`Unknown command "${cmd}". Type "help" for command list.`, 'error');
        }
        break;
    }
  }

  async cmdStatus() {
    this.print('------------------------------------------------------------', 'info');
    this.print('hostname: Counter-Strike 1.6 Dust II Dedicated Server', 'info');
    this.print('version : 1.6.0-web (Three.js WebGL / WebSocket)', 'info');
    this.print('map     : de_dust2', 'info');
    this.print(`current player: ${this.game?.player?.name || 'Player'} [${this.game?.player?.team || 'T'}]`, 'info');
    this.print(`bots count    : ${this.game?.botManager?.bots?.length || 0}`, 'info');

    // Fetch live server network IPs
    const info = await this.network.getServerInfo();
    const ips = info.localIps || [];
    const port = info.port || 3000;

    this.print('------------------------------------------------------------', 'info');
    this.print('>>> MULTIPLAYER SERVER IP ADDRESSES (Share with friends): <<<', 'success');

    if (ips.length > 0) {
      ips.forEach((ip, idx) => {
        this.print(` [IP #${idx + 1}]  http://${ip}:${port}`, 'success');
        this.print(`           Direct Connect Command: connect ${ip}:${port}`, 'success');
      });
    } else {
      this.print(` [Local]  http://localhost:${port}`, 'success');
    }

    this.print('------------------------------------------------------------', 'info');
    this.print("Ko'rsatma: Boshqa kompyuterdan kiruvchi do'stingiz konsolga:", 'warn');
    this.print(`connect ${ips[0] || 'localhost'}:${port}`, 'warn');
    this.print("deb yozsa, to'g'ridan-to'g'ri o'yiningizga ulanadi!", 'warn');
    this.print('------------------------------------------------------------', 'info');
  }

  cmdAddBot(args) {
    if (!this.game || !this.game.botManager) {
      this.print('Game engine not initialized.', 'error');
      return;
    }

    let count = 1;
    if (args.length > 0) {
      const parsed = parseInt(args[0], 10);
      if (!isNaN(parsed) && parsed > 0) {
        count = Math.min(16, parsed); // Cap at 16
      }
    }

    const added = this.game.botManager.addBots(count);
    const total = this.game.botManager.bots.length;

    this.print(`Added ${added.length} bot(s). Total bots on map: ${total}.`, 'success');
    added.forEach(b => {
      this.print(` -> [BOT] ${b.name} (${b.team}) spawned.`, 'info');
    });
  }

  cmdKickBot(args) {
    if (!this.game || !this.game.botManager) {
      this.print('Game engine not initialized.', 'error');
      return;
    }

    const kickedCount = this.game.botManager.kickAll();
    this.print(`All bots (${kickedCount}) have been kicked from the server.`, 'success');
  }

  async cmdConnect(targetIp) {
    if (!targetIp || targetIp.trim() === '') {
      this.print('Usage: connect <ip:port> (e.g. connect 192.168.1.15:3000)', 'warn');
      return;
    }

    this.print(`Attempting connection to ${targetIp}...`, 'info');

    try {
      await this.network.connect(targetIp, this.game?.player?.name || 'CS_Player', this.game?.player?.team || 'T');
      this.print(`Successfully connected to ${targetIp}!`, 'success');
      this.close();
    } catch (e) {
      this.print(`Connection failed to ${targetIp}: ${e.message || e}`, 'error');
      this.print('Server might be offline or blocked by firewall.', 'warn');
    }
  }

  cmdRestart() {
    if (this.game) {
      this.game.respawnPlayer();
      this.game.botManager.respawnAll();
      this.game.showAnnouncement('Round Restarted!');
      this.print('Server round restarted.', 'success');
    }
  }

  cmdHelp() {
    this.print('=== CS 1.6 CONSOLE COMMANDS ===', 'info');
    this.print('status              : Server IP manzillari va o\'yinchilar ro\'yxatini chiqaradi', 'info');
    this.print('connect <ip:port>   : Boshqa o\'yinchi IP ga ulanish (masalan: connect 192.168.1.5:3000)', 'info');
    this.print('add_bot [soni]      : Botlar qo\'shish (masalan: add_bot 4)', 'info');
    this.print('kick_bot            : Barcha botlarni serverdan chiqarib yuborish', 'info');
    this.print('restart             : Raundni qayta boshlash (sv_restart 1)', 'info');
    this.print('name <nik>          : O\'zingizning nikneymingizni o\'zgartirish', 'info');
    this.print('volume <0-1>        : O\'yin ovozini sozlash', 'info');
    this.print('clear               : Konsol ekranini tozalash', 'info');
  }
}
