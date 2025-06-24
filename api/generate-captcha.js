// @ts-check
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Vercel Serverless Function
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ▼▼▼ CORSヘッダーを設定 ▼▼▼
  // どのオリジンからのリクエストも許可する
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 許可するHTTPメソッド
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // 許可するリクエストヘッダー
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ブラウザが送信する「Preflightリクエスト」(OPTIONS)に応答する
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  // ▲▲▲ CORSヘッダーの設定ここまで ▲▲▲
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

  // POSTリクエスト以外は拒否します。
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY is not set.');
      return res.status(500).json({ error: 'サーバー側でAPIキーが設定されていません。' });
    }

    const { text } = req.body; 
    if (!text || typeof text !== 'string' || text.length === 0) {
      return res.status(400).json({ error: '画像に埋め込むテキストを指定してください。' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" });

    const prompt = `
      Create a heavily distorted and noisy CAPTCHA image, with a plain white background, precisely 400x100 pixels.
      The image must contain only the exact text: "${text}".
      The text must be warped, stretched, and rotated. Use multiple overlapping fonts and sizes.
      Add random lines, arcs, and dots as noise, but ensure the text remains legible to a human.
      The output must be a single image file. Do not add any extra text or explanation.
    `;

    const result = await model.generateContent(prompt);
    const imagePart = result?.response?.candidates?.[0]?.content?.parts?.find(part => part.fileData);

    if (!imagePart || !imagePart.fileData || !imagePart.fileData.fileUri) {
        console.error("AI Response Analysis:", JSON.stringify(result, null, 2));
        throw new Error('AIからのレスポンスに画像データが含まれていません。プロンプトやモデル名を確認してください。');
    }
    
    const imageUrl = imagePart.fileData.fileUri;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`画像のダウンロードに失敗しました: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    return res.status(200).json({ imageData: imageBase64 });

  } catch (error) {
    console.error('Error generating CAPTCHA image:', error);
    return res.status(500).json({ error: error.message || '画像の生成中に不明なエラーが発生しました。' });
  }
}
