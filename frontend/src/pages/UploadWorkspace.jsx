import { useEffect, useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import Icon from '../components/Icon'
import { platformApi } from '../services/api'
import { extractText, processingTime } from '../utils/data'

const MAX_SIZE = 25 * 1024 * 1024
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'aac']
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

export default function UploadWorkspace({ mode }) {
  const isOcr = mode === 'ocr'
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  function clearUrl() { if (url) URL.revokeObjectURL(url); setUrl('') }
  function reset() { clearUrl(); setFile(null); setResult(''); setTime(''); setError(''); setCopied(false) }

  function choose(selected) {
    clearUrl(); setFile(null); setResult(''); setTime(''); setError('')
    const extension = selected.name.split('.').pop()?.toLowerCase()
    const valid = isOcr ? selected.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension) : selected.type.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)
    if (!valid) return setError(`Choose a supported ${isOcr ? 'image' : 'audio'} file.`)
    if (selected.size > MAX_SIZE) return setError('This file is larger than the 25 MB upload limit.')
    setFile(selected); setUrl(URL.createObjectURL(selected))
  }

  async function submit() {
    if (!file || loading) return
    setLoading(true); setError(''); setResult(''); setTime('')
    try {
      const data = isOcr ? await platformApi.ocr(file) : await platformApi.transcribe(file)
      setResult(extractText(data, isOcr ? ['text', 'extracted_text', 'result'] : ['transcript', 'text', 'result']) || 'No text was returned.')
      setTime(processingTime(data))
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(result); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
    catch { setError('Could not copy automatically. Select the text and copy it manually.') }
  }

  const resultPanel = <section className="result-panel" aria-live="polite">
    <div className="result-header"><div><span className="eyebrow">{isOcr ? 'EXTRACTION RESULT' : 'TRANSCRIPTION RESULT'}</span><h2>{isOcr ? 'Extracted text' : 'Transcript'}</h2></div>{result && <div><button className="icon-text-button" onClick={copy}><Icon name="copy" size={17}/>{copied ? 'Copied' : 'Copy'}</button><button className="icon-text-button" onClick={reset}>Clear</button></div>}</div>
    <div className={`result-body ${loading ? 'loading' : ''}`}>
      {loading ? <div className="skeleton" aria-label={isOcr ? 'Extracting text' : 'Transcribing audio'}><span/><span/><span/><span/></div> : result ? <div className="result-text">{result}</div> : <div className="result-empty"><div><Icon name={isOcr ? 'scan' : 'mic'} size={28}/></div><h3>{isOcr ? 'Extracted text will appear here' : 'Your transcript will appear here'}</h3><p>{isOcr ? 'Upload an image and start extraction.' : 'Upload audio and start transcription.'}</p></div>}
    </div>
    {time && <footer>Processed in <strong>{time}</strong></footer>}
  </section>

  return <div className={`upload-workspace ${isOcr ? 'ocr-workspace' : ''}`}>
    <section className="upload-panel"><div className="panel-title"><span className="eyebrow">{isOcr ? 'IMAGE INPUT' : 'AUDIO INPUT'}</span><h2>{isOcr ? 'Upload an image' : 'Upload audio'}</h2><p>{isOcr ? 'Select a clear image containing readable text.' : 'Select a recording to create a secure transcript.'}</p></div>
      <FileDropzone file={file} onFile={choose} onRemove={reset} kind={isOcr ? 'image' : 'audio'} accept={isOcr ? '.png,.jpg,.jpeg,.webp,image/*' : '.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac,audio/*'} error={error} disabled={loading}/>
      {url && (isOcr ? <div className="image-preview"><img src={url} alt="Selected document preview"/></div> : <audio className="audio-preview" src={url} controls aria-label="Selected audio preview"/>)}
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className={`button primary wide ${isOcr ? 'orange' : 'green'}`} onClick={submit} disabled={!file || loading}>{loading ? (isOcr ? 'Extracting text&' : 'Transcribing audio&') : <><Icon name={isOcr ? 'scan' : 'mic'} size={18}/>{isOcr ? 'Extract Text' : 'Transcribe Audio'}</>}</button>
    </section>
    {resultPanel}
  </div>
}
