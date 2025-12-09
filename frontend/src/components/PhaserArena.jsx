// frontend/src/components/PhaserArena.jsx
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import ArenaScene from "../game/ArenaScene";

export default function PhaserArena({ match }) {
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;

    // ensure parent container is positioned and get dimensions for fullscreen
    const container = document.getElementById("phaser-container");
    if (container) {
      container.style.position = "relative";
    }
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    const config = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: "phaser-container",
      audio: { noAudio: true },
      // Enable keyboard input capturing
      input: {
        keyboard: true,
        mouse: true,
        touch: true,
        gamepad: false
      },
      // Scale mode for responsive design
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scene: [ArenaScene]
    };

    gameRef.current = new Phaser.Game(config);

    // small delay to ensure canvas is created, then adjust style and focus
    setTimeout(() => {
      try {
        const g = gameRef.current;
        const canvas = g && g.canvas ? g.canvas : (g && g.renderer && g.renderer.canvas);
        if (canvas) {
          canvas.style.zIndex = "0";          // put canvas behind UI
          canvas.style.position = "relative"; // respects stacking context
          canvas.tabIndex = 1; // Make canvas focusable

          // Auto-focus the canvas so keyboard inputs work immediately
          canvas.focus();

          // Click to focus hint - focus canvas when clicked
          canvas.addEventListener("click", () => {
            canvas.focus();
          });
        }
      } catch (e) {
        // ignore if we can't access canvas immediately
      }
    }, 100);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (window.handleServerState) delete window.handleServerState;
    };
  }, []);

  // expose match to window for game input usage
  useEffect(() => {
    if (match) {
      window.currentMatch = match;
    } else {
      if (window.currentMatch) delete window.currentMatch;
    }
    // clean-up handled on unmount
  }, [match]);

  return null; // Phaser mounts into #phaser-container defined in parent
}
