import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: number;
  };
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  status: 'sent' | 'delivered' | 'read';
}

interface ConversationsState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Map<string, Message[]>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  conversations: [],
  activeConversationId: null,
  messages: new Map(),
  isLoading: false,
  error: null
};

function createConversationsStore() {
  const { subscribe, set, update } = writable<ConversationsState>(initialState);

  return {
    subscribe,
    
    loadConversations: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        const conversations = await apiClient.get<Conversation[]>('/conversations');
        
        update(state => ({
          ...state,
          conversations,
          isLoading: false
        }));
      } catch (error: any) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message || 'Failed to load conversations'
        }));
      }
    },
    
    setActiveConversation: (conversationId: string) => {
      update(state => ({
        ...state,
        activeConversationId: conversationId
      }));
    },
    
    loadMessages: async (conversationId: string) => {
      try {
        const messages = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`);
        
        update(state => {
          const newMessages = new Map(state.messages);
          newMessages.set(conversationId, messages);
          
          return {
            ...state,
            messages: newMessages
          };
        });
      } catch (error: any) {
        console.error('Failed to load messages:', error);
      }
    },
    
    sendMessage: async (conversationId: string, content: string) => {
      try {
        const message = await apiClient.post<Message>(
          `/conversations/${conversationId}/messages`,
          { content }
        );
        
        update(state => {
          const conversationMessages = state.messages.get(conversationId) || [];
          const newMessages = new Map(state.messages);
          newMessages.set(conversationId, [...conversationMessages, message]);
          
          const updatedConversations = state.conversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                lastMessage: {
                  content: message.content,
                  senderId: message.senderId,
                  timestamp: message.timestamp
                },
                updatedAt: message.timestamp
              };
            }
            return conv;
          });
          
          return {
            ...state,
            messages: newMessages,
            conversations: updatedConversations
          };
        });
        
        return message;
      } catch (error: any) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    
    addMessage: (message: Message) => {
      update(state => {
        const conversationMessages = state.messages.get(message.conversationId) || [];
        const newMessages = new Map(state.messages);
        newMessages.set(message.conversationId, [...conversationMessages, message]);
        
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === message.conversationId) {
            const unreadCount = state.activeConversationId === message.conversationId 
              ? 0 
              : conv.unreadCount + 1;
            
            return {
              ...conv,
              lastMessage: {
                content: message.content,
                senderId: message.senderId,
                timestamp: message.timestamp
              },
              unreadCount,
              updatedAt: message.timestamp
            };
          }
          return conv;
        });
        
        return {
          ...state,
          messages: newMessages,
          conversations: updatedConversations
        };
      });
    },
    
    markAsRead: async (conversationId: string) => {
      try {
        await apiClient.post(`/conversations/${conversationId}/read`);
        
        update(state => ({
          ...state,
          conversations: state.conversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                unreadCount: 0
              };
            }
            return conv;
          })
        }));
      } catch (error) {
        console.error('Failed to mark conversation as read:', error);
      }
    },
    
    createConversation: async (participants: string[], type: 'direct' | 'group', name?: string) => {
      try {
        const conversation = await apiClient.post<Conversation>('/conversations', {
          participants,
          type,
          name
        });
        
        update(state => ({
          ...state,
          conversations: [...state.conversations, conversation]
        }));
        
        return conversation;
      } catch (error: any) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },
    
    deleteConversation: async (conversationId: string) => {
      try {
        await apiClient.delete(`/conversations/${conversationId}`);
        
        update(state => ({
          ...state,
          conversations: state.conversations.filter(conv => conv.id !== conversationId),
          messages: new Map(
            Array.from(state.messages.entries()).filter(([id]) => id !== conversationId)
          )
        }));
      } catch (error: any) {
        console.error('Failed to delete conversation:', error);
        throw error;
      }
    },
    
    reset: () => {
      set(initialState);
    }
  };
}

export const conversationsStore = createConversationsStore();

export const activeConversation = derived(
  conversationsStore,
  $conversations => {
    return $conversations.conversations.find(
      conv => conv.id === $conversations.activeConversationId
    ) || null;
  }
);

export const activeMessages = derived(
  conversationsStore,
  $conversations => {
    if (!$conversations.activeConversationId) {
      return [];
    }
    
    return $conversations.messages.get($conversations.activeConversationId) || [];
  }
);
