const items = document.querySelectorAll('.lot-item:not(.center)');
const startBtn = document.getElementById('startBtn');
const resultDiv = document.getElementById('result');
let isRunning = false;
let currentIndex = 0;
let timer = null;

// 顺时针移动顺序 [0-7]
const moveOrder = [0, 1, 2, 4, 7, 6, 5, 3];
const prizeMap = {
    1: '体验券',
    2: '店长特训',
    3: '周会员',
    4: '专属球杆'
};

function highlightItem(index) {
    items.forEach(item => item.classList.remove('active'));
    items[moveOrder[index]].classList.add('active');
}

function startAnimation(targetIndex) {
    let steps = 0;
    let speed = 50;
    const totalSteps = 24 + targetIndex;

    function move() {
        if (steps >= totalSteps) {
            clearInterval(timer);
            isRunning = false;
            const prizeId = items[moveOrder[currentIndex]]?.getAttribute('data-prize');
            const prizeName = prizeMap[prizeId] || '幸运格';
            resultDiv.textContent = `恭喜中奖：${prizeName}`;
            resultDiv.style.display = 'block';
            setTimeout(() => resultDiv.style.display = 'none', 2000);
            
            // 添加到历史记录
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span>${new Date().toLocaleString()}</span>
                <span>${prizeName}</span>
            `;
            document.querySelector('.history-list').prepend(historyItem);
            return;
        }

        highlightItem(currentIndex);
        currentIndex = (currentIndex + 1) % moveOrder.length;
        steps++;

        if (steps > totalSteps - 8) {
            speed += 50;
            clearInterval(timer);
            timer = setInterval(move, speed);
        }
    }

    timer = setInterval(move, speed);
}

startBtn.addEventListener('click', () => {
    if (isRunning) return;
    
    isRunning = true;
    resultDiv.textContent = '';
    const randomPrize = Math.floor(Math.random() * moveOrder.length);
    startAnimation(randomPrize);
});

// 清空历史记录
document.querySelector('.clear-history').addEventListener('click', () => {
    document.querySelector('.history-list').innerHTML = '';
});

// 原有模态框功能
function showCardInfo() {
    // 保持原有卡密逻辑
    alert('卡密功能暂未开放');
}

function showQRCode() {
    // 保持原有赞赏逻辑
    alert('赞赏功能暂未开放');
}
