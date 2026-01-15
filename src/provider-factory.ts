/**
 * Provider factory - creates appropriate provider for account
 */

import { ImapProvider } from './providers/imap';
import { GmailProvider } from './providers/gmail';
import { JmapProvider } from './providers/jmap';
import type { Account, ImapAccount, GmailAccount, JmapAccount } from './types';
import type { IEmailProvider } from './providers/base';

export function getProviderForAccount(account: Account, credentials: any): IEmailProvider {
  if (account.type === 'imap') {
    const imapAccount = account as ImapAccount;
    return new ImapProvider(imapAccount, credentials.password);
  } else if (account.type === 'gmail') {
    const gmailAccount = account as GmailAccount;
    return new GmailProvider(gmailAccount, credentials.clientId, credentials.clientSecret);
  } else if (account.type === 'jmap') {
    const jmapAccount = account as JmapAccount;
    return new JmapProvider(jmapAccount, credentials.password);
  }
  
  throw new Error(`Unknown account type: ${account.type}`);
}
