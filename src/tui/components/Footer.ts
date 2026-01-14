/**
 * CYBERPUNK Footer - Neon keyboard shortcuts bar
 */

import { BoxRenderable, TextRenderable, type CliRenderer } from '@opentui/core';
import { theme } from '../utils/theme';

export interface FooterProps {
  shortcuts: Array<{ key: string; description: string }>;
}

export class Footer {
  private container: BoxRenderable;
  private topLine: TextRenderable;
  private shortcutsText: TextRenderable;

  constructor(renderer: CliRenderer, props: FooterProps) {
    // Create footer container with CYBERPUNK style
    this.container = new BoxRenderable(renderer, {
      id: 'footer',
      width: '100%',
      height: 3,
      backgroundColor: theme.colors.background,
      position: 'absolute',
      bottom: 0,
      left: 0,
    });

    // Top border line with neon effect
    this.topLine = new TextRenderable(renderer, {
      id: 'footer-top',
      content: theme.ascii.heavyDivider.repeat(80),
      fg: theme.colors.secondary,
      position: 'relative',
      left: 0,
      top: 0,
    });
    this.container.add(this.topLine);

    // Format shortcuts with NEON styling
    const shortcutsStr = props.shortcuts
      .map(s => `${theme.neon.bracket}${s.key}${theme.neon.bracketEnd} ${s.description}`)
      .join('  ' + theme.ascii.diamond + '  ');

    this.shortcutsText = new TextRenderable(renderer, {
      id: 'footer-shortcuts',
      content: shortcutsStr,
      fg: theme.colors.textNeon,
      position: 'relative',
      left: 2,
      top: 1,
    });

    this.container.add(this.shortcutsText);
  }

  getContainer(): BoxRenderable {
    return this.container;
  }

  updateShortcuts(shortcuts: Array<{ key: string; description: string }>) {
    const shortcutsStr = shortcuts
      .map(s => `${theme.neon.bracket}${s.key}${theme.neon.bracketEnd} ${s.description}`)
      .join('  ' + theme.ascii.diamond + '  ');
    this.shortcutsText.content = shortcutsStr;
  }

  destroy() {
    this.container.destroy();
  }
}
