/**
 * CYBERPUNK Progress Bar - Neon glowing progress with animations
 */

import { BoxRenderable, TextRenderable, FrameBufferRenderable, RGBA, type CliRenderer } from '@opentui/core';
import { theme } from '../utils/theme';

export interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  showCount?: boolean;
}

export class ProgressBar {
  private container: BoxRenderable;
  private labelText: TextRenderable;
  private barText: TextRenderable;
  private statsText: TextRenderable;
  private renderer: CliRenderer;
  private props: ProgressBarProps;

  constructor(renderer: CliRenderer, props: ProgressBarProps) {
    this.renderer = renderer;
    this.props = { ...props, width: props.width || 50, showPercentage: true, showCount: true };

    // Container
    this.container = new BoxRenderable(renderer, {
      id: `progress-bar-${Date.now()}`,
      width: '100%',
      height: 3,
      position: 'relative',
    });

    // Label with neon styling
    this.labelText = new TextRenderable(renderer, {
      id: `progress-label-${Date.now()}`,
      content: `${theme.icons.bolt} ${props.label}`,
      fg: theme.colors.textGlow,
      position: 'relative',
      left: 0,
      top: 0,
    });
    this.container.add(this.labelText);

    // Progress bar as TEXT (not framebuffer for better rendering)
    this.barText = new TextRenderable(renderer, {
      id: `progress-bar-text-${Date.now()}`,
      content: this.renderBar(),
      fg: theme.colors.primary,
      position: 'relative',
      left: 0,
      top: 1,
    });
    this.container.add(this.barText);

    // Stats text with NEON glow
    this.statsText = new TextRenderable(renderer, {
      id: `progress-stats-${Date.now()}`,
      content: this.getStatsText(),
      fg: theme.colors.textNeon,
      position: 'relative',
      left: this.props.width! + 3,
      top: 1,
    });
    this.container.add(this.statsText);

    this.render();
  }

  getContainer(): BoxRenderable {
    return this.container;
  }

  update(current: number, total: number, label?: string) {
    this.props.current = current;
    this.props.total = total;
    if (label) {
      this.props.label = label;
      this.labelText.content = `${theme.icons.bolt} ${label}`;
    }
    this.render();
  }

  private render() {
    // Update bar
    this.barText.content = this.renderBar();
    
    // Update stats
    this.statsText.content = this.getStatsText();
  }

  private renderBar(): string {
    const { current, total, width } = this.props;
    const percentage = total > 0 ? (current / total) : 0;
    const filled = Math.round(percentage * width!);
    const empty = width! - filled;

    // Create NEON progress bar with bracket borders
    const filledBar = theme.ascii.progressFull.repeat(filled);
    const emptyBar = theme.ascii.progressEmpty.repeat(empty);
    
    return `[${filledBar}${emptyBar}]`;
  }

  private getStatsText(): string {
    const { current, total, showPercentage, showCount } = this.props;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    let text = theme.ascii.diamond + ' ';
    if (showPercentage) {
      text += `${percentage}%`;
    }
    if (showCount) {
      text += ` ${theme.ascii.diamond} ${current}/${total}`;
    }
    return text;
  }

  destroy() {
    this.container.destroy();
  }
}
