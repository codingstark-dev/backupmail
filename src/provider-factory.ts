/**
 * Provider factory - creates appropriate provider for account
 */

import { ImapProvider } from './providers/imap';
import { GmailProvider } from './providers/gmail';
import type { Account, ImapAccount, GmailAccount } from './types';
import type { IEmailProvider } from './providers/base';

export function getProviderForAccount(account: Account, credentials: any): IEmailProvider {
  if (account.type === 'imap') {
    const imapAccount = account as ImapAccount;
    return new ImapProvider(imapAccount, credentials.password);
  } else if (account.type === 'gmail') {
    const gmailAccount = account as GmailAccount;
    return new GmailProvider(gmailAccount, credentials.clientId, credentials.clientSecret);
  }
  
  throw new Error(`Unknown account type: ${account.type}`);
}
