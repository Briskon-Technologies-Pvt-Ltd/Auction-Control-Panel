/**
 * Utility functions for handling file operations
 */

// Format file size to human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Check if file type is an image
export function isImageFile(file: File | { type: string }): boolean {
  return file.type.startsWith("image/")
}

// Check if file type is a document
export function isDocumentFile(file: File | { type: string }): boolean {
  const documentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ]

  return documentTypes.includes(file.type)
}

// Generate a unique filename with timestamp
export function generateUniqueFilename(filename: string): string {
  const extension = filename.split(".").pop() || ""
  const name = filename.replace(`.${extension}`, "")
  const timestamp = Date.now()

  return `${name}-${timestamp}.${extension}`
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

// Check if file extension is allowed
export function isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = getFileExtension(filename)
  return allowedExtensions.includes(extension)
}
