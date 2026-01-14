/**
 * EML Exporter
 * Exports emails as individual EML files
 */

import { join } from 'path';
import type { EmailMessage } from '../types';
import { logger } from '../utils/logger';

export class EmlExporter {
  /**
   * Export messages to individual EML files
   * @param messages - Array of email messages
   * @param outputDir - Directory to save EML files
   */
  async export(messages: EmailMessage[], outputDir: string): Promise<void> {
    logger.debug(`Exporting ${messages.length} messages to EML: ${outputDir}`);

    for (const message of messages) {
      await this.exportMessage(message, outputDir);
    }

    logger.success(`Exported ${messages.length} messages to ${outputDir}`);
  }

  /**
   * Export messages organized by folder
   */
  async exportByFolder(
    messagesByFolder: Map<string, EmailMessage[]>,
    outputDir: string
  ): Promise<void> {
    for (const [folder, messages] of messagesByFolder.entries()) {
      const safeFolder = this.sanitizeFolderName(folder);
      const folderDir = join(outputDir, safeFolder);
      
      await this.export(messages, folderDir);
    }
  }

  /**
   * Export a single message to an EML file
   */
  private async exportMessage(message: EmailMessage, outputDir: string): Promise<void> {
    const filename = this.generateFilename(message);
    const filepath = join(outputDir, filename);
    
    const emlContent = message.raw || this.reconstructEml(message);
    
    try {
      await Bun.write(filepath, emlContent);
    } catch (error) {
      throw new Error(`Failed to write EML file ${filename}: ${error}`);
    }
  }

  /**
   * Reconstruct EML from EmailMessage object
   */
  private reconstructEml(message: EmailMessage): string {
    const lines: string[] = [];

    // Add headers
    lines.push(`From: ${this.formatAddress(message.from)}`);
    lines.push(`To: ${message.to.map(a => this.formatAddress(a)).join(', ')}`);
    
    if (message.cc && message.cc.length > 0) {
      lines.push(`Cc: ${message.cc.map(a => this.formatAddress(a)).join(', ')}`);
    }
    
    lines.push(`Subject: ${message.subject}`);
    lines.push(`Date: ${message.date.toUTCString()}`);
    lines.push(`Message-ID: ${message.id}`);
    
    // Content type
    if (message.html) {
      lines.push('Content-Type: text/html; charset=utf-8');
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8');
    }
    
    // Blank line between headers and body
    lines.push('');
    
    // Add body
    lines.push(message.html || message.text || '');

    return lines.join('\n');
  }

  /**
   * Generate filename for EML file
   */
  private generateFilename(message: EmailMessage): string {
    const date = message.date.toISOString().split('T')[0];
    const subject = this.sanitizeFilename(message.subject).substring(0, 50);
    const id = message.uid.toString().padStart(6, '0');
    
    return `${date}_${id}_${subject}.eml`;
  }

  /**
   * Format email address
   */
  private formatAddress(addr: { name?: string; address: string }): string {
    if (addr.name) {
      return `"${addr.name}" <${addr.address}>`;
    }
    return addr.address;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9_\-\s]/gi, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * Sanitize folder name
   */
  private sanitizeFolderName(folder: string): string {
    return folder
      .replace(/[^a-z0-9_\-]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }
}

/**
 * JSON Exporter
 * Exports emails as structured JSON
 */
export class JsonExporter {
  /**
   * Export messages to a JSON file
   * @param messages - Array of email messages
   * @param outputPath - Path to the output JSON file
   */
  async export(messages: EmailMessage[], outputPath: string): Promise<void> {
    logger.debug(`Exporting ${messages.length} messages to JSON: ${outputPath}`);

    const jsonData = this.messagesToJson(messages);
    
    try {
      await Bun.write(outputPath, JSON.stringify(jsonData, null, 2));
      logger.success(`Exported ${messages.length} messages to ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to write JSON file: ${error}`);
    }
  }

  /**
   * Export messages by folder
   */
  async exportByFolder(
    messagesByFolder: Map<string, EmailMessage[]>,
    outputDir: string
  ): Promise<void> {
    for (const [folder, messages] of messagesByFolder.entries()) {
      const safeFolder = this.sanitizeFolderName(folder);
      const outputPath = join(outputDir, `${safeFolder}.json`);
      await this.export(messages, outputPath);
    }
  }

  /**
   * Export all messages to a single JSON file with folder organization
   */
  async exportAll(
    messagesByFolder: Map<string, EmailMessage[]>,
    outputPath: string
  ): Promise<void> {
    const data: Record<string, any[]> = {};
    
    for (const [folder, messages] of messagesByFolder.entries()) {
      data[folder] = this.messagesToJson(messages);
    }
    
    try {
      await Bun.write(outputPath, JSON.stringify(data, null, 2));
      logger.success(`Exported all messages to ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to write JSON file: ${error}`);
    }
  }

  /**
   * Convert messages to JSON-serializable format
   */
  private messagesToJson(messages: EmailMessage[]): any[] {
    return messages.map(msg => ({
      id: msg.id,
      uid: msg.uid,
      subject: msg.subject,
      from: msg.from,
      to: msg.to,
      cc: msg.cc,
      bcc: msg.bcc,
      date: msg.date.toISOString(),
      headers: msg.headers,
      text: msg.text,
      html: msg.html,
      attachments: msg.attachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        // Don't include actual content in JSON to keep file size manageable
        hasContent: !!att.content,
      })),
      labels: msg.labels,
      folder: msg.folder,
      flags: msg.flags,
    }));
  }

  /**
   * Sanitize folder name for use as filename
   */
  private sanitizeFolderName(folder: string): string {
    return folder
      .replace(/[^a-z0-9_\-]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }
}
