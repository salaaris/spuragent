import { Database, Message } from '../db/schema';
import { LLMService } from './llm';
import { v4 as uuidv4 } from 'uuid';

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export class ChatService {
  constructor(
    private db: Database,
    private llm: LLMService
  ) {}

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // Validate input
    if (!request.message || request.message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    const trimmedMessage = request.message.trim();
    
    // Check message length and throw error if too long (don't silently truncate)
    if (trimmedMessage.length > 2000) {
      throw new Error(`Message is too long. Maximum length is 2000 characters. Your message has ${trimmedMessage.length} characters.`);
    }

    const message = trimmedMessage;

    // Get or create conversation
    let conversationId = request.sessionId;
    
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${uuidv4()}`;
      await this.db.createConversation(conversationId);
    } else {
      // Verify conversation exists
      const conversation = await this.db.getConversation(conversationId);
      if (!conversation) {
        // Create new conversation if provided ID doesn't exist
        conversationId = `conv_${Date.now()}_${uuidv4()}`;
        await this.db.createConversation(conversationId);
      }
    }

    // Save user message
    const userMessageTimestamp = new Date().toISOString();
    await this.db.createMessage({
      conversationId,
      sender: 'user',
      text: message,
      timestamp: userMessageTimestamp,
    });

    // Get conversation history
    const history = await this.db.getMessages(conversationId);

    // Generate AI reply
    // If this fails, the error will be caught by the API route and returned gracefully
    const aiReply = await this.llm.generateReply(message, history);

    // Save AI message
    const aiMessageTimestamp = new Date().toISOString();
    await this.db.createMessage({
      conversationId,
      sender: 'ai',
      text: aiReply,
      timestamp: aiMessageTimestamp,
    });

    // Update conversation timestamp
    await this.db.updateConversation(conversationId);

    return {
      reply: aiReply,
      sessionId: conversationId,
    };
  }

  async getConversationHistory(sessionId: string): Promise<Message[]> {
    if (!sessionId) {
      return [];
    }

    const conversation = await this.db.getConversation(sessionId);
    if (!conversation) {
      return [];
    }

    return await this.db.getMessages(sessionId);
  }
}


