const items = document.querySelectorAll('.grid-item:not(.center)');
const startBtn = document.getElementById('startBtn');
const resultDiv = document.getElementById('result');
let isRunning = false;
let currentIndex = 0;
let timer = null;

// 定义顺时针移动顺序 [0-7]
const moveOrder = [0, 1, 2, 4, 7, 6, 5, 3];

function highlightItem(index) {
    items.forEach(item => item.classList.remove('active'));
    items[moveOrder[index]].classList.add('active');
}

function startAnimation(targetIndex) {
    let steps = 0;
    let speed = 50;
    const totalSteps = 24 + targetIndex; // 至少转3圈

    function move() {
        if (steps >= totalSteps) {
            clearInterval(timer);
            isRunning = false;
            resultDiv.textContent = `恭喜中奖：${moveOrder[currentIndex]+1}号奖品`;
            return;
        }

        highlightItem(currentIndex);
        currentIndex = (currentIndex + 1) % moveOrder.length;
        steps++;

        // 减速逻辑
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
