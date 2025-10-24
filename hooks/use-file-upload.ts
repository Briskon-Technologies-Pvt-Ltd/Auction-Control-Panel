"use client"

import { useState, useCallback } from "react"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export type UploadedFile = {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: string
  file: File
}

export function useFileUpload(folder: "public" | "documents" = "public") {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  })

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadedFile[]> => {
    if (!files.length) return []

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
    })

    const uploadedFiles: UploadedFile[] = []
    const totalFiles = files.length

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadState((prev) => ({
          ...prev,
          progress: Math.round((i / totalFiles) * 100),
        }))

        const fileName = `${Date.now()}_${file.name}`
        const filePath = `${folder}/${fileName}`
        const { data, error } = await supabase.storage
          .from("auctions")
          .upload(filePath, file, { upsert: true })

        if (error) {
          throw new Error(`Error uploading ${file.name}: ${error.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('auctions')
          .getPublicUrl(filePath)

        uploadedFiles.push({
          id: data.path,
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          file,
        })
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
      })

      return uploadedFiles
    } catch (error) {
      console.error("Upload error:", error)
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      }))
      return uploadedFiles
    }
  }, [folder])

  const removeFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage.from("auctions").remove([fileId])
      if (error) {
        throw new Error(error.message)
      }
      return true
    } catch (error) {
      console.error("Delete error:", error)
      setUploadState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown deletion error",
      }))
      return false
    }
  }, [])

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
    })
  }, [])

  return {
    uploadState,
    uploadFiles,
    removeFile,
    resetUploadState,
  }
}
