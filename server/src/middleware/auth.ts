import { Context } from 'elysia'
import { config } from '../config'

export const validateApiKey = (context: Context) => {
  const apiKey = context.headers['authorization']?.split("Bearer ")[1];
  
  if (!apiKey || !config.apiKeys.has(apiKey)) {
    context.set.status = 401
    return { error: 'Invalid API key' }
  }
}