import { useCallback, useRef, useState } from "react";

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

// 音声キャッシュ（同じテキストの再生成を避ける）
const audioCache = new Map<string, string>();

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    console.log("[TTS] 音声合成開始:", {
      text: `${text.substring(0, 50)}...`,
      platform: navigator.userAgent,
      audioEnabled: "Audio" in window
    });

    try {
      setError(null);

      // 既に再生中の場合は停止
      if (audioRef.current) {
        console.log("[TTS] 既存の音声を停止");
        audioRef.current.pause();
        audioRef.current = null;
      }

      // 空のテキストは無視
      if (!text.trim()) {
        console.log("[TTS] 空のテキストのため処理をスキップ");
        return;
      }

      setIsPlaying(true);

      // キャッシュチェック
      const cacheKey = text;
      let audioUrl = audioCache.get(cacheKey);

      if (audioUrl) {
        console.log("[TTS] キャッシュから音声を取得");
      }

      if (!audioUrl) {
        // Google Cloud Text-to-Speech APIを呼び出し
        const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY;
        if (!apiKey) {
          console.error("[TTS] APIキーが設定されていません");
          throw new Error("Google Cloud TTS APIキーが設定されていません");
        }

        console.log("[TTS] Google Cloud TTS APIを呼び出し中...");

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              input: {
                text: text
              },
              voice: {
                languageCode: "ja-JP",
                name: "ja-JP-Neural2-B",
                ssmlGender: "FEMALE"
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0,
                pitch: 0,
                volumeGainDb: 0
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[TTS] APIエラー:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`音声合成に失敗しました: ${response.status}`);
        }

        const data = await response.json();
        console.log("[TTS] API応答を受信:", {
          hasAudioContent: !!data.audioContent,
          audioLength: data.audioContent?.length
        });

        if (!data.audioContent) {
          console.error("[TTS] 音声データが含まれていません");
          throw new Error("音声データが返されませんでした");
        }

        // Base64デコードしてBlobを作成
        console.log("[TTS] 音声データをデコード中...");
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/mp3" });
        audioUrl = URL.createObjectURL(blob);
        console.log("[TTS] 音声Blob URLを生成:", {
          blobSize: blob.size,
          blobType: blob.type,
          url: audioUrl
        });

        // キャッシュに保存（最大50件）
        if (audioCache.size >= 50) {
          const firstKey = audioCache.keys().next().value ?? "";
          const firstUrl = audioCache.get(firstKey);
          if (firstUrl) {
            URL.revokeObjectURL(firstUrl);
          }
          audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, audioUrl);
      }

      // 音声を再生
      console.log("[TTS] Audioオブジェクトを作成中...");
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Androidでの音声再生のための設定
      audio.volume = 1.0;
      audio.preload = "auto";

      audio.onended = () => {
        console.log("[TTS] 音声再生が完了しました");
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("[TTS] 音声再生エラー:", {
          error: e,
          audioState: {
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error
          }
        });
        setError("音声の再生に失敗しました");
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.oncanplaythrough = () => {
        console.log("[TTS] 音声の準備が完了しました");
      };

      console.log("[TTS] 音声再生を開始します...");
      await audio.play();
      console.log("[TTS] 音声再生が開始されました");
    } catch (err) {
      console.error("[TTS] エラーが発生しました:", {
        error: err,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });

      if (err instanceof Error) {
        // 特定のエラーメッセージを分かりやすくする
        if (err.name === "NotAllowedError") {
          setError(
            "音声再生が許可されていません。画面をタップしてから再度お試しください"
          );
        } else if (err.name === "NotSupportedError") {
          setError("このデバイスでは音声再生がサポートされていません");
        } else {
          setError(err.message);
        }
      } else {
        setError("音声合成に失敗しました");
      }
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  return {
    isPlaying,
    speak,
    stop,
    error
  };
}
