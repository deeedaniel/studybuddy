import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIGenerateRequest {
  message: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerateResponse {
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  /**
   * Generate a response using OpenAI's LLM
   */
  static async generateResponse(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    try {
      const {
        message,
        model = 'gpt-3.5-turbo',
        maxTokens = 150,
        temperature = 0.7
      } = request;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response generated from OpenAI');
      }

      return {
        response: response.trim(),
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling OpenAI API');
    }
  }

  /**
   * Validate OpenAI API key configuration
   */
  static validateConfiguration(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
  }
}
