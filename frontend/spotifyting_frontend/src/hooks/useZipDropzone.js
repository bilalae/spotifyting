import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export function useZipDropzone(apiBase, onUploadSuccess) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const API_BASE = "http://127.0.0.1:5000";

  // When user drops OR clicks and selects a file
  const onDrop = useCallback((acceptedFiles) => {
    setError('')
    const f = acceptedFiles[0]
    if (f && f.name.endsWith('.zip')) {
      setFile(f)
    } else {
      setFile(null)
      setError('Only .zip files are allowed')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    multiple: false,
  })

  const uploadFile = async (timeframe = 'lifetime') => {
    if (!file) {
      setError('Please select a .zip file first')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('timeframe', timeframe)

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else onUploadSuccess?.(data)
    } catch (err) {
      setError(`Upload error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return { file, error, loading, getRootProps, getInputProps, isDragActive, uploadFile, setFile}
}
