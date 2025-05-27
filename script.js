// script.js
document.addEventListener('DOMContentLoaded', () => {
    // 元素选择器优化
    const items = document.querySelectorAll('.lot-item:not(.center)');
    const startBtn = document.getElementById('startBtn');
    const resultDiv = document.getElementById('result');
    const historyList = document.querySelector('.history-list');
    
    // 配置参数
    const config = {
        baseSpeed: 50,
        totalCycles: 3,
        acceleration: 50,
        prizeMap: {
            1: '体验券',
            2: '店长特训',
            3: '周会员',
            4: '专属球杆'
        },
        // 顺时针移动顺序 [0-7] 对应周围8个格子
        moveOrder: [0, 1, 2, 4, 7, 6, 5, 3]
    };

    let isRunning = false;
    let currentIndex = 0;
    let timer = null;

    // 高亮当前格子
    function highlightItem(index) {
        items.forEach(item => item.classList.remove('active'));
        const realIndex = config.moveOrder[index];
        items[realIndex].classList.add('active');
    }

    // 核心动画逻辑
    function startAnimation(targetIndex) {
        let steps = 0;
        let speed = config.baseSpeed;
        const totalSteps = (config.moveOrder.length * config.totalCycles) + targetIndex;

        function move() {
            if (steps >= totalSteps) {
                clearInterval(timer);
                isRunning = false;
                showResult();
                return;
            }

            highlightItem(currentIndex);
            currentIndex = (currentIndex + 1) % config.moveOrder.length;
            steps++;

            // 最后阶段减速
            if (steps > totalSteps - config.moveOrder.length) {
                speed += config.acceleration;
                clearInterval(timer);
                timer = setInterval(move, speed);
            }
        }

        timer = setInterval(move, speed);
    }

    // 显示结果
    function showResult() {
        const currentItem = items[config.moveOrder[currentIndex]];
        const prizeId = currentItem.dataset.prize;
        const prizeName = prizeId ? config.prizeMap[prizeId] : '🍀 幸运格';
        
        resultDiv.textContent = `恭喜中奖：${prizeName}`;
        resultDiv.style.display = 'block';
        
        // 添加到历史记录
        if(prizeId) {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span>${new Date().toLocaleString()}</span>
                <span>${prizeName}</span>
            `;
            historyList.prepend(historyItem);
        }

        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 2000);
    }

    // 事件绑定
    startBtn.addEventListener('click', () => {
        if (isRunning) return;
        
        isRunning = true;
        resultDiv.textContent = '';
        // 生成实际奖项索引（1,3,5,7对应四个奖项）
        const prizeIndexes = [1, 3, 5, 7];
        const targetIndex = prizeIndexes[Math.floor(Math.random() * prizeIndexes.length)];
        startAnimation(targetIndex);
    });

    // 清空历史记录
    document.querySelector('.clear-history').addEventListener('click', () => {
        historyList.innerHTML = '';
    });
});

// 原有模态框功能
function showCardInfo() {
    // 卡密逻辑实现
}

function showQRCode() {
    // 赞赏逻辑实现
}
