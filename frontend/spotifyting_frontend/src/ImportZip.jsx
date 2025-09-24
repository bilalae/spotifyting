import React, { useState } from 'react'
import { useZipDropzone } from './hooks/useZipDropzone'
import { CheckCheckIcon, CheckCircle, CheckCircle2, CheckCircle2Icon, Cross, CrosshairIcon, CrossIcon, Import, ImportIcon, X } from 'lucide-react'

const ImportZip = ({ onUploadSuccess }) => {
    const [toast, setToast] = useState(null);
  const {
    file,
    error,
    loading,
    getRootProps,
    getInputProps,
    isDragActive,
    uploadFile,
    setFile
  } = useZipDropzone(import.meta.env.VITE_API_BASE, (data) => {
    onUploadSuccess?.(data) 
    setToast('Upload successful!')
    setFile(null)
    setTimeout(() => setToast(null), 3000)


  })


  const handleClear = () => setFile(null)
  return (
    <section className="bg-base-200" id='import'>
      <div className="container mx-auto py-12 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Import Your Spotify Data</h2>
        <p className="mb-6">Upload your Spotify data ZIP file to get started.</p>

        <div
          {...getRootProps()}
          className={` py-20 border-2 border-dashed rounded-2xl bg-base-100 shadow-md cursor-pointer hover:bg-base-100/80  relative transition
            ${isDragActive || file ? 'border-primary bg-primary/20 hover:bg-primary/10' : 'border-base-300'}`}
        >
          {toast ?
          <CheckCheckIcon className="h-12 w-12 mx-auto mb-4 text-success/70" />
          :
          file ? 
          <CheckCircle2Icon className="h-12 w-12 mx-auto mb-4 text-success/70" />
         : <ImportIcon className="h-12 w-12 mx-auto mb-4 text-base-content/70" />
        }  
          <input {...getInputProps()} />

          {/* ❌ Clear Button */}
          {file && (
            <button
              type="button"
                onClick={(e) => {
    e.stopPropagation(); // ✅ prevent dropzone from opening the file picker
    handleClear();
  }}
              className="btn btn-xs btn-circle btn-error btn-soft absolute -top-5 -right-5"
              title="Remove file"
            >
                <X className="h-4 w-4 text-error-content" />
            </button>
          )}
          {file ? (
            <p className="text-success">Selected: {file.name}</p>
          ) : (
            <p className={`text-base-content/70 ${toast ? 'text-success' : ''}`}>
              {toast ? "Uploaded!" : isDragActive ? 'Drop the file here...' : 'Drag & drop or click to select a ZIP file'}
            </p>
          )}
        </div>

        {error && <p className="text-error mt-3">{error}</p>}
        {file && (
          <button
            className="btn btn-primary btn-lg mt-4"
            onClick={uploadFile}
            disabled={loading}
          >
            {loading ? 'Uploading…' : 'Upload'}
          </button>
        )}

        {toast && (
          <div className="toast toast-top toast-end">
            <div className="alert alert-success">  
                <div>
                    <span>{toast}</span>
                </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ImportZip
