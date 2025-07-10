import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => Promise<void>;
  error: string | null;
  isSupported: boolean;
}

// Web Speech API の型定義
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onspeechend: () => void;
  onstart: () => void;
}

interface ISpeechRecognitionStatic {
  new (): ISpeechRecognition;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// ブラウザ互換性のための型定義
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionStatic;
    webkitSpeechRecognition: ISpeechRecognitionStatic;
  }
}

export function useWebSpeechRecognition(): UseWebSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // ブラウザサポートチェック
  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!isSupported) return;

    // SpeechRecognition インスタンスの作成
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 設定
    recognition.continuous = false; // 自動終了モード
    recognition.interimResults = true; // 中間結果を表示
    recognition.lang = "ja-JP"; // 日本語

    // イベントハンドラー
    recognition.onstart = () => {
      console.log("[Speech Recognition] 音声認識を開始しました");
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // 結果を処理
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        console.log("[Speech Recognition] 確定結果:", finalTranscript);
        setTranscript(finalTranscript);
        setInterimTranscript("");
      } else {
        console.log("[Speech Recognition] 中間結果:", interimTranscript);
        setInterimTranscript(interimTranscript);
      }
    };

    recognition.onspeechend = () => {
      console.log("[Speech Recognition] 発話終了を検知");
    };

    recognition.onend = () => {
      console.log("[Speech Recognition] 音声認識が終了しました");
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[Speech Recognition] エラー:", event.error);
      setIsListening(false);
      setInterimTranscript("");
      
      // エラーメッセージの日本語化
      switch (event.error) {
        case "not-allowed":
          setError("マイクの使用が許可されていません。ブラウザの設定を確認してください。");
          break;
        case "no-speech":
          setError("音声が検出されませんでした。もう一度お試しください。");
          break;
        case "network":
          setError("ネットワークエラーが発生しました。");
          break;
        case "aborted":
          setError("音声認識が中断されました。");
          break;
        default:
          setError(`音声認識エラー: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, isListening]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("このブラウザは音声認識をサポートしていません。");
      return;
    }

    if (!recognitionRef.current) {
      setError("音声認識の初期化に失敗しました。");
      return;
    }

    try {
      // 前回の結果をクリア
      setTranscript("");
      setInterimTranscript("");
      setError(null);

      // マイク権限の確認
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 音声認識を開始
      recognitionRef.current.start();
    } catch (err) {
      console.error("[Speech Recognition] 開始エラー:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("音声認識を開始できませんでした。");
      }
    }
  }, [isSupported]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    error,
    isSupported
  };
}