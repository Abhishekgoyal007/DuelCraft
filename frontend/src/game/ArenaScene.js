// frontend/src/game/ArenaScene.js
import Phaser from "phaser";

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: "ArenaScene" });
    this.players = {};
    this.inputSendInterval = 100;
    this.lastInputSend = 0;
    this.debugText = null;
  }

  preload() {
    // generate simple textures
    this.textures.generate("playerA", { data: ["2"], pixelWidth: 32, palette: { 0: "#000000", 1: "#00ff00" } });
    this.textures.generate("playerB", { data: ["2"], pixelWidth: 32, palette: { 0: "#000000", 1: "#00ff00" } });
  }

  create() {
    this.cameras.main.setBackgroundColor("#8BD3FF");
    window.handleServerState = (data) => {
      // optional debug
      // console.debug("[client] state tick", data?.tick);
      this.handleServerState(data);
    };

    this.debugText = this.add.text(10, 10, "tick: -", { font: "14px Arial", fill: "#000" }).setDepth(1000);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // smoothing factor
    this.smooth = 0.25;
  }

  handleServerState(data) {
    if (!data || data.type !== "state") return;

    if (this.debugText && data.tick != null) {
      this.debugText.setText(`tick: ${data.tick}`);
    }

    const playersState = (data.state && data.state.players) || {};
    const ids = Object.keys(playersState);

    ids.forEach((pid, idx) => {
      const p = playersState[pid];
      if (!this.players[pid]) {
        const tex = idx === 0 ? "playerA" : "playerB";
        const sprite = this.add.sprite(p.x || 100 + idx * 200, p.y || 200, tex);
        sprite.setDisplaySize(48, 48);
        sprite.setOrigin(0.5, 0.5);
        this.players[pid] = { sprite };
      } else {
        const sprite = this.players[pid].sprite;
        // smooth interpolation for both x & y
        if (p.x != null) sprite.x = Phaser.Math.Linear(sprite.x, p.x, this.smooth);
        if (p.y != null) sprite.y = Phaser.Math.Linear(sprite.y, p.y, this.smooth);
      }
    });

    // remove stale sprites
    Object.keys(this.players).forEach((pid) => {
      if (!playersState[pid]) {
        this.players[pid].sprite.destroy();
        delete this.players[pid];
      }
    });
  }

  update(time, delta) {
    this.lastInputSend += delta;
    if (this.lastInputSend >= this.inputSendInterval) {
      this.lastInputSend = 0;
      const inputs = {
        left: !!this.cursors.left.isDown,
        right: !!this.cursors.right.isDown,
        up: !!this.cursors.up.isDown,
        down: !!this.cursors.down.isDown,
        dash: !!this.keyZ.isDown,
        alt: !!this.keyX.isDown
      };

      const any = Object.values(inputs).some(Boolean);
      if (typeof window.sendInput === "function") {
        // always send inputs — server can ignore empty if you prefer
        const payload = {
          type: "input",
          matchId: (window.currentMatch && window.currentMatch.matchId) || null,
          tick: Date.now(),
          inputs
        };
        try {
          window.sendInput(payload);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  shutdown() {
    if (window.handleServerState) delete window.handleServerState;
  }
}
