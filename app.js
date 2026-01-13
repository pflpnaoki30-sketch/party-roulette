/**
 * 🎡 ルーレットアプリ
 * Vanilla JavaScriptによるルーレット実装
 */

'use strict';

// ============================================
// DOM要素の参照
// ============================================

const wheelCanvas = document.getElementById('wheelCanvas');
const ctx = wheelCanvas.getContext('2d');
const itemInput = document.getElementById('itemInput');
const addButton = document.getElementById('addButton');
const itemList = document.getElementById('itemList');
const spinButton = document.getElementById('spinButton');
const itemCount = document.getElementById('itemCount');

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

// ============================================
// アプリケーション状態
// ============================================

let items = [
    { id: generateId(), name: 'ランチ A', color: COLORS[0] },
    { id: generateId(), name: 'ランチ B', color: COLORS[1] },
    { id: generateId(), name: 'ランチ C', color: COLORS[2] },
    { id: generateId(), name: 'ランチ D', color: COLORS[3] },
];

let currentRotation = 0;
let isSpinning = false;
let canvasWidth = 0;
let canvasHeight = 0;

// ============================================
// ユーティリティ関数
// ============================================

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * 入力文字列をサニタイズ（XSS対策）
 */
function sanitizeInput(str) {
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

// ============================================
// Canvas描画
// ============================================

function resizeCanvas() {
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
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const padding = 8;
    const radius = Math.min(centerX, centerY) - padding;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (items.length === 0) {
        drawPlaceholder(centerX, centerY, radius);
        return;
    }

    const sliceAngle = (Math.PI * 2) / items.length;

    items.forEach((item, index) => {
        const startAngle = index * sliceAngle + currentRotation - Math.PI / 2;
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
    const textRadius = radius * 0.65;

    ctx.translate(centerX, centerY);
    ctx.rotate(textAngle);

    const fontSize = Math.max(10, Math.min(14, radius * 0.1));
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px "Zen Maru Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const displayText = text.length > 8 ? text.substring(0, 7) + '…' : text;
    ctx.fillText(displayText, textRadius, 0);

    ctx.restore();
}

function drawCenterCircle(centerX, centerY, radius) {
    const outerRadius = Math.max(15, radius * 0.12);
    const innerRadius = Math.max(10, radius * 0.08);

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
}

function drawPlaceholder(centerX, centerY, radius) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#F3F4F6';
    ctx.fill();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    const fontSize = Math.max(10, Math.min(14, radius * 0.1));
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `500 ${fontSize}px "Zen Maru Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('選択肢を', centerX, centerY - 10);
    ctx.fillText('追加してください', centerX, centerY + 10);

    drawCenterCircle(centerX, centerY, radius);
}

// ============================================
// リスト表示
// ============================================

function renderItemList() {
    itemCount.textContent = items.length;
    itemList.innerHTML = '';

    if (items.length === 0) {
        const placeholder = document.createElement('li');
        placeholder.className = 'item-placeholder';
        placeholder.innerHTML = `
            <span class="placeholder-icon">💡</span>
            <span class="placeholder-text">選択肢を追加してください</span>
        `;
        itemList.appendChild(placeholder);
        return;
    }

    items.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'item-entry';
        li.innerHTML = `
            <div class="item-name">
                <span class="item-color" style="background-color: ${item.color};"></span>
                <span>${sanitizeInput(item.name)}</span>
            </div>
            <button class="delete-button" data-id="${item.id}" type="button" title="削除">✕</button>
        `;
        itemList.appendChild(li);
    });
}

// ============================================
// トースト通知
// ============================================

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============================================
// イベントハンドラ
// ============================================

function handleAddItem() {
    const name = itemInput.value.trim();

    if (!name) {
        itemInput.focus();
        return;
    }

    if (items.length >= MAX_ITEMS) {
        showToast(`選択肢は最大${MAX_ITEMS}個までです`);
        return;
    }

    const colorIndex = items.length % COLORS.length;
    items.push({
        id: generateId(),
        name: name,
        color: COLORS[colorIndex],
    });

    itemInput.value = '';
    itemInput.focus();

    renderItemList();
    drawWheel();
}

function handleDeleteItem(id) {
    items = items.filter(item => item.id !== id);

    items.forEach((item, index) => {
        item.color = COLORS[index % COLORS.length];
    });

    renderItemList();
    drawWheel();
}

function handleSpin() {
    if (isSpinning) return;

    if (items.length < 2) {
        showToast('2つ以上の選択肢を追加してください');
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    spinButton.style.opacity = '0.6';

    const rotations = MIN_ROTATIONS + Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS);
    const targetRotation = currentRotation + rotations * Math.PI * 2;

    const startTime = performance.now();
    const startRotation = currentRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        const easedProgress = easeOutCubic(progress);

        currentRotation = startRotation + (targetRotation - startRotation) * easedProgress;
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

    const normalizedRotation = currentRotation % (Math.PI * 2);
    const sliceAngle = (Math.PI * 2) / items.length;

    let pointerAngle = (-Math.PI / 2) - normalizedRotation;
    while (pointerAngle < 0) pointerAngle += Math.PI * 2;
    while (pointerAngle >= Math.PI * 2) pointerAngle -= Math.PI * 2;

    const winningIndex = Math.floor(pointerAngle / sliceAngle);
    const winner = items[winningIndex];

    setTimeout(() => {
        fireConfetti();
        showResultModal(winner.name);
    }, 200);
}

// ============================================
// 紙吹雪エフェクト
// ============================================

function fireConfetti() {
    if (typeof confetti !== 'function') return;

    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: COLORS,
    });

    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: COLORS,
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: COLORS,
        });
    }, 150);
}

// ============================================
// 結果モーダル
// ============================================

function showResultModal(winnerName) {
    const modal = document.createElement('div');
    modal.className = 'result-modal';
    modal.innerHTML = `
        <div class="result-content">
            <div class="result-emoji">🎉</div>
            <div class="result-label">結果</div>
            <div class="result-winner">${sanitizeInput(winnerName)}</div>
            <button class="result-close" type="button">OK</button>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    modal.querySelector('.result-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// ============================================
// イベントリスナー
// ============================================

function setupEventListeners() {
    addButton.addEventListener('click', handleAddItem);

    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddItem();
    });

    itemList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-button');
        if (deleteBtn) handleDeleteItem(deleteBtn.dataset.id);
    });

    spinButton.addEventListener('click', handleSpin);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });
}

// ============================================
// 初期化
// ============================================

function init() {
    setupEventListeners();
    resizeCanvas();
    renderItemList();
}

document.addEventListener('DOMContentLoaded', init);
