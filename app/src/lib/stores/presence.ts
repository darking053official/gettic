import { writable, derived } from 'svelte/store';
import { wsClient } from '$lib/ws/socket';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy' | 'typing';

interface PresenceState {
  users: Map<string, {
    status: PresenceStatus;
    lastSeen: number;
    isTyping: boolean;
  }>;
}

const initialState: PresenceState = {
  users: new Map()
};

function createPresenceStore() {
  const { subscribe, set, update } = writable<PresenceState>(initialState);

  wsClient.onMessage('presence', (data) => {
    update(state => {
      const newUsers = new Map(state.users);
      newUsers.set(data.userId, {
        status: data.status,
        lastSeen: data.lastSeen || Date.now(),
        isTyping: data.isTyping || false
      });
      
      return {
        ...state,
        users: newUsers
      };
    });
  });

  wsClient.onMessage('typing', (data) => {
    update(state => {
      const newUsers = new Map(state.users);
      const user = newUsers.get(data.userId) || {
        status: 'online' as PresenceStatus,
        lastSeen: Date.now(),
        isTyping: false
      };
      
      newUsers.set(data.userId, {
        ...user,
        isTyping: data.isTyping
      });
      
      return {
        ...state,
        users: newUsers
      };
    });
  });

  return {
    subscribe,
    
    setStatus: (status: PresenceStatus) => {
      wsClient.send({
        type: 'presence',
        status
      });
    },
    
    sendTyping: (conversationId: string, isTyping: boolean) => {
      wsClient.send({
        type: 'typing',
        conversationId,
        isTyping
      });
    },
    
    getUserPresence: (userId: string) => {
      let userPresence: any = null;
      
      update(state => {
        userPresence = state.users.get(userId) || {
          status: 'offline',
          lastSeen: 0,
          isTyping: false
        };
        
        return state;
      });
      
      return userPresence;
    },
    
    reset: () => {
      set(initialState);
    }
  };
}

export const presenceStore = createPresenceStore();

export const onlineUsers = derived(
  presenceStore,
  $presence => {
    const online: string[] = [];
    
    $presence.users.forEach((value, key) => {
      if (value.status === 'online' || value.status === 'away') {
        online.push(key);
      }
    });
    
    return online;
  }
);
