<script lang="ts">
	import { onMount } from 'svelte';
	import { sendMessage, getHistory, type Message } from '$lib/api';

	const MAX_MESSAGE_LENGTH = 2000;
	
	let messages: Message[] = [];
	let inputValue = '';
	let isLoading = false;
	let isLoadingHistory = false;
	let sessionId: string | null = null;
	let error: string | null = null;
	let isTyping = false;
	let messageLengthWarning = false;
	let messageLengthValid = false;
	let hasReachedLimit = false; // Track if user has reached the limit

	// Load conversation history on mount if sessionId exists
	onMount(() => {
		const savedSessionId = localStorage.getItem('chatSessionId');
		if (savedSessionId) {
			sessionId = savedSessionId;
			loadHistory(savedSessionId);
		}
	});

	async function loadHistory(sessionId: string) {
		isLoadingHistory = true;
		error = null;
		try {
			const response = await getHistory(sessionId);
			if (response.messages && response.messages.length > 0) {
				messages = response.messages.map((msg) => ({
					sender: msg.sender,
					text: msg.text,
					timestamp: msg.timestamp,
				}));
				scrollToBottom();
			}
		} catch (err: any) {
			console.error('Failed to load history:', err);
			// Don't show error if conversation doesn't exist (might be cleared)
			if (err.message && !err.message.includes('not found')) {
				error = 'Failed to load conversation history';
			}
		} finally {
			isLoadingHistory = false;
		}
	}

	async function handleSend() {
		const message = inputValue.trim();
		
		// Validate message length
		if (message.length > MAX_MESSAGE_LENGTH) {
			error = `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters. Your message has ${message.length} characters.`;
			return;
		}
		
		if (!message || isLoading) {
			return;
		}

		// Add user message to UI immediately
		const userMessage: Message = {
			sender: 'user',
			text: message,
		};
		messages = [...messages, userMessage];
		const messageToSend = message; // Store before clearing
		inputValue = ''; // Clear input but keep it enabled
		isLoading = true;
		isTyping = true;
		error = null;
		messageLengthWarning = false;
		messageLengthValid = false;
		hasReachedLimit = false; // Reset limit tracking

		scrollToBottom();

		try {
			const response = await sendMessage(messageToSend, sessionId || undefined);
			
			// Update session ID
			if (response.sessionId) {
				sessionId = response.sessionId;
				localStorage.setItem('chatSessionId', response.sessionId);
			}

			// Add AI response
			const aiMessage: Message = {
				sender: 'ai',
				text: response.reply,
			};
			messages = [...messages, aiMessage];
		} catch (err: any) {
			// Graceful error handling with clear messages
			let errorMessage = 'Failed to send message. Please try again.';
			
			if (err.message) {
				if (err.message.includes('API key') || err.message.includes('API_KEY')) {
					errorMessage = 'API configuration error. Please contact support.';
				} else if (err.message.includes('rate limit') || err.message.includes('quota')) {
					errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
				} else if (err.message.includes('timeout')) {
					errorMessage = 'Request timed out. Please check your connection and try again.';
				} else if (err.message.includes('network') || err.message.includes('fetch')) {
					errorMessage = 'Network error. Please check your internet connection and try again.';
				} else if (err.message.includes('too long')) {
					errorMessage = `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`;
				} else {
					errorMessage = err.message;
				}
			}
			
			error = errorMessage;
			console.error('Error sending message:', err);
		} finally {
			isLoading = false;
			isTyping = false;
			scrollToBottom();
		}
	}
	
	function handleInputChange() {
		const length = inputValue.length;
		
		// Track if user has reached the limit
		if (length >= MAX_MESSAGE_LENGTH) {
			hasReachedLimit = true;
		}
		
		// Only show indicators if user has reached the limit before
		if (hasReachedLimit) {
			if (length > MAX_MESSAGE_LENGTH) {
				messageLengthWarning = true;
				messageLengthValid = false;
			} else if (length === MAX_MESSAGE_LENGTH) {
				messageLengthWarning = true;
				messageLengthValid = false;
			} else {
				// User removed characters after reaching limit - show green validation
				messageLengthWarning = false;
				messageLengthValid = true;
			}
		} else {
			// Don't show anything until user reaches the limit
			messageLengthWarning = false;
			messageLengthValid = false;
		}
		
		// Clear error when user starts typing
		if (error && inputValue.length > 0) {
			error = null;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
			event.preventDefault();
			handleSend();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			const messagesContainer = document.getElementById('messages-container');
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 100);
	}

	function clearChat() {
		messages = [];
		sessionId = null;
		localStorage.removeItem('chatSessionId');
		error = null;
	}
</script>

<div class="chat-container">
	<div class="chat-header">
		<div class="header-content">
			<h1>SpurStore Support</h1>
			<p class="subtitle">AI Customer Support Agent</p>
		</div>
		<button class="clear-button" on:click={clearChat} title="Start new conversation">
			New Chat
		</button>
	</div>

	<div id="messages-container" class="messages-container">
		{#if isLoadingHistory}
			<div class="welcome-message">
				<p>Loading conversation history...</p>
			</div>
		{:else if messages.length === 0}
			<div class="welcome-message">
				<p>👋 Hello! I'm your AI support agent. How can I help you today?</p>
				<div class="example-questions">
					<p class="examples-title">Try asking:</p>
					<button
						class="example-button"
						on:click={() => {
							inputValue = "What's your return policy?";
							handleSend();
						}}
					>
						What's your return policy?
					</button>
					<button
						class="example-button"
						on:click={() => {
							inputValue = "Do you ship to USA?";
							handleSend();
						}}
					>
						Do you ship to USA?
					</button>
					<button
						class="example-button"
						on:click={() => {
							inputValue = "What are your support hours?";
							handleSend();
						}}
					>
						What are your support hours?
					</button>
				</div>
			</div>
		{/if}

		{#each messages as message (message.timestamp || Math.random())}
			<div class="message message-{message.sender}">
				<div class="message-avatar">
					{#if message.sender === 'user'}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
							<path d="M12.0002 14.5C7.58172 14.5 4 15.8429 4 17.5V20H20V17.5C20 15.8429 16.4183 14.5 12.0002 14.5Z" fill="currentColor"/>
						</svg>
					{:else}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
							<circle cx="12" cy="12" r="3" fill="#0a0a0a"/>
							<path d="M8 4L9 6L11 5L10 7L13 8L10 9L11 11L9 10L8 12L7 10L5 11L6 9L3 8L6 7L5 5L7 6L8 4Z" fill="currentColor" opacity="0.6"/>
							<path d="M16 4L17 6L19 5L18 7L21 8L18 9L19 11L17 10L16 12L15 10L13 11L14 9L11 8L14 7L13 5L15 6L16 4Z" fill="currentColor" opacity="0.6"/>
						</svg>
					{/if}
				</div>
				<div class="message-content">
					<div class="message-text">{message.text}</div>
				</div>
			</div>
		{/each}

		{#if isTyping}
			<div class="message message-ai">
				<div class="message-avatar">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="5" y="4" width="14" height="16" rx="2" fill="currentColor"/>
						<rect x="8" y="7" width="8" height="6" rx="1" fill="#0a0a0a"/>
						<circle cx="10.5" cy="10" r="1" fill="#0a0a0a"/>
						<circle cx="13.5" cy="10" r="1" fill="#0a0a0a"/>
						<rect x="10" y="13" width="4" height="1.5" rx="0.75" fill="#0a0a0a"/>
						<rect x="3" y="6" width="2" height="2" rx="0.5" fill="currentColor"/>
						<rect x="19" y="6" width="2" height="2" rx="0.5" fill="currentColor"/>
						<rect x="3" y="16" width="2" height="2" rx="0.5" fill="currentColor"/>
						<rect x="19" y="16" width="2" height="2" rx="0.5" fill="currentColor"/>
					</svg>
				</div>
				<div class="message-content">
					<div class="typing-indicator">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-message">
			⚠️ {error}
		</div>
	{/if}

	{#if hasReachedLimit && messageLengthWarning && !error}
		<div class="warning-message">
			⚠️ Message length: {inputValue.length} / {MAX_MESSAGE_LENGTH} characters. Maximum is {MAX_MESSAGE_LENGTH} characters.
		</div>
	{:else if hasReachedLimit && messageLengthValid && inputValue.length > 0 && !error}
		<div class="valid-message">
			✓ Message length: {inputValue.length} / {MAX_MESSAGE_LENGTH} characters
		</div>
	{/if}

	<div class="input-container">
		<input
			type="text"
			class="message-input"
			placeholder="Type your message..."
			bind:value={inputValue}
			on:input={handleInputChange}
			on:keypress={handleKeyPress}
			maxlength={MAX_MESSAGE_LENGTH}
		/>
		<button
			class="send-button"
			on:click={handleSend}
			disabled={isLoading || !inputValue.trim()}
		>
			{isLoading ? '⏳' : '➤'}
		</button>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Oxygen, Ubuntu,
			Cantarell, sans-serif;
		background: #0a0a0a;
		min-height: 100vh;
		color: #e5e5e5;
	}

	.chat-container {
		max-width: 900px;
		margin: 0 auto;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #111111;
		box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
	}

	.chat-header {
		background: #1a1a1a;
		border-bottom: 1px solid #2a2a2a;
		padding: 1.25rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: -0.02em;
	}

	.subtitle {
		margin: 0.25rem 0 0 0;
		font-size: 0.8125rem;
		color: #888888;
		font-weight: 400;
	}

	.clear-button {
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
		color: #e5e5e5;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.8125rem;
		transition: all 0.2s;
		font-weight: 500;
	}

	.clear-button:hover {
		background: #3a3a3a;
		border-color: #4a4a4a;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background: #0f0f0f;
	}

	.welcome-message {
		text-align: center;
		padding: 3rem 2rem;
		color: #888888;
	}

	.welcome-message p {
		font-size: 1rem;
		margin-bottom: 1.5rem;
		color: #b0b0b0;
	}

	.example-questions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
	}

	.examples-title {
		font-size: 0.8125rem;
		color: #666666;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.example-button {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		padding: 0.75rem 1.5rem;
		border-radius: 10px;
		cursor: pointer;
		font-size: 0.875rem;
		color: #e5e5e5;
		transition: all 0.2s;
		min-width: 220px;
		font-weight: 400;
	}

	.example-button:hover {
		background: #2a2a2a;
		border-color: #3a3a3a;
		transform: translateY(-1px);
	}

	.message {
		display: flex;
		margin-bottom: 0.75rem;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.message-user {
		justify-content: flex-end;
	}

	.message-ai {
		justify-content: flex-start;
	}

	.message-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		color: #888888;
	}

	.message-user .message-avatar {
		background: #2a2a2a;
		border-color: #3a3a3a;
		color: #b0b0b0;
		order: 2;
	}

	.message-ai .message-avatar {
		background: #1a1a1a;
		border-color: #2a2a2a;
		color: #666666;
	}

	.message-content {
		max-width: 75%;
		padding: 0.875rem 1.125rem;
		border-radius: 16px;
		word-wrap: break-word;
		position: relative;
	}

	.message-user .message-content {
		background: #2a2a2a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
		border-bottom-right-radius: 4px;
	}

	.message-ai .message-content {
		background: #1a1a1a;
		color: #d0d0d0;
		border: 1px solid #2a2a2a;
		border-bottom-left-radius: 4px;
	}

	.message-text {
		line-height: 1.6;
		white-space: pre-wrap;
		font-size: 0.9375rem;
	}

	.typing-indicator {
		display: flex;
		gap: 5px;
		padding: 0.5rem 0;
		align-items: center;
	}

	.typing-indicator span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #666666;
		animation: typing 1.4s infinite;
	}

	.typing-indicator span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.typing-indicator span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-8px);
			opacity: 1;
		}
	}

	.error-message {
		background: #2a1a1a;
		color: #ff6b6b;
		padding: 0.875rem 1rem;
		margin: 0 1.5rem;
		border-radius: 10px;
		font-size: 0.875rem;
		border: 1px solid #3a2a2a;
	}

	.warning-message {
		background: #2a251a;
		color: #ffb84d;
		padding: 0.875rem 1rem;
		margin: 0 1.5rem;
		border-radius: 10px;
		font-size: 0.875rem;
		border: 1px solid #3a352a;
	}

	.valid-message {
		background: #1a2a1a;
		color: #6bff6b;
		padding: 0.875rem 1rem;
		margin: 0 1.5rem;
		border-radius: 10px;
		font-size: 0.875rem;
		border: 1px solid #2a3a2a;
	}

	.input-container {
		display: flex;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		background: #1a1a1a;
		border-top: 1px solid #2a2a2a;
	}

	.message-input {
		flex: 1;
		padding: 0.875rem 1.25rem;
		border: 1px solid #2a2a2a;
		border-radius: 12px;
		font-size: 0.9375rem;
		outline: none;
		transition: all 0.2s;
		background: #0f0f0f;
		color: #e5e5e5;
		font-family: inherit;
	}

	.message-input::placeholder {
		color: #666666;
	}

	.message-input:focus {
		border-color: #4a4a4a;
		background: #111111;
	}

	.send-button {
		background: #2a2a2a;
		color: #e5e5e5;
		border: 1px solid #3a3a3a;
		padding: 0.875rem 1.5rem;
		border-radius: 12px;
		cursor: pointer;
		font-size: 1.125rem;
		transition: all 0.2s;
		min-width: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 500;
	}

	.send-button:hover:not(:disabled) {
		background: #3a3a3a;
		border-color: #4a4a4a;
		transform: translateY(-1px);
	}

	.send-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
	}

	/* Scrollbar styling */
	.messages-container::-webkit-scrollbar {
		width: 6px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: #0a0a0a;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: #2a2a2a;
		border-radius: 3px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: #3a3a3a;
	}
</style>

