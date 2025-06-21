(() => {
  const CHECK_DURATION_MS = 2000;
  const BOT_SCORE_THRESHOLD = 1;
  let mouseMoveCount = 0;
  let scrollCount = 0;
  let focusChanges = 0;
  let startTime = Date.now();
  let isBot = true;
  let cancelled = false;

  function generateRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  document.addEventListener('mousemove', () => mouseMoveCount++);
  document.addEventListener('scroll', () => scrollCount++);
  window.addEventListener('blur', () => focusChanges++);

  setTimeout(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const activityScore = (mouseMoveCount + scrollCount + focusChanges) / elapsed;
    isBot = activityScore < BOT_SCORE_THRESHOLD;
    console.log(`[BotCheck] 判定: ${isBot ? 'Botの可能性あり' : '人間'} | スコア: ${activityScore.toFixed(2)}`);
  }, CHECK_DURATION_MS);

  window.verifyAndGo = () => {
    const linkEl = document.getElementById('linkData');
    if (!linkEl) {
      alert("リンク情報がありません。");
      return;
    }
    const urlSuccess = linkEl.dataset.urlSuccess;
    if (!urlSuccess) {
      alert("遷移先URLが指定されていません。");
      return;
    }

    if (!isBot && !cancelled) {
      location.href = urlSuccess;
      return;
    }

    const tryCaptcha = () => {
      const captcha = generateRandomString();
      const input = prompt(`あなたがロボットではないことを認証するために次のことを行ってください:\n\n次の文字を正確に入力してください:\n${captcha}`);

      if (input === null) {
        cancelled = true;
        alert("認証がキャンセルされました。");
        return;
      }

      if (input.trim() === captcha) {
        cancelled = false;
        location.href = urlSuccess;
      } else {
        alert("認証失敗。もう一度試してください。");
        tryCaptcha();
      }
    };

    tryCaptcha();
  };
})();
