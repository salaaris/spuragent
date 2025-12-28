import { GoogleGenerativeAI } from '@google/generative-ai';
import { Message } from '../db/schema';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;

// Domain knowledge about the fictional store
const DOMAIN_KNOWLEDGE = `
You are a helpful and friendly customer support agent for "SpurStore", a small e-commerce store that sells tech accessories and gadgets.

Store Information:
- Shipping Policy: We offer free shipping on orders over $50. Standard shipping (3-5 business days) is $5.99, and express shipping (1-2 business days) is $12.99. We ship to all US states and select international countries.
- Return/Refund Policy: Items can be returned within 30 days of purchase in original condition. Refunds are processed within 5-7 business days after we receive the returned item. Free return shipping is available for defective items.
- Support Hours: Our support team is available Monday-Friday, 9 AM - 6 PM EST. We respond to emails within 24 hours.
- Payment Methods: We accept all major credit cards, PayPal, and Apple Pay.
- Product Categories: We sell phone cases, laptop sleeves, charging cables, wireless earbuds, and tech accessories.

Guidelines:
- Answer questions clearly and concisely
- Be friendly and professional
- If you don't know something, admit it and offer to help find the answer
- Always be helpful and try to solve the customer's problem
`;

export class LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash (latest, fast, cost-effective)
    // Available models: 'models/gemini-2.5-flash', 'models/gemini-2.5-pro', 'models/gemini-pro-latest'
    this.modelName = 'models/gemini-2.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  private formatHistory(messages: Message[]): string {
    // Take only the last N messages to avoid token limits
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    
    return recentMessages
      .map((msg) => {
        const role = msg.sender === 'user' ? 'Customer' : 'Support Agent';
        return `${role}: ${msg.text}`;
      })
      .join('\n\n');
  }

  async generateReply(
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<string> {
    // Validate input
    if (!userMessage || userMessage.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`);
    }

    try {
      const historyText = this.formatHistory(conversationHistory);
      
      const prompt = `${DOMAIN_KNOWLEDGE}

Previous conversation:
${historyText || '(No previous messages)'}

Customer: ${userMessage.trim()}
Support Agent:`;

      let result;
      try {
        result = await this.model.generateContent(prompt);
      } catch (modelError: any) {
        // If model not found, try fallback to gemini-pro
        const errorMsg = modelError.message || modelError.toString() || '';
        const errorStatus = modelError.status || modelError.statusCode;
        
        if (errorMsg.includes('model') || errorMsg.includes('not found') || errorMsg.includes('404') || errorStatus === 404) {
          console.log('Model not found, trying fallback: models/gemini-pro-latest');
          if (this.modelName !== 'models/gemini-pro-latest') {
            this.modelName = 'models/gemini-pro-latest';
            this.model = this.genAI.getGenerativeModel({ model: this.modelName });
            result = await this.model.generateContent(prompt);
          } else {
            throw modelError;
          }
        } else {
          throw modelError;
        }
      }

      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from LLM');
      }

      return text.trim();
    } catch (error: any) {
      // Log full error for debugging
      console.error('LLM Error Details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
        cause: error.cause,
        fullError: error
      });

      // Handle specific Gemini API errors
      if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
        throw new Error('Invalid API key. Please check your GEMINI_API_KEY environment variable.');
      }
      
      if (error.message?.includes('quota') || error.message?.includes('rate limit') || error.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      }

      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out. Please try again.');
      }

      if (error.message?.includes('model') || error.message?.includes('not found')) {
        throw new Error('Model not available. Please check the model name.');
      }

      // Generic error with more details
      const errorMsg = error.message || error.toString() || 'Unknown error';
      throw new Error(`Failed to generate reply: ${errorMsg}. Please try again.`);
    }
  }
}


