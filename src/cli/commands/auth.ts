/**
 * Authentication commands using Bun-native prompts
 */

import { prompt, password, confirm, select } from '../prompts';
import { getConfigManager } from '../../utils/config';
import { logger } from '../../utils/logger';
import { ProgressTracker } from '../../utils/progress';
import type { ImapAccount, GmailAccount } from '../../types';
import { ImapProvider } from '../../providers/imap';
import { GmailProvider } from '../../providers/gmail';

export async function addAccount(): Promise<void> {
  const type = await select({
    message: 'Select email provider:',
    choices: [
      { name: 'Gmail (with OAuth2)', value: 'gmail' },
      { name: 'SpaceMail (IMAP)', value: 'spacemail' },
      { name: 'Generic IMAP Server', value: 'imap' },
    ],
  });

  if (type === 'gmail') {
    await addGmailAccount();
  } else {
    await addImapAccount(type === 'spacemail');
  }
}

async function addGmailAccount(): Promise<void> {
  logger.info('Setting up Gmail account with OAuth2...\n');

  const email = await prompt({
    message: 'Enter your Gmail address',
    validate: (input) => input.includes('@') || 'Please enter a valid email',
  });

  const clientId = await prompt({
    message: 'Enter OAuth2 Client ID',
    validate: (input) => input.length > 0 || 'Client ID is required',
  });

  const clientSecret = await prompt({
    message: 'Enter OAuth2 Client Secret',
    validate: (input) => input.length > 0 || 'Client Secret is required',
  });

  const accountId = `gmail_${Date.now()}`;
  const account: GmailAccount = {
    id: accountId,
    name: email,
    email,
    type: 'gmail',
    createdAt: new Date(),
    refreshToken: '',
  };

  const provider = new GmailProvider(account, clientId, clientSecret);
  const authUrl = provider.getAuthUrl();

  logger.info('\nPlease visit the following URL to authorize the application:\n');
  logger.raw(authUrl);
  logger.info('');

  const code = await prompt({
    message: 'Enter the authorization code',
    validate: (input) => input.length > 0 || 'Authorization code is required',
  });

  const progress = new ProgressTracker();
  progress.start('Exchanging authorization code for tokens...');

  try {
    const tokens = await provider.getTokensFromCode(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Please ensure access_type=offline is set.');
    }

    account.refreshToken = tokens.refresh_token;

    const config = getConfigManager();
    await config.saveAccount(account);
    await config.saveCredentials(accountId, {
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
    });

    progress.succeed(`Gmail account ${email} added successfully!`);
  } catch (error) {
    progress.fail(`Failed to add Gmail account: ${error}`);
    throw error;
  }
}

async function addImapAccount(isSpaceMail: boolean = false): Promise<void> {
  const providerName = isSpaceMail ? 'SpaceMail' : 'IMAP';
  logger.info(`Setting up ${providerName} account...\n`);

  const defaultHost = isSpaceMail ? 'mail.spaceship.com' : '';

  const email = await prompt({
    message: 'Enter your email address',
    validate: (input) => input.includes('@') || 'Please enter a valid email',
  });

  const host = await prompt({
    message: 'IMAP server host',
    default: defaultHost,
    validate: (input) => input.length > 0 || 'Host is required',
  });

  const portStr = await prompt({
    message: 'IMAP server port',
    default: '993',
  });
  const port = parseInt(portStr) || 993;

  const secure = await confirm({
    message: 'Use TLS/SSL?',
    default: true,
  });

  const username = await prompt({
    message: 'Username',
    default: email,
    validate: (input) => input.length > 0 || 'Username is required',
  });

  const pass = await password('Password');
  
  if (!pass) {
    throw new Error('Password is required');
  }

  const accountId = `imap_${Date.now()}`;
  const account: ImapAccount = {
    id: accountId,
    name: email,
    email,
    type: 'imap',
    host,
    port,
    secure,
    username,
    createdAt: new Date(),
  };

  const progress = new ProgressTracker();
  progress.start('Testing connection...');

  try {
    const provider = new ImapProvider(account, pass);
    const success = await provider.testConnection();

    if (!success) {
      throw new Error('Connection test failed');
    }

    const config = getConfigManager();
    await config.saveAccount(account);
    await config.saveCredentials(accountId, { password: pass });

    progress.succeed(`${providerName} account ${email} added successfully!`);
  } catch (error) {
    progress.fail(`Failed to add ${providerName} account: ${error}`);
    throw error;
  }
}

export async function listAccounts(): Promise<void> {
  const config = getConfigManager();
  const accounts = await config.getAccounts();

  if (accounts.length === 0) {
    logger.info('No accounts configured. Use "mailbak auth add" to add an account.');
    return;
  }

  logger.info('\nConfigured accounts:\n');

  for (const account of accounts) {
    logger.raw(`  ${account.type === 'gmail' ? '📧' : '✉️'}  ${account.email} (${account.type})`);
    logger.raw(`     ID: ${account.id}`);
    logger.raw(`     Added: ${account.createdAt.toLocaleString()}`);
    logger.raw('');
  }
}

export async function removeAccount(accountId?: string): Promise<void> {
  const config = getConfigManager();
  let finalAccountId = accountId;

  if (!finalAccountId) {
    const accounts = await config.getAccounts();
    
    if (accounts.length === 0) {
      logger.info('No accounts configured.');
      return;
    }

    finalAccountId = await select({
      message: 'Select account to remove:',
      choices: accounts.map(a => ({
        name: `${a.email} (${a.type})`,
        value: a.id,
      })),
    });
  }

  if (!finalAccountId) {
    logger.error('No account ID provided.');
    return;
  }

  const account = await config.getAccount(finalAccountId);
  
  if (!account) {
    logger.error(`Account ${finalAccountId} not found.`);
    return;
  }

  const confirmDelete = await confirm({
    message: `Are you sure you want to remove ${account.email}?`,
    default: false,
  });

  if (!confirmDelete) {
    logger.info('Cancelled.');
    return;
  }

  await config.removeAccount(finalAccountId);
  await config.deleteCredentials(finalAccountId);

  logger.success(`Account ${account.email} removed successfully!`);
}
