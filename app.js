/**
 * 🎡 ルーレットアプリ
 * Verified Final Version
 */

'use strict';

// ============================================
// 定数・設定
// ============================================

const COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6',
    '#FB923C', '#34D399', '#60A5FA', '#F87171', '#2DD4BF',
];

const SPIN_DURATION = 5000;
const MIN_ROTATIONS = 5;
const MAX_ROTATIONS = 8;
const MAX_ITEMS = 12;
const STORAGE_KEY = 'rouletteItems';

// 初期メンバー（8名）
const DEFAULT_NAMES = [
    "山田さん", "松田さん", "泉くん", "野原くん",
    "青木くん", "大島さん", "篠原さん", "安納さん"
];

// ============================================
// アプリケーション状態 (グローバル)
// ============================================

let items = [];
let currentRotation = 0;
let isSpinning = false;
let canvasWidth = 0;
let canvasHeight = 0;

// DOM要素
let wheelCanvas, ctx, itemInput, addButton, itemList, spinButton, itemCount, resetButton;

// ============================================
// ユーティリティ関数
// ============================================

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function sanitizeInput(str) {
    const escapeMap = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

// ============================================
// データ管理 (LocalStorage)
// ============================================

function createDefaultItems() {
    return DEFAULT_NAMES.map((name, index) => ({
        id: generateId(),
        name: name,
        color: COLORS[index % COLORS.length],
    }));
}

function saveItems() {
    try {
        const data = items.map(item => ({ name: item.name, color: item.color }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function loadItems() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (Array.isArray(data) && data.length > 0) {
                // 保存データがある場合、IDを再生成して読み込み
                return data.map((item, index) => ({
                    id: generateId(),
                    name: item.name,
                    color: item.color || COLORS[index % COLORS.length],
                }));
            }
        }
    } catch (e) {
        console.error('Load failed:', e);
    }
    // データがない場合は初期値を使用
    return createDefaultItems();
}

function resetItems() {
    // LocalStorageをクリア
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* Ignore */ }

    // 初期メンバーに戻す
    items = createDefaultItems();
    renderItemList();
    drawWheel();
    showToast('初期メンバーに戻しました');
}

// ============================================
// Canvas描画
// ============================================

function resizeCanvas() {
    if (!wheelCanvas) return;

    const rect = wheelCanvas.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    const dpr = window.devicePixelRatio || 1;
    wheelCanvas.width = canvasWidth * dpr;
    wheelCanvas.height = canvasHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawWheel();
}

function drawWheel() {
    if (!ctx) return;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const padding = 10;
    const radius = Math.min(centerX, centerY) - padding;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (items.length === 0) {
        drawPlaceholder(centerX, centerY, radius);
        return;
    }

    const sliceAngle = (Math.PI * 2) / items.length;

    items.forEach((item, index) => {
        // 0度(3時)を基準に描画
        const startAngle = index * sliceAngle + currentRotation;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        drawSegmentText(item.name, centerX, centerY, radius, startAngle, sliceAngle);
    });

    drawCenterCircle(centerX, centerY, radius);
}

function drawSegmentText(text, centerX, centerY, radius, startAngle, sliceAngle) {
    ctx.save();
    const textAngle = startAngle + sliceAngle / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(textAngle);

    const textRadius = radius * 0.65;
    const fontSize = Math.max(12, Math.min(16, radius * 0.1));

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px "Zen Maru Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文字数制限
    const displayText = text.length > 8 ? text.substring(0, 7) + '…' : text;
    ctx.fillText(displayText, textRadius, 0);
    ctx.restore();
}

function drawCenterCircle(centerX, centerY, radius) {
    // 外側の白い円
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // 内側のアクセント円
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
}

function drawPlaceholder(centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#F3F4F6';
    ctx.fill();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('選択肢を追加してください', centerX, centerY);
}

// ============================================
// ロジック & アニメーション
// ============================================

function handleSpin() {
    if (isSpinning) return;
    if (items.length < 2) {
        showToast('2つ以上の選択肢が必要です');
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    spinButton.style.opacity = '0.6';

    // 回転数決定
    const rotations = MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS);
    const targetRotation = currentRotation + rotations * Math.PI * 2;

    const startTime = performance.now();
    const startRotation = currentRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        const eased = easeOutCubic(progress);

        currentRotation = startRotation + (targetRotation - startRotation) * eased;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            onSpinComplete();
        }
    }
    requestAnimationFrame(animate);
}

function onSpinComplete() {
    isSpinning = false;
    spinButton.disabled = false;
    spinButton.style.opacity = '1';

    // 結果判定ロジック (Hit Testing)
    // 針は常に上部 (270度 = 1.5 * PI) にあると仮定
    const pointerAngle = 1.5 * Math.PI;
    const segmentAngle = (2 * Math.PI) / items.length;

    // 現在の回転角度を考慮して、針の下にあるセグメントのインデックスを計算
    // pointerAngle から currentRotation を引いて、正規化する
    let relativeAngle = (pointerAngle - currentRotation) % (2 * Math.PI);
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;

    const winningIndex = Math.floor(relativeAngle / segmentAngle);
    const winner = items[winningIndex];

    // 結果表示
    setTimeout(() => {
        fireConfetti();
        showResultModal(winner ? winner.name : "エラー");
    }, 200);
}

// ============================================
// UI操作 (追加・削除・結果)
// ============================================

function renderItemList() {
    if (!itemCount || !itemList) return;

    itemCount.textContent = items.length;
    itemList.innerHTML = '';

    items.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'item-entry';
        li.innerHTML = `
            <div class="item-name">
                <span class="item-color" style="background-color: ${item.color};"></span>
                <span>${sanitizeInput(item.name)}</span>
            </div>
            <button class="delete-button" data-id="${item.id}" type="button">✕</button>
        `;
        itemList.appendChild(li);
    });
}

function handleAddItem() {
    const name = itemInput.value.trim();
    if (!name) return;
    if (items.length >= MAX_ITEMS) {
        showToast(`最大${MAX_ITEMS}個までです`);
        return;
    }

    const color = COLORS[items.length % COLORS.length];
    items.push({ id: generateId(), name: name, color: color });

    saveItems();
    itemInput.value = '';
    renderItemList();
    drawWheel();
}

function handleDeleteItem(id) {
    items = items.filter(item => item.id !== id);
    // 色を再割り当てして見た目を整える
    items.forEach((item, index) => {
        item.color = COLORS[index % COLORS.length];
    });

    saveItems();
    renderItemList();
    drawWheel();
}

function showResultModal(name) {
    // 既存モーダル削除
    const old = document.querySelector('.result-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.className = 'result-modal';
    modal.innerHTML = `
        <div class="result-content">
            <div class="result-emoji">🎉</div>
            <div class="result-label">結果</div>
            <div class="result-winner">${sanitizeInput(name)}</div>
            <button class="result-close">OK</button>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('.result-close').addEventListener('click', close);
}

function showToast(msg) {
    const div = document.createElement('div');
    div.className = 'toast show';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 300);
    }, 2500);
}

function fireConfetti() {
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
}

// ============================================
// 初期化 & イベント設定
// ============================================

function setupEventListeners() {
    // 追加ボタン
    if (addButton) addButton.addEventListener('click', handleAddItem);

    // 入力欄 (Enterキー)
    if (itemInput) {
        itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddItem();
        });
    }

    // スピンボタン
    if (spinButton) spinButton.addEventListener('click', handleSpin);

    // リセットボタン (デバッグログ付き)
    console.log('resetButton element:', resetButton);
    if (resetButton) {
        resetButton.addEventListener('click', function (e) {
            console.log('Reset button clicked!');
            e.preventDefault();
            resetItems();
        });
        console.log('Reset button event listener added.');
    } else {
        console.error('resetButton is null! Cannot add event listener.');
    }

    // リスト削除 (Event Delegation)
    if (itemList) {
        itemList.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-button');
            if (btn) handleDeleteItem(btn.dataset.id);
        });
    }

    // リサイズ
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeCanvas, 100);
    });
}

function init() {
    // DOM取得
    wheelCanvas = document.getElementById('wheelCanvas');
    ctx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
    itemInput = document.getElementById('itemInput');
    addButton = document.getElementById('addButton');
    itemList = document.getElementById('itemList');
    spinButton = document.getElementById('spinButton');
    itemCount = document.getElementById('itemCount');
    resetButton = document.getElementById('resetButton');

    // 必須要素のチェック
    if (!wheelCanvas || !itemList) {
        console.error("Critical: Canvas or ItemList not found in HTML.");
        return;
    }

    // データ読み込み
    items = loadItems();

    // イベント設定
    setupEventListeners();

    // 初回描画
    renderItemList();
    resizeCanvas();

    console.log("App initialized successfully.");
}

// アプリ起動
document.addEventListener('DOMContentLoaded', init);
