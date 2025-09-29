import sharp from 'sharp'
import { config } from '../config'

export class ImageService {
  static async convertToWebp(buffer: ArrayBuffer): Promise<Buffer> {
    return await sharp(Buffer.from(buffer))
      .webp({
        quality: config.webp.quality,
        effort: config.webp.effort
      })
      .toBuffer()
  }

  static async processImage(buffer: ArrayBuffer, mimeType: string): Promise<{
    processedBuffer: Buffer,
    outputMimeType: string,
    shouldRename: boolean
  }> {
    if (mimeType === 'image/webp') {
      return {
        processedBuffer: Buffer.from(buffer),
        outputMimeType: mimeType,
        shouldRename: false
      }
    }

    if (['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
      const webpBuffer = await this.convertToWebp(buffer)
      return {
        processedBuffer: webpBuffer,
        outputMimeType: 'image/webp',
        shouldRename: true
      }
    }

    return {
      processedBuffer: Buffer.from(buffer),
      outputMimeType: mimeType,
      shouldRename: false
    }
  }
}