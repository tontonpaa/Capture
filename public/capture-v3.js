(() => {
  // === 動的CSS追加 ===
  const style = document.createElement('style');
  style.textContent = `
    .myCaptchaModal {
      position: fixed; top:0; left:0; width:100vw; height:100vh;
      background: rgba(0,0,0,0.5);
      display: flex; justify-content: center; align-items: center; z-index: 9999;
    }
    .myCaptchaModal.hidden { display: none; }
    .myCaptchaModal .modalContent {
      background: #fff; padding: 20px 30px; border-radius: 8px;
      width: 420px; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      font-family: sans-serif; text-align: center; color: #000;
      transition: background-color 0.3s, color 0.3s;
    }
    .myCaptchaModal #captchaImageContainer {
      width: 400px; height: 100px; background: #f0f0f0; margin: 0 auto 12px;
      display: flex; justify-content: center; align-items: center;
      font-size: 14px; color: #888; border-radius: 4px; border: 1px solid #ccc;
    }
    .myCaptchaModal.dark #captchaImageContainer { background: #333; color: #aaa; border-color: #555; }
    .myCaptchaModal #captchaImage { max-width: 100%; height: auto; display: none; }
    .myCaptchaModal p { margin: 0 0 12px; font-size: 16px; white-space: pre-line; }
    .myCaptchaModal input[type="text"] {
      width: 100%; padding: 8px; font-size: 16px; margin-bottom: 12px;
      box-sizing: border-box; border: 1px solid #888; border-radius: 4px;
      transition: background-color 0.3s, color 0.3s, border-color 0.3s;
      color: #000; background: #fff;
    }
    .myCaptchaModal button {
      padding: 8px 16px; font-size: 15px; cursor: pointer; border-radius: 4px;
      border: 1px solid #888; background: #eee; transition: background-color 0.2s, color 0.2s;
      color: #000;
    }
    .myCaptchaModal button:hover { background: #ddd; }
    .myCaptchaModal button:disabled { background: #ccc; cursor: not-allowed; }
    .myCaptchaModal #captchaMessage { color: red; min-height: 18px; font-weight: bold; margin-top: 6px; }
    #buttonGroup { display: flex; justify-content: center; gap: 8px; align-items: center; margin-bottom: 8px; }
    .myCaptchaModal.dark { background: rgba(30,30,30,0.85); }
    .myCaptchaModal.dark .modalContent { background: #222; color: #eee; }
    .myCaptchaModal.dark input[type="text"], .myCaptchaModal.dark button {
      background: #444; color: #eee; border-color: #666;
    }
    .myCaptchaModal.dark button:hover { background: #555; }
    .myCaptchaModal.dark button:disabled { background: #333; }
    #toggleDarkMode { font-size: 20px; padding: 4px 12px; user-select: none; outline: none; }
  `;
  document.head.appendChild(style);

  // === 動的モーダルDOM作成 ===
  const modal = document.createElement('div');
  modal.className = 'myCaptchaModal hidden';
  modal.innerHTML = `
    <div class="modalContent">
      <p>表示された画像内の文字を正確に入力してください:</p>
      <div id="captchaImageContainer">
        <span id="imageLoadingText">画像を生成中...</span>
        <img id="captchaImage" alt="CAPTCHA Image" />
      </div>
      <input type="text" id="captchaInput" autocomplete="off" />
      <div id="buttonGroup">
        <button id="toggleDarkMode" title="ダークモード切替">🌙</button>
        <button id="captchaOk">OK</button>
        <button id="captchaCancel">キャンセル</button>
      </div>
      <p id="captchaMessage"></p>
    </div>
  `;
  document.body.appendChild(modal);

  // === 要素参照 ===
  const imageLoadingText = modal.querySelector('#imageLoadingText');
  const captchaImageEl = modal.querySelector('#captchaImage');
  const captchaInputEl = modal.querySelector('#captchaInput');
  const captchaOkBtn = modal.querySelector('#captchaOk');
  const captchaCancelBtn = modal.querySelector('#captchaCancel');
  const captchaMsgEl = modal.querySelector('#captchaMessage');
  const toggleDarkBtn = modal.querySelector('#toggleDarkMode');

  // === 変数 ===
  const CHECK_DURATION_MS = 2000;
  const BOT_SCORE_THRESHOLD = 1;
  let mouseMoveCount = 0, scrollCount = 0, focusChanges = 0;
  let startTime = Date.now();
  let isBot = true;
  let failedCount = 0;
  let locked = false;
  let darkMode = false;
  let currentCaptchaText = '';
  let activeHandlers = {};

  // === ユーザー操作監視 ===
  document.addEventListener('mousemove', () => mouseMoveCount++);
  document.addEventListener('scroll', () => scrollCount++);
  window.addEventListener('blur', () => focusChanges++);
  setTimeout(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const activityScore = (mouseMoveCount + scrollCount + focusChanges) / elapsed;
    isBot = activityScore < BOT_SCORE_THRESHOLD;
    console.log(`[BotCheck] 判定: ${isBot ? 'Botの可能性あり' : '人間'} | スコア: ${activityScore.toFixed(2)}`);
  }, CHECK_DURATION_MS);

  // === ランダム文字列生成 ===
  function generateRandomString(length = 6) {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 似ている文字(1,i,l,0,O)を除外
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function hideModal() {
    modal.classList.add('hidden');
    // イベントリスナーをクリーンアップ
    captchaOkBtn.removeEventListener('click', activeHandlers.ok);
    captchaCancelBtn.removeEventListener('click', activeHandlers.cancel);
    captchaInputEl.removeEventListener('keydown', activeHandlers.keydown);
  }

  // === モーダル表示・画像生成 ===
  async function showModal() {
    modal.classList.remove('hidden');
    captchaInputEl.value = '';
    captchaMsgEl.textContent = '';
    captchaInputEl.disabled = true;
    captchaOkBtn.disabled = true;
    imageLoadingText.style.display = 'block';
    captchaImageEl.style.display = 'none';
    captchaImageEl.src = '';
    
    currentCaptchaText = generateRandomString();

    try {
      // バックエンドAPIにリクエストを送信
      const response = await fetch('/api/generate-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentCaptchaText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'サーバーエラーが発生しました。');
      }

      const data = await response.json();
      captchaImageEl.src = `data:image/png;base64,${data.imageData}`;
      imageLoadingText.style.display = 'none';
      captchaImageEl.style.display = 'block';
      captchaInputEl.disabled = false;
      captchaOkBtn.disabled = false;
      captchaInputEl.focus();
    } catch (error) {
      console.error('CAPTCHA画像の取得に失敗しました:', error);
      captchaMsgEl.textContent = `エラー: ${error.message}`;
      locked = true;
    }
  }
  
  // === ダークモード切替 ===
  toggleDarkBtn.onclick = () => {
    darkMode = !darkMode;
    modal.classList.toggle('dark', darkMode);
    toggleDarkBtn.textContent = darkMode ? '☀️' : '🌙';
  };

  // === 認証処理 ===
  window.verifyAndGo = () => {
    if (locked) {
      alert('認証に失敗しました。ページをリロードしてください。');
      return;
    }

    const linkEl = document.getElementById('linkData');
    if (!linkEl || !linkEl.dataset.urlSuccess) {
      alert('リンク情報 (data-url-success) が見つかりません。');
      return;
    }
    const urlSuccess = linkEl.dataset.urlSuccess;

    if (!isBot) {
      location.href = urlSuccess;
      return;
    }
    
    // イベントハンドラの定義
    const onOk = () => {
      if (locked) return;
      const input = captchaInputEl.value.trim();
      if (input === '') {
        captchaMsgEl.textContent = '入力してください。';
        return;
      }
      if (input.toLowerCase() === currentCaptchaText.toLowerCase()) {
        hideModal();
        location.href = urlSuccess;
      } else {
        failedCount++;
        if (failedCount >= 3) {
          locked = true;
          captchaMsgEl.textContent = '認証失敗が3回続きました。リロードしてください。';
          captchaOkBtn.disabled = true;
          captchaInputEl.disabled = true;
        } else {
          captchaMsgEl.textContent = `認証失敗。あと${3 - failedCount}回試せます。`;
          showModal(); // 新しい画像で再チャレンジ
        }
      }
    };
    
    const onCancel = () => {
      hideModal();
      alert('認証がキャンセルされました。');
    };

    const onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onOk();
      }
    };

    // 古いハンドラを削除してから新しいハンドラを登録
    if (activeHandlers.ok) captchaOkBtn.removeEventListener('click', activeHandlers.ok);
    if (activeHandlers.cancel) captchaCancelBtn.removeEventListener('click', activeHandlers.cancel);
    if (activeHandlers.keydown) captchaInputEl.removeEventListener('keydown', activeHandlers.keydown);

    captchaOkBtn.addEventListener('click', onOk);
    captchaCancelBtn.addEventListener('click', onCancel);
    captchaInputEl.addEventListener('keydown', onKeydown);

    activeHandlers = { ok: onOk, cancel: onCancel, keydown: onKeydown };
    
    // 最初のモーダル表示
    showModal();
  };
})();
