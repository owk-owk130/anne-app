import { useWebSpeechRecognition } from "./useWebSpeechRecognition";

interface UseSpeechToTextReturn {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  error: string | null;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    error,
    isSupported
  } = useWebSpeechRecognition();

  // Web Speech APIは自動終了なので、stopListeningは何もしない
  const stopListening = async () => {
    // 自動終了モードなので明示的な停止は不要
    console.log("[Speech-to-Text] 自動終了モードのため、手動停止は不要です");
  };

  // 中間結果がある場合はそれを表示、なければ確定結果を表示
  const displayTranscript = interimTranscript || transcript;

  return {
    isListening,
    isProcessing: false, // Web Speech APIでは処理中状態は不要
    transcript: displayTranscript,
    startListening,
    stopListening,
    error: !isSupported ? "このブラウザは音声認識をサポートしていません" : error
  };
}
