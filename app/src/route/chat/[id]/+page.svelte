<script lang="ts">
  import { page } from '$app/stores';
  import { conversationsStore } from '$lib/stores/conversations';
  import { authStore } from '$lib/stores/auth';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  let messageInput = '';
  let messagesContainer: HTMLDivElement;

  const conversationId = $page.params.id;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    conversationsStore.setActiveConversation(conversationId);
    conversationsStore.loadMessages(conversationId);
    conversationsStore.markAsRead(conversationId);

    scrollToBottom();
  });

  onDestroy(() => {
    conversationsStore.setActiveConversation('');
  });

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }

  async function handleSendMessage() {
    if (!messageInput.trim()) {
      return;
    }

    try {
      await conversationsStore.sendMessage(conversationId, messageInput.trim());
      messageInput = '';
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  $: if ($conversationsStore.messages) {
    scrollToBottom();
  }
</script>

<div class="chat-window">
  <header class="chat-header">
    <div class="chat-header-info">
      <div class="avatar">
        {$conversationsStore.conversations.find(c => c.id === conversationId)?.name?.charAt(0) || '?'}
      </div>
      <div>
        <h2>
          {$conversationsStore.conversations.find(c => c.id === conversationId)?.name || 'Sohbet'}
        </h2>
        <span class="participants-count">
          {$conversationsStore.conversations.find(c => c.id === conversationId)?.participants.length || 0} katılımcı
        </span>
      </div>
    </div>
    <button class="back-btn" onclick={() => goto('/chat')}>
      Geri
    </button>
  </header>

  <div class="messages-container" bind:this={messagesContainer}>
    {#if $conversationsStore.messages.get(conversationId)?.length === 0}
      <div class="no-messages">
        <p>Henüz mesaj yok</p>
        <span>İlk mesajı gönderin</span>
      </div>
    {:else}
      {#each $conversationsStore.messages.get(conversationId) || [] as message (message.id)}
        <div
          class="message-wrapper"
          class:own-message={message.senderId === $authStore.userId}
        >
          <div class="message-bubble">
            <div class="message-content">
              {message.content}
            </div>
            <div class="message-meta">
              <span class="message-time">
                {formatTime(message.timestamp)}
              </span>
              {#if message.senderId === $authStore.userId}
                <span class="message-status">
                  {message.status === 'read' ? 'Okundu' : message.status === 'delivered' ? 'İletildi' : 'Gönderildi'}
                </span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <footer class="message-input-container">
    <textarea
      bind:value={messageInput}
      placeholder="Mesaj yazın..."
      rows="1"
      on:keypress={handleKeyPress}
    />
    <button
      class="send-btn"
      onclick={handleSendMessage}
      disabled={!messageInput.trim()}
    >
      Gönder
    </button>
  </footer>
</div>

<style>
  .chat-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #1a1a1a;
    border-bottom: 1px solid #2a2a2a;
  }

  .chat-header-info {
    display: flex;
    align-items: center;
    gap: 0.8rem;
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
  }

  .chat-header h2 {
    font-size: 1.1rem;
    color: #e0e0e0;
    margin: 0;
  }

  .participants-count {
    font-size: 0.8rem;
    color: #a0a0a0;
  }

  .back-btn {
    background: none;
    border: 1px solid #3a3a3a;
    color: #a0a0a0;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .back-btn:hover {
    background: #2a2a2a;
    color: #e0e0e0;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .no-messages {
    text-align: center;
    color: #a0a0a0;
    margin: auto;
  }

  .no-messages p {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
    color: #e0e0e0;
  }

  .no-messages span {
    font-size: 0.9rem;
  }

  .message-wrapper {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .message-wrapper.own-message {
    justify-content: flex-end;
  }

  .message-bubble {
    max-width: 70%;
    background: #2a2a2a;
    padding: 0.6rem 0.8rem;
    border-radius: 12px;
    position: relative;
  }

  .own-message .message-bubble {
    background: #0084ff;
    color: white;
  }

  .message-content {
    font-size: 0.9rem;
    line-height: 1.4;
    word-wrap: break-word;
    white-space: pre-wrap;
  }

  .message-meta {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.3rem;
    font-size: 0.7rem;
  }

  .message-time {
    color: #a0a0a0;
  }

  .own-message .message-time {
    color: rgba(255, 255, 255, 0.8);
  }

  .message-status {
    color: #a0a0a0;
  }

  .own-message .message-status {
    color: rgba(255, 255, 255, 0.8);
  }

  .message-input-container {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    background: #1a1a1a;
    border-top: 1px solid #2a2a2a;
  }

  textarea {
    flex: 1;
    padding: 0.6rem 0.8rem;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.9rem;
    resize: none;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #0084ff;
  }

  .send-btn {
    padding: 0.6rem 1.2rem;
    background: #0084ff;
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .send-btn:hover:not(:disabled) {
    background: #0066cc;
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
