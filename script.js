// JavaScript Document
let cardData = [];

// ★ゲームで使用する6個の選出データ・カード保持用
let currentCardData = [];
let cardsArray = [];
let flippedCards = [];
let matchedCount = 0;

// 初回クリア判定用のフラグ（初回のみ結果画面を自動表示するため）
let hasClearedOnce = false;

// 配列のシャッフル
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ボード初期化（全データから重複なしで6個選出）
async function createBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';
	
  try {
    // ★cards.json からデータを取得する
    const response = await fetch('cards.json');
    cardData = await response.json();
  } catch (error) {
    console.error('JSONの読み込みに失敗しました:', error);
    return;
  }

// 1. データリストをシャッフルして先頭6個を抽出
  const shuffledData = shuffle([...cardData]);
  const selectCount = Math.min(6, shuffledData.length);
  currentCardData = shuffledData.slice(0, selectCount);
	
// 2. 選ばれた6個をペア（12枚）にして再度シャッフル
  cardsArray = shuffle([...currentCardData, ...currentCardData]);

  cardsArray.forEach((item, index) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.id = item.id;
    card.dataset.index = index;

// 3Dフリップ構造
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front">?</div>
        <div class="card-back">
          <img src="${item.image}" alt="">
        </div>
      </div>
    `;

	card.addEventListener('click', () => onCardClick(card, item));
    board.appendChild(card);
  });
}

// ★カードクリック時の処理
function onCardClick(card, item) {
  // ★すでに揃っているカードをクリックした場合は、そのシーンのモーダルを開く
  if (card.classList.contains('matched')) {
    showPairModal(item);
    return;
  }

  // めくり処理中の連打防止、またはすでにめくられている1枚目のカードは無視
  if (flippedCards.length >= 2 || card.classList.contains('flipped')) {
    return;
  }

  card.classList.add('flipped');
  flippedCards.push({ element: card, data: item });

  if (flippedCards.length === 2) {
    checkMatch();
  }
}

// ★checkMatch 関数
function checkMatch() {
  const [card1, card2] = flippedCards;
  const isMatch = card1.data.id === card2.data.id;

  if (isMatch) {
    card1.element.classList.add('matched');
    card2.element.classList.add('matched');

    matchedCount++;
    const currentData = card1.data; // 揃ったペアのデータ
    flippedCards = [];

    // 拡大アニメーションの後にポップアップを表示
    setTimeout(() => {
      showPairModal(currentData);
    }, 500);

  } else {
    setTimeout(() => {
      card1.element.classList.remove('flipped');
      card2.element.classList.remove('flipped');
      flippedCards = [];
    }, 1000);
  }
}

// ★ペア揃い用モーダルの表示処理
function showPairModal(data) {
  document.getElementById('pair-img').src = data.image;
  document.getElementById('pair-context').textContent = data.ytTitle;

  // 一旦ボタン枠を空にして高さ（スペース）を事前に確保
  const container = document.getElementById('pair-yt-container');
  if (container) {
    container.innerHTML = '';
    // ボタン2つ分の固定高さを確保してレイアウト崩れ（枠がガタガタ動くの）を防ぐ
    container.style.minHeight = '95px';
  }

  document.getElementById('pair-modal').classList.add('active');

  // 1段階目：0.3秒後にYouTubeボタンが「ウォン」と出現
  setTimeout(() => {
    renderSingleYoutubeItem(data);

    // 2段階目：さらに0.4秒後（計0.7秒後）に「他の動画を探す」ボタンが「ふわーっ」と出現
    setTimeout(() => {
      renderNextSearchButton();
    }, 400);

  }, 300);
}

// ★1段階目：YouTubeボタンを挿入
function renderSingleYoutubeItem(data) {
  const container = document.getElementById('pair-yt-container');
  if (!container) return;

  const ytBtnHTML = `
    <a class="youtube-btn youtube-btn-pop" href="${data.ytUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.85rem; padding: 10px 16px; display: block; text-decoration: none;">
      ▶ このシーンのYouTube動画を見る
    </a>
  `;
  container.innerHTML = ytBtnHTML;
}

// ★2段階目：ボタンを挿入（全クリア時と途中でボタンと挙動を切り替え）
function renderNextSearchButton() {
  const container = document.getElementById('pair-yt-container');
  if (!container) return;

  // 全てのペアが揃ったか判定（現在の全ペア数と一致しているか）
  const isAllCleared = (matchedCount === currentCardData.length);

  let nextBtnHTML = '';

  if (isAllCleared) {
    // ★最後のペアが揃った場合：全クリア画面へ進むボタン
    nextBtnHTML = `
      <button class="next-search-btn next-search-btn-fade" style="background: #89b4fa; color: #1e1e2e; border: none;" onclick="closePairModal()">
        ✨ コンプリート！結果を確認する
      </button>
    `;
  } else {
    // ★途中のペアが揃った場合：ゲームを続けるボタン
    nextBtnHTML = `
      <button class="next-search-btn next-search-btn-fade" onclick="closePairModal()">
        🔍 他の動画（カード）を探す
      </button>
    `;
  }

  // YouTubeボタンの下に追記
  container.insertAdjacentHTML('beforeend', nextBtnHTML);
}

// ★ペア揃い用モーダルを閉じる処理
function closePairModal() {
  document.getElementById('pair-modal').classList.remove('active');

  // ★全員揃っていて、かつ「初回クリア時のみ」クリア画面を自動表示
  if (matchedCount === currentCardData.length && !hasClearedOnce) {
    hasClearedOnce = true; // 初回クリアフラグを立てる（以降は自動発火しない）
    setTimeout(showClearModal, 300);
  }
}

// ★全クリア時のモーダル表示＆リスト・セリフ描画処理
function showClearModal() {
  if (!currentCardData || currentCardData.length === 0) return;

  // 1. 今回の6個のデータから1つランダム選出
  const randomData = currentCardData[Math.floor(Math.random() * currentCardData.length)];

  // 2. セリフを描画
  renderClearQuote(randomData);

  // 3. 動画リストを描画（選ばれたセリフの動画情報も渡す）
  renderYoutubeList(randomData);

  document.getElementById('modal').classList.add('active');
}

// ★セリフの描画処理
function renderClearQuote(selectedData) {
  const speakerEl = document.getElementById('clear-quote-speaker');
  const textEl = document.getElementById('clear-quote-text');

  if (speakerEl) speakerEl.textContent = `💬 ${selectedData.speaker} より`;
  if (textEl) textEl.textContent = selectedData.quote;
}

// ★全クリア画面に登場した動画リスト（重複除外＆セリフ動画を先頭表示）を生成
function renderYoutubeList(selectedData) {
  const container = document.getElementById('yt-list-container');
  if (!container) return;
  container.innerHTML = '';

  const uniqueVideos = [];
  const map = new Map();

  // ① まずセリフに選ばれた動画を一番先頭（1番目）に追加
  if (selectedData) {
    uniqueVideos.push(selectedData);
    map.set(selectedData.ytUrl, true);
  }

  // ② 残りの登場動画を重複しないよう順番に追加
  currentCardData.forEach(item => {
    if (!map.has(item.ytUrl)) {
      map.set(item.ytUrl, true);
      uniqueVideos.push(item);
    }
  });

  // ③ リストを描画
  uniqueVideos.forEach(item => {
    const div = document.createElement('div');
    
    // 先頭（＝セリフの動画）かどうか判定
    const isQuoteSource = selectedData && item.ytUrl === selectedData.ytUrl;

    div.className = `yt-text-item ${isQuoteSource ? 'quote-source-item' : ''}`;

    div.innerHTML = `
      ${isQuoteSource ? '<span class="quote-source-badge">セリフの引用元</span>' : ''}
      <div class="yt-text-title">${item.ytTitle}</div>
      <a class="yt-text-btn" href="${item.ytUrl}" target="_blank" rel="noopener noreferrer">
        ▶ 見る
      </a>
    `;
    container.appendChild(div);
  });
}

// モーダルを閉じる処理
function closeModal() {
  document.getElementById('modal').classList.remove('active');
  // ★is-hidden クラスを外してボタンを表示させる
  const resultBtn = document.getElementById('show-result-btn');
  if (resultBtn) {
    resultBtn.classList.remove('is-hidden');
  }
}

// 暗い背景部分をクリックした時もモーダルを閉じる処理（全クリア画面のみ適用）
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    // #modal（全クリア画面）の背景タップ時のみ閉じ、#pair-modal は何もしない
    if (e.target === overlay && overlay.id === 'modal') {
      overlay.classList.remove('active');
    }
  });
});

createBoard(); // ゲーム開始