(() => {
  // === 動的CSS追加 ===
  const style = document.createElement('style');
  style.textContent = `
    .myCaptchaModal {
      position: fixed;
      top:0; left:0; width:100vw; height:100vh;
      background: rgba(0,0,0,0.5);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
    }
    .myCaptchaModal.hidden {
      display: none;
    }
    .myCaptchaModal .modalContent {
      background: #fff;
      padding: 20px 30px;
      border-radius: 8px;
      width: 320px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      font-family: sans-serif;
      text-align: center;
      color: #000;
      transition: background-color 0.3s, color 0.3s;
    }
    .myCaptchaModal p {
      margin: 0 0 12px;
      font-size: 16px;
      white-space: pre-line;
    }
    .myCaptchaModal input[type="text"] {
      width: 100%;
      padding: 8px;
      font-size: 16px;
      margin-bottom: 12px;
      box-sizing: border-box;
      border: 1px solid #888;
      border-radius: 4px;
      transition: background-color 0.3s, color 0.3s, border-color 0.3s;
      color: #000;
      background: #fff;
    }
    .myCaptchaModal button {
      padding: 8px 16px;
      font-size: 15px;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #888;
      background: #eee;
      transition: background-color 0.2s, color 0.2s;
      color: #000;
    }
    .myCaptchaModal button:hover {
      background: #ddd;
    }
    .myCaptchaModal #captchaMessage {
      color: red;
      min-height: 18px;
      font-weight: bold;
      margin-top: 6px;
    }
    /* ボタン配置調整 */
    #buttonGroup {
      display: flex;
      justify-content: center;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    /* ダークモード */
    .myCaptchaModal.dark {
      background: rgba(30,30,30,0.85);
    }
    .myCaptchaModal.dark .modalContent {
      background: #222;
      color: #eee;
    }
    .myCaptchaModal.dark input[type="text"],
    .myCaptchaModal.dark button {
      background: #444;
      color: #eee;
      border-color: #666;
    }
    .myCaptchaModal.dark button:hover {
      background: #555;
    }
    /* ダークモード切替ボタン */
    #toggleDarkMode {
      font-size: 20px;
      padding: 4px 12px;
      user-select: none;
      outline: none;
    }
  `;
  document.head.appendChild(style);

  // === 動的モーダルDOM作成 ===
  const modal = document.createElement('div');
  modal.className = 'myCaptchaModal hidden';
  modal.innerHTML = `
    <div class="modalContent">
      <p id="captchaText"></p>
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
  const captchaTextEl = modal.querySelector('#captchaText');
  const captchaInputEl = modal.querySelector('#captchaInput');
  const captchaOkBtn = modal.querySelector('#captchaOk');
  const captchaCancelBtn = modal.querySelector('#captchaCancel');
  const captchaMsgEl = modal.querySelector('#captchaMessage');
  const toggleDarkBtn = modal.querySelector('#toggleDarkMode');

  // === 変数 ===
  const CHECK_DURATION_MS = 2000;
  const BOT_SCORE_THRESHOLD = 1;
  let mouseMoveCount = 0;
  let scrollCount = 0;
  let focusChanges = 0;
  let startTime = Date.now();
  let isBot = true;
  let failedCount = 0;
  let locked = false;
  let darkMode = false;

  // === ランダム文字列生成 ===
  function generateRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

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

  // === モーダル表示・非表示 ===
  function showModal(captcha) {
    captchaTextEl.textContent = `次の文字を正確に入力してください:\n${captcha}`;
    captchaInputEl.value = '';
    captchaMsgEl.textContent = '';
    modal.classList.remove('hidden');
    captchaInputEl.focus();
  }
  function hideModal() {
    modal.classList.add('hidden');
  }

  // === ダークモード切替 ===
  toggleDarkBtn.onclick = () => {
    darkMode = !darkMode;
    if (darkMode) {
      modal.classList.add('dark');
      toggleDarkBtn.textContent = '☀️';
    } else {
      modal.classList.remove('dark');
      toggleDarkBtn.textContent = '🌙';
    }
  };

  // === 認証処理 ===
  window.verifyAndGo = () => {
    if (locked) {
      alert('認証に3回失敗しました。ページをリロードしてください。');
      return;
    }

    const linkEl = document.getElementById('linkData');
    if (!linkEl) {
      alert('リンク情報が見つかりません。');
      return;
    }
    const urlSuccess = linkEl.dataset.urlSuccess;
    if (!urlSuccess) {
      alert('遷移先URLが指定されていません。');
      return;
    }

    if (!isBot) {
      location.href = urlSuccess;
      return;
    }

    const captcha = generateRandomString();
    showModal(captcha);

    function onOk() {
      if (locked) return;
      const input = captchaInputEl.value.trim();
      if (input === '') {
        captchaMsgEl.textContent = '入力してください。';
        return;
      }
      if (input === captcha) {
        hideModal();
        location.href = urlSuccess;
      } else {
        failedCount++;
        if (failedCount >= 3) {
          locked = true;
          captchaMsgEl.textContent = '認証失敗が3回続きました。リロードしてください。';
          captchaOkBtn.disabled = true;
          captchaInputEl.disabled = true;
          return;
        }
        captchaMsgEl.textContent = `認証失敗。あと${3 - failedCount}回試せます。`;
        captchaInputEl.value = '';
        captchaInputEl.focus();
      }
    }

    function onCancel() {
      hideModal();
      alert('認証がキャンセルされました。');
    }

    captchaOkBtn.onclick = onOk;
    captchaCancelBtn.onclick = onCancel;
    captchaInputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onOk();
      }
    };
  };
})();
