"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Upload, X, AlertCircle, FileText } from "lucide-react"
import { useFileUpload } from "@/hooks/use-file-upload"
import type { UploadedFile } from "@/types/auction-types" // Updated import to use the correct type

interface FileUploaderProps {
  accept: string
  maxFiles?: number
  maxSize?: number // in bytes
  uploadedFiles: UploadedFile[]
  onFilesUploaded: (files: UploadedFile[]) => Promise<void> // Changed to async
  onFileRemoved: (fileId: string) => void
  type: "image" | "document"
}

export default function FileUploader({
  accept,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  uploadedFiles,
  onFilesUploaded,
  onFileRemoved,
  type,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadState, uploadFiles, removeFile, resetUploadState } = useFileUpload(type === "document" ? "documents" : "public")
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    await handleFileUpload(files)

    // Clear the input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileUpload = async (files: File[]) => {
    // Validate files before uploading
    const validFiles = files.filter((file) => {
      // Check file size
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`)
        return false
      }

      // Check if max files would be exceeded
      if (uploadedFiles.length + files.length > maxFiles) {
        alert(`You can only upload a maximum of ${maxFiles} files.`)
        return false
      }

      // Check file type based on 'type' prop
      const isImage = type === "image" && file.type.startsWith("image/");
      const isDocument = type === "document" && [".pdf", ".doc", ".docx"].some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isImage && !isDocument) {
        alert(`File ${file.name} is not a valid ${type}.`);
        return false;
      }

      return true
    })

    if (validFiles.length === 0) return

    try {
      const newUploadedFiles = await uploadFiles(validFiles)
      if (newUploadedFiles.length > 0) {
        onFilesUploaded(newUploadedFiles)
      }
    } catch (error) {
      console.error("Error uploading files:", error)
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    const success = await removeFile(fileId)
    if (success) {
      onFileRemoved(fileId)
    }
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors-smooth
          ${
            dragActive
              ? "border-corporate-400 dark:border-corporate-500 bg-corporate-50 dark:bg-corporate-900/30"
              : "border-gray-300 dark:border-gray-600 hover:border-corporate-300 dark:hover:border-corporate-600"
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label
              htmlFor={`file-upload-${type}`}
              className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-corporate-600 dark:text-corporate-400 hover:text-corporate-500 dark:hover:text-corporate-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-corporate-500 dark:focus-within:ring-corporate-400 transition-colors-smooth"
            >
              <span>Upload {type === "image" ? "images" : "documents"}</span>
              <input
                id={`file-upload-${type}`}
                name={`file-upload-${type}`}
                type="file"
                className="sr-only"
                accept={accept}
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploadState.isUploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {type === "image" ? "PNG, JPG, GIF up to 10MB" : "PDF, DOCX, XLSX up to 10MB"}
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="animate-fade-in">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
            <div
              className="bg-corporate-600 dark:bg-corporate-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Uploading... {uploadState.progress}%</p>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="flex items-center space-x-2 text-destructive-600 dark:text-destructive-400 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <span>{uploadState.error}</span>
          <button onClick={resetUploadState} className="text-corporate-600 dark:text-corporate-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Preview of uploaded files */}
      {type === "image" && uploadedFiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group animate-fade-in">
              <img
                src={file.url || "/placeholder.svg"}
                alt={file.name}
                className="h-24 w-full object-cover rounded-md transition-transform-smooth hover:scale-105"
              />
              <button
                type="button"
                className="absolute top-1 right-1 bg-destructive-500 dark:bg-destructive-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity-smooth hover:bg-destructive-600 dark:hover:bg-destructive-700 active-scale"
                onClick={() => handleRemoveFile(file.id)}
                aria-label={`Remove image ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {type === "document" && uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:border-corporate-200 dark:hover:border-corporate-700 transition-colors-smooth animate-fade-in"
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <span className="text-sm truncate max-w-xs dark:text-gray-200">{file.name}</span>
              </div>
              <button
                type="button"
                className="text-destructive-500 dark:text-destructive-400 hover:text-destructive-700 dark:hover:text-destructive-300 transition-colors-smooth active-scale"
                onClick={() => handleRemoveFile(file.id)}
                aria-label={`Remove document ${file.name}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
