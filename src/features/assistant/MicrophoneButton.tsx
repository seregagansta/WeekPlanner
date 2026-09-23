import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult:
    | ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}
export function MicrophoneButton({ onTranscript }: { onTranscript(text: string): void }) {
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const Speech =
    (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null
        recognition.current.onerror = null
        recognition.current.onresult = null
        recognition.current.abort()
      }
    },
    [],
  )
  return (
    <div className="microphone-control">
      <button
        className={`icon-button microphone ${listening ? 'listening' : ''}`}
        disabled={!Speech}
        aria-label={listening ? 'Остановить диктовку' : 'Диктовать команду'}
        title={Speech ? 'Диктовка браузера' : 'Браузер не поддерживает диктовку. Введите текст.'}
        onClick={() => {
          if (listening) {
            recognition.current?.abort()
            return
          }
          if (!Speech) return
          const instance = new Speech()
          recognition.current = instance
          instance.lang = 'ru-RU'
          instance.interimResults = false
          instance.continuous = false
          instance.onresult = (event) => onTranscript(event.results[0][0].transcript)
          instance.onerror = (event) => {
            setMessage(
              event.error === 'not-allowed'
                ? 'Разрешите микрофон в настройках браузера.'
                : 'Диктовка недоступна. Введите текст.',
            )
            setListening(false)
          }
          instance.onend = () => setListening(false)
          try {
            instance.start()
            setListening(true)
            setMessage('')
          } catch {
            setMessage('Не удалось включить микрофон.')
          }
        }}
      >
        {listening ? <Square size={17} /> : <Mic size={19} />}
      </button>
      {message && (
        <span className="speech-message" role="status">
          {message}
        </span>
      )}
    </div>
  )
}
