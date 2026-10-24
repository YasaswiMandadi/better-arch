/** A Contact-page message as stored in MongoDB (collection "messages"). Written by
 * /api/contact, read and managed by /api/messages (console Dashboard). */
export interface MessageDoc {
  _id: string;
  /** 'general' | 'episode' | 'propose' | 'contribute' (the Contact page's four forms) */
  type: string;
  name: string;
  email: string;
  /** email in lower case, for "all messages from this person" */
  emailKey: string;
  org: string;
  subject: string;
  guest: string;
  topic: string;
  msg: string;
  /** spam signals; empty = looks fine */
  flags: string[];
  createdAt: Date;
  read: boolean;
  emailed: boolean;
}

export const MESSAGE_TYPES = ['general', 'episode', 'propose', 'contribute'] as const;
