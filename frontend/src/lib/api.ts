const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Message {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export interface HistoryResponse {
  messages: Array<{
    id: string;
    conversationId: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
  }>;
}

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to send message');
  }

  return response.json();
}

export async function getHistory(sessionId: string): Promise<HistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || error.error || 'Failed to fetch history');
  }

  return response.json();
}


