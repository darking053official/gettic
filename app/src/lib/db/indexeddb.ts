import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'gettic_db';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const CONVERSATIONS_STORE = 'conversations';
const IDENTITIES_STORE = 'identities';
const PREKEYS_STORE = 'prekeys';

class IndexedDBService {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          messagesStore.createIndex('conversationId', 'conversationId');
          messagesStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
          conversationsStore.createIndex('updatedAt', 'updatedAt');
        }

        if (!db.objectStoreNames.contains(IDENTITIES_STORE)) {
          const identitiesStore = db.createObjectStore(IDENTITIES_STORE, { keyPath: 'id' });
          identitiesStore.createIndex('userId', 'userId');
        }

        if (!db.objectStoreNames.contains(PREKEYS_STORE)) {
          const prekeysStore = db.createObjectStore(PREKEYS_STORE, { keyPath: 'id' });
          prekeysStore.createIndex('used', 'used');
        }
      }
    });
  }

  async saveMessage(message: any): Promise<void> {
    await this.init();
    await this.db!.put(MESSAGES_STORE, message);
  }

  async saveMessages(messages: any[]): Promise<void> {
    await this.init();
    const tx = this.db!.transaction(MESSAGES_STORE, 'readwrite');
    
    for (const message of messages) {
      await tx.store.put(message);
    }
    
    await tx.done;
  }

  async getMessage(messageId: string): Promise<any | undefined> {
    await this.init();
    return await this.db!.get(MESSAGES_STORE, messageId);
  }

  async getMessagesByConversation(conversationId: string, limit?: number): Promise<any[]> {
    await this.init();
    const index = this.db!.transaction(MESSAGES_STORE).store.index('conversationId');
    const messages = await index.getAll(conversationId);
    
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    if (limit) {
      return messages.slice(-limit);
    }
    
    return messages;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.init();
    await this.db!.delete(MESSAGES_STORE, messageId);
  }

  async clearMessages(conversationId: string): Promise<void> {
    await this.init();
    const index = this.db!.transaction(MESSAGES_STORE, 'readwrite').store.index('conversationId');
    let cursor = await index.openCursor(conversationId);
    
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }

  async saveConversation(conversation: any): Promise<void> {
    await this.init();
    await this.db!.put(CONVERSATIONS_STORE, conversation);
  }

  async saveConversations(conversations: any[]): Promise<void> {
    await this.init();
    const tx = this.db!.transaction(CONVERSATIONS_STORE, 'readwrite');
    
    for (const conversation of conversations) {
      await tx.store.put(conversation);
    }
    
    await tx.done;
  }

  async getConversation(conversationId: string): Promise<any | undefined> {
    await this.init();
    return await this.db!.get(CONVERSATIONS_STORE, conversationId);
  }

  async getAllConversations(): Promise<any[]> {
    await this.init();
    const conversations = await this.db!.getAll(CONVERSATIONS_STORE);
    
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    
    return conversations;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.init();
    await this.db!.delete(CONVERSATIONS_STORE, conversationId);
    await this.clearMessages(conversationId);
  }

  async saveIdentity(identity: any): Promise<void> {
    await this.init();
    await this.db!.put(IDENTITIES_STORE, identity);
  }

  async getIdentity(id: string): Promise<any | undefined> {
    await this.init();
    return await this.db!.get(IDENTITIES_STORE, id);
  }

  async getIdentityByUserId(userId: string): Promise<any | undefined> {
    await this.init();
    const index = this.db!.transaction(IDENTITIES_STORE).store.index('userId');
    return await index.get(userId);
  }

  async savePrekey(prekey: any): Promise<void> {
    await this.init();
    await this.db!.put(PREKEYS_STORE, prekey);
  }

  async savePrekeys(prekeys: any[]): Promise<void> {
    await this.init();
    const tx = this.db!.transaction(PREKEYS_STORE, 'readwrite');
    
    for (const prekey of prekeys) {
      await tx.store.put(prekey);
    }
    
    await tx.done;
  }

  async getPrekey(prekeyId: string): Promise<any | undefined> {
    await this.init();
    return await this.db!.get(PREKEYS_STORE, prekeyId);
  }

  async getUnusedPrekeys(): Promise<any[]> {
    await this.init();
    const index = this.db!.transaction(PREKEYS_STORE).store.index('used');
    const prekeys = await index.getAll(false);
    
    return prekeys;
  }

  async markPrekeyAsUsed(prekeyId: string): Promise<void> {
    await this.init();
    const prekey = await this.getPrekey(prekeyId);
    
    if (prekey) {
      prekey.used = true;
      await this.db!.put(PREKEYS_STORE, prekey);
    }
  }

  async clearAll(): Promise<void> {
    await this.init();
    
    const tx = this.db!.transaction(
      [MESSAGES_STORE, CONVERSATIONS_STORE, IDENTITIES_STORE, PREKEYS_STORE],
      'readwrite'
    );
    
    await Promise.all([
      tx.objectStore(MESSAGES_STORE).clear(),
      tx.objectStore(CONVERSATIONS_STORE).clear(),
      tx.objectStore(IDENTITIES_STORE).clear(),
      tx.objectStore(PREKEYS_STORE).clear()
    ]);
    
    await tx.done;
  }
}

export const indexedDB = new IndexedDBService();
