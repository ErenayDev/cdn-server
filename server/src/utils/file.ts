import { mkdir } from 'fs/promises'
import { join } from 'path'
import { config } from '../config'

export const ensureUploadDir = async () => {
  try {
    await mkdir(config.uploadDir, { recursive: true })
  } catch (error) {
    console.error('Failed to create upload directory:', error)
  }
}

export const generateFileName = (originalName: string, forceWebp = false): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = forceWebp ? 'webp' : originalName.split('.').pop()
  return `${timestamp}-${random}.${extension}`
}

export const getFilePath = (filename: string): string => {
  return join(config.uploadDir, filename)
}

export const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

export const isImage = (mimeType: string): boolean => {
  return mimeType.startsWith('image/')
}

export const shouldConvertToWebp = (mimeType: string): boolean => {
  return ['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)
}