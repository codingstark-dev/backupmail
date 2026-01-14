/**
 * CYBERPUNK Header component - Neon glowing header with ASCII art
 */

import { BoxRenderable, TextRenderable, type CliRenderer } from '@opentui/core';
import { theme } from '../utils/theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
}

export class Header {
  private container: BoxRenderable;
  private titleText: TextRenderable;
  private decorLine: TextRenderable;
  private subtitleText?: TextRenderable;

  constructor(renderer: CliRenderer, props: HeaderProps) {
    // Create header container with CYBERPUNK style
    this.container = new BoxRenderable(renderer, {
      id: 'header',
      width: '100%',
      height: props.subtitle ? 6 : 4,
      backgroundColor: theme.colors.background,
      position: 'relative',
      top: 0,
      left: 0,
    });

    // Decorative top line with neon style
    this.decorLine = new TextRenderable(renderer, {
      id: 'header-decor',
      content: theme.ascii.heavyDivider.repeat(80),
      fg: theme.colors.primary,
      position: 'relative',
      left: 0,
      top: 0,
    });
    this.container.add(this.decorLine);

    // Title with NEON GLOW effect
    const glowSymbol = theme.neon.glow;
    this.titleText = new TextRenderable(renderer, {
      id: 'header-title',
      content: `${glowSymbol} ${props.title.toUpperCase()} ${glowSymbol}`,
      fg: theme.colors.primary,
      position: 'relative',
      left: 2,
      top: 1,
    });
    this.container.add(this.titleText);

    // Subtitle if provided
    if (props.subtitle) {
      this.subtitleText = new TextRenderable(renderer, {
        id: 'header-subtitle',
        content: `${theme.icons.arrowRight} ${props.subtitle}`,
        fg: theme.colors.textNeon,
        position: 'relative',
        left: 4,
        top: 2,
      });
      this.container.add(this.subtitleText);
    }

    // Bottom border line
    const bottomLine = new TextRenderable(renderer, {
      id: 'header-bottom',
      content: theme.ascii.heavyDivider.repeat(80),
      fg: theme.colors.secondary,
      position: 'relative',
      left: 0,
      top: props.subtitle ? 3 : 2,
    });
    this.container.add(bottomLine);
  }

  getContainer(): BoxRenderable {
    return this.container;
  }

  updateTitle(title: string) {
    const glowSymbol = theme.neon.glow;
    this.titleText.content = `${glowSymbol} ${title.toUpperCase()} ${glowSymbol}`;
  }

  updateSubtitle(subtitle: string) {
    if (this.subtitleText) {
      this.subtitleText.content = `${theme.icons.arrowRight} ${subtitle}`;
    }
  }

  destroy() {
    this.container.destroy();
  }
}
