// frontend/src/game/ArenaScene.js
import Phaser from "phaser";

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: "ArenaScene" });
    this.players = {}; // playerId -> sprite
    this.playerIds = []; // keep order
  }

  preload() {
    // placeholder graphics: if you want use real assets, place them in /public and change keys/paths
    this.load.image("bg", "/arena-bg.png"); // optional, add file in public/
    this.load.image("playerA", "/playerA.png"); // optional placeholder
    this.load.image("playerB", "/playerB.png");
  }

  create() {
    // background
    if (this.textures.exists("bg")) {
      this.add.image(400, 150, "bg").setDepth(-1);
    } else {
      this.cameras.main.setBackgroundColor("#8BD3FF");
    }

    // register global handler to receive server states
    window.handleServerState = (data) => {
      this.handleServerState(data);
    };

    // Input handling local: keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z); // dash
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // grab / optional

    // Poll inputs regularly and send to server (client-side sampling)
    this.inputSendInterval = 100; // ms
    this.lastInputSend = 0;
  }

  handleServerState(data) {
    // data.state.players expected shape: { playerId: { x, y, vx, vy, hp } }
    const playersState = (data && data.state && data.state.players) || {};
    const ids = Object.keys(playersState);

    // ensure we track players in stable order
    ids.forEach((pid, idx) => {
      const p = playersState[pid];
      if (!this.players[pid]) {
        // create sprite for this player
        const key = idx === 0 ? "playerA" : "playerB";
        // default position if not provided
        const startX = p.x != null ? p.x : 100 + idx * 200;
        const startY = p.y != null ? p.y : 150;
        const sprite = this.add.sprite(startX, startY, key);
        sprite.setDisplaySize(64, 64);
        sprite.setOrigin(0.5, 0.5);
        this.players[pid] = { sprite, id: pid };
      } else {
        // ensure a placeholder exists
      }
    });

    // now update positions — use simple lerp for smoothing
    ids.forEach((pid) => {
      const p = playersState[pid];
      const entry = this.players[pid];
      if (!entry) return;
      const sprite = entry.sprite;
      if (p.x != null) sprite.x = Phaser.Math.Linear(sprite.x, p.x, 0.35);
      if (p.y != null) sprite.y = Phaser.Math.Linear(sprite.y, p.y, 0.35);
      // future: apply rotation, sprite frame, hp bars etc.
    });
  }

  update(time, delta) {
    // sample input and send to server at fixed interval
    this.lastInputSend += delta;
    if (this.lastInputSend >= this.inputSendInterval) {
      this.lastInputSend = 0;

      // read keys
      const inputs = {
        left: this.cursors.left.isDown ? true : false,
        right: this.cursors.right.isDown ? true : false,
        up: this.cursors.up.isDown ? true : false,
        down: this.cursors.down.isDown ? true : false,
        dash: this.keyZ.isDown ? true : false,
        alt: this.keyX.isDown ? true : false
      };

      // if any input pressed then send
      const any = Object.values(inputs).some(Boolean);
      if (any && typeof window.sendInput === "function") {
        const payload = {
          type: "input",
          // matchId should be provided by App.jsx currentMatch (we can read window.currentMatch set by App)
          matchId: (window.currentMatch && window.currentMatch.matchId) || null,
          tick: Date.now(),
          inputs
        };
        try {
          window.sendInput(payload);
        } catch (err) {
          // ignore send errors
        }
      }
    }
  }

  // cleanup when scene destroyed
  shutdown() {
    if (window.handleServerState) delete window.handleServerState;
  }
}
