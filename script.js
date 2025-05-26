const PRIZE_MAP = {
    1: {name: '体验券', desc: '免费体验台球1小时', prob: 80},
    2: {name: '店长特训', desc: '一对一指导1小时', prob: 15},
    3: {name: '周会员', desc: '一周会员资格', prob: 4.9},
    4: {name: '专属球杆', desc: '定制球杆', prob: 0.1}
};

const ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
let isRunning = false;
let currentStep = 0;
let speed = 80;

$(function() {
    initLottery();
    bindEvents();
});

function initLottery() {
    try {
        const history = JSON.parse(localStorage.getItem('lotHistory') || '[]');
        $('.history-list').html(history.slice(-5).map(item => 
            `<div class="history-item">
                <span>${item.name}</span>
                <span>${new Date(item.time).toLocaleString()}</span>
            </div>`
        ).join(''));
    } catch(e) {
        console.error('历史记录加载失败:', e);
    }
}

function bindEvents() {
    $('#startBtn').click(startLottery);
    $('.clear-history').click(() => {
        localStorage.removeItem('lotHistory');
        $('.history-list').empty();
        showAlert('记录已清空');
    });
    
    $('#cardBtn').click(showCardModal);
    $('#donateBtn').click(showDonateModal);
}

function startLottery() {
    if(isRunning) return;
    isRunning = true;
    
    const target = getRandomPrize();
    animateLottery(target);
}

function getRandomPrize() {
    const rand = Math.random() * 100;
    let sum = 0;
    for(const [id, prize] of Object.entries(PRIZE_MAP)) {
        sum += prize.prob;
        if(rand <= sum) return id;
    }
    return '1';
}

function animateLottery(target) {
    const targetIndex = ORDER.indexOf(parseInt(target)-1);
    let steps = 0;
    let current = 0;
    
    function move() {
        $('.lot-item').removeClass('active');
        $(`.lot-item:eq(${ORDER[current]})`).addClass('active');
        
        if(steps++ < 24 + targetIndex) {
            current = (current + 1) % 8;
            speed = Math.min(speed + 3, 150);
            setTimeout(move, speed);
        } else {
            finishLottery(target);
        }
    }
    move();
}

function finishLottery(target) {
    isRunning = false;
    speed = 80;
    const prize = PRIZE_MAP[target];
    showAlert(`恭喜获得：${prize.name}`);
    saveHistory(prize);
    showResultModal(prize);
}

function showResultModal(prize) {
    const modal = $(`
        <div class="modal-wrapper">
            <div class="modal-content">
                <div class="modal-body">
                    <h2>🎉 中奖啦！</h2>
                    <div class="prize-item" style="margin:20px 0">
                        <h3>${prize.name}</h3>
                        <p>${prize.desc}</p>
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
                    <h3>获取卡密</h3>
                    <input class="card-input" placeholder="输入赞赏获得的卡密">
                    <button class="action-btn confirm-card">确认</button>
                    <p style="margin-top:15px;color:#ccc">赞赏后联系站长获取卡密</p>
                </div>
            </div>
        </div>
    `).appendTo('body');
    
    modal.on('click', '.confirm-card', () => {
        const card = $('.card-input').val();
        if(/^[A-Z0-9]{16}$/.test(card)) {
            modal.remove();
            showAlert('卡密验证成功');
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
                    <h3>支持站长</h3>
                    <img src="qrcode.jpg" alt="赞赏码" style="width:200px">
                    <p>扫码赞赏后联系站长核验</p>
                </div>
            </div>
        </div>
    `).appendTo('body').click(e => {
        if($(e.target).hasClass('modal-wrapper')) $(e.target).remove();
    });
}

function saveHistory(prize) {
    const history = JSON.parse(localStorage.getItem('lotHistory') || []);
    history.push({
        name: prize.name,
        time: Date.now()
    });
    localStorage.setItem('lotHistory', JSON.stringify(history.slice(-50)));
    $('.history-list').prepend(
        `<div class="history-item">
            <span>${prize.name}</span>
            <span>${new Date().toLocaleTimeString()}</span>
        </div>`
    );
}

function showAlert(msg) {
    $('.alert-message').text(msg).stop(true).show().delay(2000).fadeOut();
}
