import { useRef, useState } from 'react'
import Icon from './Icon'
import { formatBytes } from '../utils/data'

export default function FileDropzone({ file, onFile, onRemove, accept, kind, error, disabled }) {
  const input = useRef(null)
  const [dragging, setDragging] = useState(false)
  function choose(files) { setDragging(false); if (files?.[0]) onFile(files[0]) }
  return <div>
    <div className={`dropzone ${dragging ? 'dragging' : ''} ${error ? 'invalid' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files) }}>
      <input ref={input} type="file" accept={accept} onChange={(e) => choose(e.target.files)} disabled={disabled} aria-label={`Choose ${kind} file`}/>
      <div className="upload-icon"><Icon name="upload" size={25}/></div>
      <strong>Drop your {kind} here</strong><p>or choose a file from your device</p>
      <button className="button secondary" type="button" onClick={() => input.current?.click()} disabled={disabled}>Browse {kind === 'image' ? 'Images' : 'Files'}</button>
      <small>{kind === 'image' ? 'PNG, JPG or WebP' : 'MP3, WAV, M4A, OGG or WebM'} · Maximum 25 MB</small>
    </div>
    {file && <div className="selected-file"><div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div><div className="file-actions"><button type="button" onClick={() => input.current?.click()} disabled={disabled}>Replace</button><button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove selected file"><Icon name="trash" size={17}/></button></div></div>}
  </div>
}
