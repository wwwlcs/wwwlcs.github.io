const PRIZE_CONFIG = {
    1: { name: '体验券', prob: 80, desc: '免费体验台球1小时' },
    2: { name: '店长特训', prob: 15, desc: '一对一指导1小时' },
    3: { name: '周会员', prob: 4.9, desc: '一周会员资格' },
    4: { name: '专属球杆', prob: 0.1, desc: '定制球杆' }
};

const ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
let isRunning = false;
let currentStep = 0;
let speed = 80;
let historyData = [];

$(function() {
    initHistory();
    bindEvents();
});

function initHistory() {
    try {
        historyData = JSON.parse(localStorage.getItem('lotteryHistory') || '[]');
        updateHistoryDisplay();
    } catch(e) {
        console.error('历史记录加载失败:', e);
    }
}

function bindEvents() {
    $('#startBtn').click(startLottery);
    $('.clear-history').click(clearHistory);
    $('#cardBtn').click(showCardModal);
    $('#donateBtn').click(showDonateModal);
}

function startLottery() {
    if(isRunning) return;
    isRunning = true;
    
    const targetPrize = calculatePrize();
    runAnimation(targetPrize.id);
}

function calculatePrize() {
    const rand = Math.random() * 100;
    let sum = 0;
    for(const [id, config] of Object.entries(PRIZE_CONFIG)) {
        sum += config.prob;
        if(rand <= sum) return { id: parseInt(id), ...config };
    }
    return PRIZE_CONFIG[1];
}

function runAnimation(targetId) {
    const targetIndex = ORDER.indexOf(targetId - 1);
    let steps = 0;
    currentStep = 0;
    speed = 80;

    function animate() {
        $('.lot-item').removeClass('active');
        const currentPos = ORDER[currentStep % 8];
        $(`.lot-item:eq(${currentPos})`).addClass('active');

        if(steps++ < 24 + targetIndex) {
            currentStep++;
            speed = Math.min(speed + 3, 150);
            setTimeout(animate, speed);
        } else {
            finishAnimation(targetId);
        }
    }
    animate();
}

function finishAnimation(targetId) {
    isRunning = false;
    const prize = PRIZE_CONFIG[targetId];
    showAlert(`恭喜获得：${prize.name}`);
    saveToHistory(prize);
    showResultModal(prize);
}

function showResultModal(prize) {
    const modal = $(`
        <div class="modal-wrapper">
            <div class="modal-content">
                <div class="modal-body">
                    <h2>🎉 中奖结果</h2>
                    <div class="prize-item" style="margin:20px 0;padding:15px">
                        <h3 style="color:var(--prize-color)">${prize.name}</h3>
                        <p style="margin-top:10px">${prize.desc}</p>
                    </div>
                    <button class="action-btn close-modal">确定</button>
                </div>
            </div>
        </div>
    `).appendTo('body');
    
    modal.on('click', '.close-modal', () => modal.remove());
}

function showCardModal() {
    const modal = $(`
        <div class="modal-wrapper">
            <div class="modal-content">
                <div class="modal-body">
                    <h3>卡密验证</h3>
                    <input class="card-input" placeholder="输入16位卡密">
                    <button class="action-btn confirm-btn">验证</button>
                    <p style="margin-top:15px;color:#888">
                        <small>请通过赞赏获取有效卡密</small>
                    </p>
                </div>
            </div>
        </div>
    `).appendTo('body');

    modal.on('click', '.confirm-btn', () => {
        const card = $('.card-input').val().trim();
        if(/^[A-Z0-9]{16}$/.test(card)) {
            modal.remove();
            showAlert('卡密验证成功，可开始抽奖');
        } else {
            showAlert('卡密格式错误');
        }
    });
}

function showDonateModal() {
    $(`
        <div class="modal-wrapper">
            <div class="modal-content">
                <div class="qrcode-body">
                    <h3>赞赏支持</h3>
                    <img src="qrcode.jpg" alt="赞赏码">
                    <p style="margin-top:15px">扫码后联系站长领取卡密</p>
                </div>
            </div>
        </div>
    `).appendTo('body').click(e => {
        if($(e.target).hasClass('modal-wrapper')) $(e.target).remove();
    });
}

function saveToHistory(prize) {
    historyData.push({
        name: prize.name,
        time: new Date().toLocaleString()
    });
    localStorage.setItem('lotteryHistory', JSON.stringify(historyData.slice(-50)));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    $('.history-list').html(historyData.slice(-5).reverse().map(item => 
        `<div class="history-item">
            <span>${item.name}</span>
            <span>${item.time}</span>
        </div>`
    ).join(''));
}

function clearHistory() {
    historyData = [];
    localStorage.removeItem('lotteryHistory');
    updateHistoryDisplay();
    showAlert('历史记录已清空');
}

function showAlert(msg) {
    $('.alert-message').text(msg).stop(true).show().delay(2000).fadeOut();
}
