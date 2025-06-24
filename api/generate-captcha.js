// @ts-check
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * すべてのリクエストに対してCORSヘッダーを設定するヘルパー関数
 * @param {import('@vercel/node').VercelResponse} res
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Vercel Serverless Function
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ▼▼▼ 新しいCORS処理 ▼▼▼

  // 1. すべての応答にCORSヘッダーを付与する
  setCorsHeaders(res);

  // 2. ブラウザからの事前確認(Preflight)リクエスト(OPTIONS)に正しく応答する
  if (req.method === 'OPTIONS') {
    // ステータス204 (No Content)で応答し、処理を終了する
    return res.status(204).end();
  }

  // ▲▲▲ 新しいCORS処理ここまで ▲▲▲
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
    
    // 画像生成モデル用の正しいAPIエンドポイントを指定します (:predict)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    // プロンプトを定義します
    const prompt = `
      Create a heavily distorted and noisy CAPTCHA image, with a plain white background.
      The image must contain only the exact text: "${text}".
      The text must be warped, stretched, and rotated. Use multiple overlapping fonts and sizes.
      Add random lines, arcs, and dots as noise, but ensure the text remains legible to a human.
      The final output must be a single image file. Do not add any extra text or explanation.
    `;

    // 正しい命令形式（ペイロード）を作成します
    const payload = {
      instances: [{ "prompt": prompt }],
      parameters: {
        "sampleCount": 1,
        "aspectRatio": "16:9",
      }
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        console.error("Google AI API Error:", errorBody);
        throw new Error(`Google AI APIからエラーが返されました: ${errorBody.error?.message || apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    const imageBase64 = result?.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      console.error("AI Response does not contain image data:", JSON.stringify(result, null, 2));
      throw new Error('AIからのレスポンスに画像データが含まれていません。');
    }
    
    return res.status(200).json({ imageData: imageBase64 });

  } catch (error) {
    console.error('Error generating CAPTCHA image:', error);
    return res.status(500).json({ error: error.message || '画像の生成中に不明なエラーが発生しました。' });
  }
}
