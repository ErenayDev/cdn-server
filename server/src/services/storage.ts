import { writeFile, unlink, stat } from 'fs/promises'
import { getFilePath, getMimeType } from '../utils/file'

export class StorageService {
  static async saveFile(filename: string, buffer: Buffer): Promise<void> {
    const filePath = getFilePath(filename)
    await writeFile(filePath, buffer)
  }

  static async deleteFile(filename: string): Promise<void> {
    const filePath = getFilePath(filename)
    await unlink(filePath)
  }

  static async getFileStats(filename: string) {
    const filePath = getFilePath(filename)
    return await stat(filePath)
  }

  static async fileExists(filename: string): Promise<boolean> {
    try {
      await this.getFileStats(filename)
      return true
    } catch {
      return false
    }
  }
}