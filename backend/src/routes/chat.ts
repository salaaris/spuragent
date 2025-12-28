import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat';
import { z } from 'zod';

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  router.post('/message', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = messageSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        let errorMessage = 'Invalid request. ';
        
        // Provide clear error messages
        if (errors.some(e => e.path.includes('message') && e.code === 'too_small')) {
          errorMessage = 'Message cannot be empty.';
        } else if (errors.some(e => e.path.includes('message') && e.code === 'too_big')) {
          errorMessage = `Message is too long. Maximum length is 2000 characters.`;
        } else {
          errorMessage += errors.map(e => e.message).join('; ');
        }
        
        return res.status(400).json({
          error: errorMessage,
        });
      }

      const { message, sessionId } = validationResult.data;

      // Process message
      const response = await chatService.processMessage({
        message,
        sessionId,
      });

      return res.json(response);
    } catch (error: any) {
      console.error('Error processing message:', error);
      
      // Graceful error handling with clear messages
      let statusCode = 500;
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message) {
        if (error.message.includes('too long')) {
          statusCode = 400;
          errorMessage = error.message;
        } else if (error.message.includes('empty')) {
          statusCode = 400;
          errorMessage = error.message;
        } else if (error.message.includes('API key') || error.message.includes('API_KEY')) {
          errorMessage = 'Service configuration error. Please contact support.';
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorMessage = 'Service is temporarily unavailable due to high demand. Please try again in a moment.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('Failed to generate')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return res.status(statusCode).json({
        error: errorMessage,
      });
    }
  });

  router.get('/history/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: 'sessionId is required',
        });
      }

      const history = await chatService.getConversationHistory(sessionId);

      return res.json({ messages: history });
    } catch (error: any) {
      console.error('Error fetching history:', error);
      
      return res.status(500).json({
        error: 'Failed to fetch conversation history',
        message: error.message || 'An unexpected error occurred',
      });
    }
  });

  return router;
}


