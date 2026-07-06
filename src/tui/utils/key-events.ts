import type { CliRenderer, KeyEvent } from '@opentui/core';

export type KeypressCleanup = () => void;

export function onKeypress(renderer: CliRenderer, handler: (key: KeyEvent) => void): KeypressCleanup {
  renderer.keyInput.on('keypress', handler);
  return () => {
    renderer.keyInput.off('keypress', handler);
  };
}

export function cleanupKeypressHandlers(handlers: KeypressCleanup[]): void {
  for (const cleanup of handlers) {
    cleanup();
  }
  handlers.length = 0;
}
