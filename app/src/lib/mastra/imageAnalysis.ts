import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const imageAnalysisAgent = async (
  imageBase64: string
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Google AI API key is not configured. Please set VITE_GOOGLE_AI_API_KEY in your .env.local file.'
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `あなたは猫の表情と感情を読み取る専門家です。
送られてきた画像を詳細に観察し、文章で説明してください：

【猫の場合】
- 毛色と模様（黒猫、白猫、トラ柄、三毛など具体的に）
- 目の表情（開き具合、瞳の状態、視線の方向、目の輝き）
- 耳の位置と向き（立っている、倒れている、回転している、警戒の有無）
- 口元の様子（リラックス、少し開いている、舌が見える、ひげの位置）
- 体の姿勢（丸まっている、伸びている、警戒している、リラックスしている）
- 毛の状態（ふわふわ、逆立っている、なめらか）
- 周囲の環境や状況（場所、時間帯、他の物体との関係）
- これらの観察から読み取れる具体的な感情や気持ち
- その猫が何を考えていそうか、どんな状況にいるかの推察

【猫以外の場合】
- 何が写っているかの詳細な説明
- その対象の特徴や状態
- 周囲の環境

analysis は最低でも3-4文以上の詳細な観察内容を含めてください。`,
          },
          {
            type: 'image',
            image: imageBase64,
          },
        ],
      },
    ],
  });

  return text;
};
