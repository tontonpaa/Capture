// @ts-check
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Vercel Serverless Function
 * この関数は /api/generate-captcha というURLでアクセス可能になります。
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // POSTリクエスト以外は拒否します。
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 安全な場所(Vercelの環境変数)からAPIキーを読み込みます。
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_AI_API_KEY is not set.');
      return res.status(500).json({ error: 'サーバー側でAPIキーが設定されていません。' });
    }

    // Vercelではリクエストボディは自動でパースされます。
    const { text } = req.body; 
    if (!text || typeof text !== 'string' || text.length === 0) {
      return res.status(400).json({ error: '画像に埋め込むテキストを指定してください。' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // モデル名は適宜最新のものに更新してください。(例: 'imagen-3.0-generate-002')
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" });

    // AIに送信するプロンプトを定義します。
    const prompt = `
      Create a heavily distorted and noisy CAPTCHA image, with a plain white background, precisely 400x100 pixels.
      The image must contain only the exact text: "${text}".
      The text must be warped, stretched, and rotated. Use multiple overlapping fonts and sizes.
      Add random lines, arcs, and dots as noise, but ensure the text remains legible to a human.
      The output must be a single image file. Do not add any extra text or explanation.
    `;

    // AIのAPIを呼び出してコンテンツを生成します。
    const result = await model.generateContent(prompt);

    // AIのレスポンスを安全に処理します (Optional Chaining `?.` を使用)。
    const imagePart = result?.response?.candidates?.[0]?.content?.parts?.find(part => part.fileData);

    // 画像データが見つからない場合は、エラーを返します。
    if (!imagePart || !imagePart.fileData || !imagePart.fileData.fileUri) {
        console.error("AI Response Analysis:", JSON.stringify(result, null, 2));
        throw new Error('AIからのレスポンスに画像データが含まれていません。プロンプトやモデル名を確認してください。');
    }
    
    // AIから返されたURLを使って画像データを取得します。
    const imageUrl = imagePart.fileData.fileUri;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`画像のダウンロードに失敗しました: ${imageResponse.statusText}`);
    }
    // 画像をBufferに変換し、さらにBase64文字列に変換します。
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // 成功レスポンスとして、Base64エンコードされた画像データをクライアントに返します。
    return res.status(200).json({ imageData: imageBase64 });

  } catch (error) {
    // エラーが発生した場合は、コンソールに記録し、500エラーを返します。
    console.error('Error generating CAPTCHA image:', error);
    return res.status(500).json({ error: error.message || '画像の生成中に不明なエラーが発生しました。' });
  }
}
