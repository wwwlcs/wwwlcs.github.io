// script.js
$(document).ready(function() {
    const moveOrder = [0, 1, 2, 5, 8, 7, 6, 3]; // 顺时针移动顺序
    let isRunning = false;
    let currentIndex = 0;
    let timer = null;

    // 初始化事件
    $('#startBtn').click(startLottery);
    $('.clear-history').click(clearHistory);

    function highlightItem(index) {
        $('.lot-item').removeClass('active');
        $(`.lot-item:eq(${moveOrder[index]})`).addClass('active');
    }

    function startLottery() {
        if (isRunning) return;
        
        isRunning = true;
        showAlert('抽奖进行中...');
        const targetIndex = Math.floor(Math.random() * 8);
        let steps = 0;
        let speed = 50;
        const totalSteps = 24 + targetIndex;

        function move() {
            if (steps >= totalSteps) {
                clearInterval(timer);
                isRunning = false;
                const prizeIndex = moveOrder[currentIndex];
                const prizeText = $(`.lot-item:eq(${prizeIndex})`).text();
                showAlert(`恭喜中奖：${prizeText}`);
                addHistory(prizeText);
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

    function showAlert(msg) {
        $('.alert-message').text(msg).show().delay(2000).fadeOut();
    }

    function addHistory(prize) {
        const time = new Date().toLocaleString();
        $('.history-list').prepend(
            `<div class="history-item">
                <span>${prize}</span>
                <span>${time}</span>
            </div>`
        );
    }

    function clearHistory() {
        $('.history-list').empty();
    }

    // 原有模态框函数
    window.showCardInfo = function() {
        // 保持原有卡密逻辑...
    }

    window.showQRCode = function() {
        // 保持原有赞赏逻辑...
    }
});
