<script lang="ts">
  import { conversationsStore } from '$lib/stores/conversations';
  import { authStore } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    conversationsStore.loadConversations();
  });

  function handleLogout() {
    authStore.logout();
    goto('/login');
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="chat-container">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>Gettic</h1>
      <div class="user-actions">
        <button class="icon-btn" onclick={() => goto('/settings')}>Ayarlar</button>
        <button class="icon-btn" onclick={handleLogout}>Çıkış</button>
      </div>
    </div>

    <div class="search-bar">
      <input type="text" placeholder="Sohbet ara..." />
    </div>

    <div class="conversation-list">
      {#if $conversationsStore.isLoading}
        <div class="loading">Yükleniyor...</div>
      {:else if $conversationsStore.conversations.length === 0}
        <div class="empty-state">
          <p>Henüz sohbet yok</p>
        </div>
      {:else}
        {#each $conversationsStore.conversations as conversation (conversation.id)}
          <button
            class="conversation-item"
            class:active={$conversationsStore.activeConversationId === conversation.id}
            onclick={() => goto(`/chat/${conversation.id}`)}
          >
            <div class="avatar">
              {conversation.name?.charAt(0) || '?'}
            </div>
            <div class="conversation-info">
              <div class="conversation-header">
                <span class="conversation-name">
                  {conversation.name || 'Sohbet'}
                </span>
                {#if conversation.lastMessage}
                  <span class="conversation-time">
                    {formatTime(conversation.lastMessage.timestamp)}
                  </span>
                {/if}
              </div>
              <div class="conversation-preview">
                {#if conversation.lastMessage}
                  <span class="last-message">
                    {conversation.lastMessage.content}
                  </span>
                {/if}
                {#if conversation.unreadCount > 0}
                  <span class="unread-badge">
                    {conversation.unreadCount}
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <main class="main-content">
    <div class="no-chat-selected">
      <h2>Sohbet seçin</h2>
      <p>Mesajlaşmaya başlamak için soldan bir sohbet seçin</p>
    </div>
  </main>
</div>

<style>
  .chat-container {
    display: flex;
    width: 100%;
    height: 100vh;
  }

  .sidebar {
    width: 320px;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid #2a2a2a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sidebar-header h1 {
    font-size: 1.5rem;
    background: linear-gradient(135deg, #0084ff, #00b4d8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .user-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #a0a0a0;
    cursor: pointer;
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
    transition: color 0.3s;
  }

  .icon-btn:hover {
    color: #0084ff;
  }

  .search-bar {
    padding: 0.8rem;
    border-bottom: 1px solid #2a2a2a;
  }

  .search-bar input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.9rem;
  }

  .search-bar input:focus {
    outline: none;
    border-color: #0084ff;
  }

  .conversation-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .loading,
  .empty-state {
    text-align: center;
    color: #a0a0a0;
    padding: 2rem;
  }

  .conversation-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    text-align: left;
  }

  .conversation-item:hover {
    background: #2a2a2a;
  }

  .conversation-item.active {
    background: #0084ff20;
    border: 1px solid #0084ff40;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #0084ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    flex-shrink: 0;
  }

  .conversation-info {
    flex: 1;
    min-width: 0;
  }

  .conversation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
  }

  .conversation-name {
    font-weight: 600;
    color: #e0e0e0;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .conversation-time {
    font-size: 0.7rem;
    color: #a0a0a0;
    flex-shrink: 0;
  }

  .conversation-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .last-message {
    font-size: 0.8rem;
    color: #a0a0a0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .unread-badge {
    background: #0084ff;
    color: white;
    border-radius: 10px;
    padding: 0.1rem 0.4rem;
    font-size: 0.7rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f0f;
  }

  .no-chat-selected {
    text-align: center;
    color: #a0a0a0;
  }

  .no-chat-selected h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #e0e0e0;
  }

  .no-chat-selected p {
    font-size: 0.9rem;
  }
</style>
