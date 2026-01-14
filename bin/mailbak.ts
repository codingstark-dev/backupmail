#!/usr/bin/env bun
/**
 * mailbak - Universal email backup and migration tool
 * 
 * Default mode: Interactive TUI
 * CLI mode: Use with arguments (--help, auth, backup, etc.)
 */

import { parseArgs, hasFlag, showHelp } from '../src/utils/cli';
import { addAccount, listAccounts, removeAccount } from '../src/cli/commands/auth';
import { logger } from '../src/utils/logger';
import { MailbakTuiApp } from '../src/tui/app';

const VERSION = '0.2.0';

async function main() {
  // Check if any arguments were provided
  // process.argv = [bunExecutable, scriptPath, ...userArgs]
  const hasArguments = process.argv.length > 2;

  // If no arguments, launch TUI mode
  if (!hasArguments) {
    await launchTUI();
    return;
  }

  // CLI mode - parse arguments
  const args = parseArgs();

  // Handle version flag
  if (hasFlag(args, 'version') || hasFlag(args, 'v')) {
    console.log(`mailbak v${VERSION}`);
    process.exit(0);
  }

  // Handle help flag
  if (hasFlag(args, 'help') || hasFlag(args, 'h') || args.command.length === 0) {
    showMainHelp();
    process.exit(0);
  }

  const [mainCommand, subCommand, ...rest] = args.command;

  try {
    switch (mainCommand) {
      case 'auth':
        await handleAuthCommand(subCommand, rest, args);
        break;

      case 'backup':
        await handleBackupCommand(rest, args);
        break;

      case 'list':
        await handleListCommand(rest, args);
        break;

      case 'migrate':
        await handleMigrateCommand(rest, args);
        break;

      default:
        logger.error(`Unknown command: ${mainCommand}`);
        showMainHelp();
        process.exit(1);
    }
  } catch (error) {
    logger.error(`${error}`);
    process.exit(1);
  }
}

async function handleAuthCommand(subCommand: string | undefined, args: string[], parsed: any) {
  switch (subCommand) {
    case 'add':
      await addAccount();
      break;

    case 'list':
      await listAccounts();
      break;

    case 'remove':
      await removeAccount(args[0]);
      break;

    default:
      showAuthHelp();
      process.exit(subCommand ? 1 : 0);
  }
}

async function handleBackupCommand(args: string[], parsed: any) {
  const accountId = args[0];
  
  if (!accountId) {
    logger.error('Account ID is required');
    console.log('\nUsage: mailbak backup <accountId> [options]');
    console.log('\nOptions:');
    console.log('  --format <formats>   Export formats: mbox, eml, json (default: mbox)');
    console.log('  --output <dir>       Output directory (default: ./backups)');
    console.log('  --folders <folders>  Specific folders to backup (comma-separated)');
    process.exit(1);
  }

  logger.info(`Backup feature coming soon!`);
  logger.info(`Account: ${accountId}`);
  logger.info(`Options: ${JSON.stringify(parsed.options)}`);
}

async function handleListCommand(args: string[], parsed: any) {
  const accountId = args[0];
  
  if (!accountId) {
    logger.error('Account ID is required');
    console.log('\nUsage: mailbak list <accountId>');
    process.exit(1);
  }

  logger.info(`List feature coming soon! Account: ${accountId}`);
}

async function handleMigrateCommand(args: string[], parsed: any) {
  const [fromAccountId, toAccountId] = args;
  
  if (!fromAccountId || !toAccountId) {
    logger.error('Both source and destination account IDs are required');
    console.log('\nUsage: mailbak migrate <fromAccountId> <toAccountId> [options]');
    console.log('\nOptions:');
    console.log('  --folders <folders>  Specific folders to migrate (comma-separated)');
    process.exit(1);
  }

  logger.info(`Migrate feature coming soon!`);
  logger.info(`From: ${fromAccountId}, To: ${toAccountId}`);
  logger.info(`Options: ${JSON.stringify(parsed.options)}`);
}

async function launchTUI() {
  try {
    logger.info('Starting mailbak TUI...\n');

    const app = new MailbakTuiApp();
    await app.run();

  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    process.exit(1);
  }
}

function showMainHelp() {
  console.log(`
mailbak v${VERSION} - Universal email backup and migration tool

Usage:
  mailbak                  Launch interactive TUI (default)
  mailbak <command\> [options]  Use CLI mode

Commands:
  auth                     Manage email accounts
  backup <accountId\>       Backup emails from an account
  list <accountId\>         List folders in an account
  migrate <from\> <to\>      Migrate emails between accounts

Options:
  -h, --help              Show help
  -v, --version           Show version

Examples:
  mailbak                                   Launch TUI mode
  mailbak auth add                          Add a new account
  mailbak auth list                         List all accounts
  mailbak backup gmail_123 --format mbox    Backup to MBOX format
  mailbak migrate gmail_123 imap_456        Migrate between accounts

For more information, visit: https://github.com/codingstark-dev/backupmail
`);
}

function showAuthHelp() {
  console.log(`
mailbak auth - Manage email accounts

Usage:
  mailbak auth <subcommand>

Subcommands:
  add                Add a new email account
  list               List all configured accounts
  remove [id]        Remove an account

Examples:
  mailbak auth add           Interactive account setup
  mailbak auth list          Show all accounts
  mailbak auth remove        Select account to remove
  mailbak auth remove <id>   Remove specific account
`);
}

// Run the CLI
main();
