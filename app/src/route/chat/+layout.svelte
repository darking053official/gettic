<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { conversationsStore } from '$lib/stores/conversations';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }

    conversationsStore.loadConversations();
  });
</script>

<div class="chat-layout">
  <slot />
</div>

<style>
  .chat-layout {
    display: flex;
    height: 100vh;
    background: #0f0f0f;
    color: #e0e0e0;
    overflow: hidden;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
  }
</style>
