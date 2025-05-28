"use strict";

const PRIZES = [
    { id: 1, name: '体验券', prob: 78.0, desc: '免费体验台球1小时' },
    { id: 2, name: '店长特训', prob: 18.0, desc: '店长一对一指导1小时', dailyLimit: 2 },
    { id: 3, name: '周会员', prob: 3.9,  desc: '一周会员资格', weeklyLimit: 1 },
    { id: 4, name: '专属球杆', prob: 0.1, desc: '定制台球杆一支', monthlyLimit: 1 }
];

const config = {
    baseSpeed: 80,
    deceleration: 55,
    moveOrder: [0,1,2,4,7,6,5,3],
    prizeMap: { 
        1:1, 2:4, 3:6, 4:3
    },
    safeIndexes: new Set([1,3,5,7])
};

class Lottery {
    constructor(element) {
        this.$element = $(element);
        this.$items = this.$element.find('.lot-item').not('#startBtn');
        this.$button = $('#startBtn');
        this.historyLimit = 50;
        this.usedCards = new Set();
        this.currentCard = null;
        this.audioPool = [];
        this.initStorage();
        this.initAudio();
        this.init();
        this.bindEvents();
    }

    initStorage() {
        try {
            this.history = JSON.parse(localStorage.getItem('lotteryHistory') || '[]');
            const savedCards = JSON.parse(localStorage.getItem('usedCards') || '[]');
            this.usedCards = new Set(savedCards);
            this.updateHistoryDisplay();
        } catch(e) {
            console.error('本地存储读取失败:', e);
            this.history = [];
            this.usedCards = new Set();
        }
    }

    initAudio() {
        for(let i = 0; i < 5; i++) {
            const clickAudio = new Audio('./click.mp3');
            this.audioPool.push(clickAudio);
        }
        this.winAudio = new Audio('./win.mp3');
        
        // 添加新的音频对象
        this.buttonClickAudio = new Audio('./button-click.mp3');
        this.copySoundAudio = new Audio('./copy-sound.mp3');
    }

    init() {
        this.isDrawing = false;
        this.currentIndex = 0;
        this.audioIndex = 0;
    }

    updateHistoryDisplay() {
        const $list = $('.history-list').empty();
        this.history.slice(-5).reverse().forEach(record => {
            $list.append(`
                <div class="history-item">
                    <span>${record.card} - ${record.name}</span>
                    <button class="copy-btn">📋</button>
                </div>
            `);
        });
    }

    bindEvents() {
        const playClick = () => !this.isDrawing && this.playSound('click');
        
        $(document).on('click', [
            '.lot-item',
            '#startBtn',
            '.confirm-card',
            '.clear-history',
            '.copy-btn',
            '.prize-item',
            '.action-btn'
        ].join(','), playClick);

        // 为开始抽奖按钮添加声音反馈
        this.$button.on('click', () => {
            this.playSound('button');
            this.showCardModal();
        });
        
        // 为复制按钮添加声音反馈
        $(document).on('click', '.copy-btn', (e) => {
            const text = $(e.target).prev().text().split(' - ')[0];
            navigator.clipboard.writeText(text);
            window.showAlert('卡密已复制');
            this.playSound('copy');
        });

        $('.clear-history').on('click', () => {
            this.history = [];
            localStorage.removeItem('lotteryHistory');
            this.updateHistoryDisplay();
            window.showAlert('记录已清空');
        });

        $(document).on('click', '.prize-item', (e) => {
            const prizeId = $(e.currentTarget).data('prize');
            const prize = PRIZES.find(p => p.id == prizeId);
            prize && window.showAlert(`奖项说明：${prize.desc}`);
        });
    }

    checkPrizeLimit(prize) {
        const now = new Date();
        const history = this.history.filter(r => r.id === prize.id);
        
        switch(prize.id) {
            case 2: 
                return history.filter(r => 
                    new Date(r.timestamp).toDateString() === now.toDateString()
                ).length < prize.dailyLimit;
            case 3:
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                return history.filter(r => 
                    new Date(r.timestamp) >= weekStart
                ).length < prize.weeklyLimit;
            case 4:
                return history.filter(r => 
                    new Date(r.timestamp).getMonth() === now.getMonth()
                ).length < prize.monthlyLimit;
            default: 
                return true;
        }
    }

    async getPrize() {
        return new Promise(resolve => {
            const random = Math.random() * 100;
            let accum = 0;
            
            for (const p of PRIZES) {
                accum += p.prob;
                if (random <= accum) {
                    this.checkPrizeLimit(p) ? resolve(p) : resolve(PRIZES[0]);
                    return;
                }
            }
            resolve(PRIZES[0]);
        });
    }

    runAnimation(targetIndex) {
        return new Promise(resolve => {
            const targetStep = config.moveOrder.indexOf(targetIndex);
            if (targetStep === -1) return resolve();

            let currentStep = 0;
            let speed = config.baseSpeed;
            const randomCycles = Math.floor(Math.random() * 3) + 3;
            const totalSteps = (config.moveOrder.length * randomCycles) + targetStep;
            let decelerationStart = totalSteps - Math.floor(config.moveOrder.length * 0.8);

            const animate = () => {
                if (currentStep >= totalSteps) {
                    clearInterval(this.timer);
                    this.$items.removeClass('active');
                    this.$items.eq(targetIndex).addClass('active');
                    this.isDrawing = false;
                    resolve();
                    return;
                }

                const realPos = config.moveOrder[currentStep % config.moveOrder.length];
                this.$items.removeClass('active');
                this.$items.eq(realPos).addClass('active');
                
                currentStep++;

                if (currentStep >= decelerationStart) {
                    const remaining = totalSteps - currentStep;
                    speed += config.deceleration * (remaining / config.moveOrder.length);
                    speed = Math.min(Math.max(speed, 90), 180);

                    clearInterval(this.timer);
                    this.timer = setInterval(animate, speed);
                }
            };

            this.timer = setInterval(animate, speed);
        });
    }

    showCardModal() {
        if(this.isDrawing) return;
        
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3 style="margin-bottom:15px;text-align:center">请输入卡密</h3>
                        <input type="text" class="card-input" placeholder="输入卡密开始抽奖" maxlength="18">
                        <div style="margin-top:20px;text-align:center">
                            <button class="confirm-card action-btn">确认抽奖</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => $(e.target).hasClass('modal-wrapper') && modal.remove());

        modal.find('.confirm-card').on('click', () => {
            const card = modal.find('.card-input').val().trim().toUpperCase();
            if(this.validateCard(card)) {
                this.currentCard = card;
                modal.remove();
                this.playSound('button'); // 添加按钮反馈声音
                this.start();
            } else {
                this.playSound('button'); // 即使验证失败也播放声音
            }
        });
    }

    validateCard(card) {
        const regex = /^\d{12}[A-Z]{6}$/;
        if(!regex.test(card)) {
            window.showAlert('卡密格式错误');
            return false;
        }
        
        const now = new Date();
        const cardDate = new Date(
            parseInt(card.slice(0,4)),
            parseInt(card.slice(4,6)) - 1,
            parseInt(card.slice(6,8)),
            parseInt(card.slice(8,10)),
            parseInt(card.slice(10,12))
        );

        if (
            cardDate.getFullYear() !== now.getFullYear() ||
            cardDate.getMonth() !== now.getMonth() ||
            cardDate.getDate() !== now.getDate()
        ) {
            window.showAlert('卡密已过期');
            return false;
        }

        const timeDiff = now - cardDate;
        if (timeDiff < 0 || timeDiff > 300000) {
            window.showAlert('卡密已失效');
            return false;
        }
        if(this.usedCards.has(card)) {
            window.showAlert('卡密已使用');
            return false;
        }
        
        this.usedCards.add(card);
        localStorage.setItem('usedCards', JSON.stringify([...this.usedCards]));
        return true;
    }

    async start() {
        if(this.isDrawing) return;
        this.isDrawing = true;
        this.$button.addClass('disabled');

        try {
            const prize = await this.getPrize();
            const targetIndex = config.prizeMap[prize.id];
            await this.runAnimation(targetIndex);
            this.showResult(prize);
            this.recordHistory(prize);
        } catch(e) {
            console.error('抽奖出错:', e);
        } finally {
            this.isDrawing = false;
            this.$button.removeClass('disabled');
        }
    }

    playSound(type) {
        let audio;
        
        switch(type) {
            case 'click':
                audio = this.audioPool[(this.audioIndex++ % this.audioPool.length)];
                break;
            case 'win':
                audio = this.winAudio;
                break;
            case 'button':
                audio = this.buttonClickAudio;
                break;
            case 'copy':
                audio = this.copySoundAudio;
                break;
            default:
                audio = this.audioPool[0];
        }
        
        audio.currentTime = 0;
        audio.play().catch(e => console.log(`${type}音效播放失败:`, e));
    }

    showResult(prize) {
        this.playSound('win');
        const $modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="result-body" style="padding:25px;text-align:center">
                        <h2 style="margin:0 0 15px;font-size:24px">🎉 恭喜中奖！</h2>
                        <div style="padding:15px;background:rgba(255,255,255,0.1);border-radius:8px">
                            <p style="font-size:18px;margin:10px 0"><strong>${prize.name}</strong></p>
                            <p style="color:#ccc;margin:0">${prize.desc}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        $modal.on('click', e => $(e.target).hasClass('modal-wrapper') && $modal.remove());
    }

    recordHistory(prize) {
        try {
            this.history = [...this.history.slice(-this.historyLimit), { 
                card: this.currentCard,
                name: prize.name,
                id: prize.id,
                timestamp: Date.now()
            }];
            localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
            this.updateHistoryDisplay();
        } catch(e) { console.error('历史记录保存失败:', e) }
    }
}

$.fn.lottery = function() {
    return this.each(function() {
        if (!$.data(this, 'lottery')) {
            $.data(this, 'lottery', new Lottery(this));
        }
    });
};

$(function() {
    $('.lot-grid').lottery();

    window.showCardInfo = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="card-info-text">
                            <p>此活动只针对站长好友开放</p>
                            <p>需赞赏后获取卡密：中奖率100%</p>
                        </div>
                        <div class="wechat-row">
                            <span>复制站长微信</span>
                            <button class="copy-btn purple-btn">📋 复制</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => $(e.target).hasClass('modal-wrapper') && modal.remove());
        modal.find('.copy-btn').on('click', e => {
            navigator.clipboard.writeText('LIVE-CS2025')
                .then(() => {
                    window.showAlert('微信号已复制');
                    // 获取 lottery 实例并播放复制声音
                    const lottery = $('.lot-grid').data('lottery');
                    if (lottery) lottery.playSound('copy');
                })
                .catch(e => console.error('复制失败:', e));
        });
    };

    window.showQRCode = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="qrcode-body">
                        <h3>赞赏支持</h3>
                        <img src="qrcode.jpg" alt="赞赏二维码" style="max-width:100%">
                        <p>扫码赞赏后联系站长核验</p>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => $(e.target).hasClass('modal-wrapper') && modal.remove());
    };

    function loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('lotteryHistory') || '[]');
            $('.history-list').empty();
            history.slice(-10).reverse().forEach(record => {
                $('.history-list').append(`
                    <div class="history-item">
                        <span>${record.card} - ${record.name}</span>
                        <button class="copy-btn">📋</button>
                    </div>
                `);
            });
        } catch(e) {
            console.error('记录加载失败:', e);
        }
    }
    loadHistory();

    window.showAlert = function(msg) {
        const $alert = $('<div class="alert-message">'+msg+'</div>');
        $('#alert-container').append($alert);
        setTimeout(() => {
            $alert.fadeOut(300, function() { $(this).remove() });
        }, 2000);
    };
});
