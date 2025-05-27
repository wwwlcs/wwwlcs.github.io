"use strict";

const PRIZES = [
    { id: 1, name: '体验券', prob: 78.0, desc: '免费体验台球1小时' },
    { id: 2, name: '店长特训', prob: 18.0, desc: '店长一对一指导1小时', dailyLimit: 2 },
    { id: 3, name: '周会员', prob: 3.9,  desc: '一周会员资格', weeklyLimit: 1 },
    { id: 4, name: '专属球杆', prob: 0.1, desc: '定制台球杆一支', monthlyLimit: 1 }
];

const config = {
    baseSpeed: 100,
    acceleration: 5,
    totalCycles: 4,
    moveOrder: [0, 1, 2, 5, 8, 7, 6, 3], // 顺时针移动路径
    prizeMap: { 1:1, 2:5, 3:7, 4:3 },    // 奖项对应格子索引
    safeIndexes: new Set([1, 3, 5, 7])   // 有效停止位置
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
        const playClick = () => {
            if(!this.isDrawing) this.playSound('click');
        };
        
        $(document).on('click', [
            '.lot-item',
            '#startBtn',
            '.confirm-card',
            '.clear-history',
            '.copy-btn',
            '.prize-item',
            '.action-btn'
        ].join(','), playClick);

        this.$button.on('click', () => this.showCardModal());
        
        $(document).on('click', '.copy-btn', (e) => {
            const text = $(e.target).prev().text().split(' - ')[0];
            navigator.clipboard.writeText(text);
        });

        $('.clear-history').on('click', () => {
            this.history = [];
            localStorage.removeItem('lotteryHistory');
            this.updateHistoryDisplay();
            this.showAlert('记录已清空');
        });

        $(document).on('click', '.prize-item', (e) => {
            const prizeId = $(e.currentTarget).data('prize');
            const prize = PRIZES.find(p => p.id == prizeId);
            if(prize) this.showAlert(`奖项说明：${prize.desc}`);
        });

        $('.action-btn').on({
            mouseenter: function() { $(this).css('transform', 'translateY(-2px)') },
            mouseleave: function() { $(this).css('transform', 'translateY(0)') },
            click: function(e) {
                $(e.currentTarget).css('transform', 'scale(0.95)');
                setTimeout(() => $(e.currentTarget).css('transform', 'scale(1)'), 200);
            }
        });
    }

    checkPrizeLimit(prize) {
        const now = new Date();
        const history = this.history.filter(r => r.id === prize.id);
        
        switch(prize.id) {
            case 2: {
                const todayStart = new Date(now.setHours(0,0,0,0));
                return history.filter(r => new Date(r.timestamp) >= todayStart).length < prize.dailyLimit;
            }
            case 3: {
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                return history.filter(r => new Date(r.timestamp) >= weekStart).length < prize.weeklyLimit;
            }
            case 4: {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return history.filter(r => new Date(r.timestamp) >= monthStart).length < prize.monthlyLimit;
            }
            default: return true;
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
            if(!config.safeIndexes.has(targetIndex)) {
                console.error('无效的目标位置:', targetIndex);
                return resolve();
            }

            let steps = 0;
            let speed = config.baseSpeed;
            const totalSteps = (config.moveOrder.length * config.totalCycles) + targetIndex;

            const animate = () => {
                if (steps >= totalSteps) {
                    clearInterval(this.timer);
                    this.$items.removeClass('active');
                    this.$items.eq(targetIndex).addClass('active');
                    this.isDrawing = false;
                    resolve();
                    return;
                }

                this.$items.removeClass('active');
                const realIndex = config.moveOrder[this.currentIndex % config.moveOrder.length];
                this.$items.eq(realIndex).addClass('active');
                this.currentIndex++;
                steps++;

                if (steps > totalSteps - config.moveOrder.length * 1.5) {
                    speed += config.acceleration;
                    clearInterval(this.timer);
                    this.timer = setInterval(animate, Math.max(speed, 30));
                }
            };

            this.timer = setInterval(animate, speed);
        });
    }

    showAlert(message) {
        $('<div class="alert-message">'+message+'</div>')
            .appendTo('body').delay(2000).fadeOut(300, () => $(this).remove());
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

        modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) modal.remove();
        });

        $('.confirm-card').on('click', () => {
            const card = $('.card-input').val().trim().toUpperCase();
            this.validateCard(card) && (this.currentCard = card, modal.remove(), this.start());
        });
    }

    validateCard(card) {
        const regex = /^\d{12}[A-Z]{6}$/;
        if(!regex.test(card)) return this.showAlert('卡密格式错误'), false;
        
        const timePart = card.slice(0, 12);
        const now = new Date();
        const cardDate = new Date(
            parseInt(timePart.slice(0,4)),
            parseInt(timePart.slice(4,6)) - 1,
            parseInt(timePart.slice(6,8)),
            parseInt(timePart.slice(8,10)),
            parseInt(timePart.slice(10,12))
        );

        if (
            cardDate.getFullYear() !== now.getFullYear() ||
            cardDate.getMonth() !== now.getMonth() ||
            cardDate.getDate() !== now.getDate()
        ) return this.showAlert('卡密已过期'), false;

        const timeDiff = now - cardDate;
        if (timeDiff < 0 || timeDiff > 300000) return this.showAlert('卡密已失效'), false;
        if(this.usedCards.has(card)) return this.showAlert('卡密已使用'), false;
        
        this.usedCards.add(card);
        localStorage.setItem('usedCards', JSON.stringify([...this.usedCards]));
        return true;
    }

    async start() {
        if(this.isDrawing) return;
        this.isDrawing = true;
        this.$button.addClass('disabled');

        const prize = await this.getPrize();
        const targetIndex = config.prizeMap[prize.id];
        await this.runAnimation(targetIndex);
        this.showResult(prize);
        this.recordHistory(prize);

        this.isDrawing = false;
        this.$button.removeClass('disabled');
    }

    playSound(type) {
        if(type === 'click') {
            const audio = this.audioPool[this.audioIndex];
            this.audioIndex = (this.audioIndex + 1) % this.audioPool.length;
            audio.currentTime = 0;
            audio.play().catch(e => console.log('点击音效失败:', e));
        } else {
            this.winAudio.currentTime = 0;
            this.winAudio.play().catch(e => console.log('中奖音效失败:', e));
        }
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

        $modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) $modal.remove();
        });
    }

    recordHistory(prize) {
        try {
            this.history = [...this.history, { 
                card: this.currentCard,
                name: prize.name,
                id: prize.id,
                timestamp: Date.now()
            }].slice(-this.historyLimit);
            localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
            this.updateHistoryDisplay();
        } catch(e) { console.error('存储失败:', e) }
    }
}

// 初始化抽奖系统
$.fn.lottery = function() {
    return this.each(function() {
        if (!$.data(this, 'lottery')) new Lottery(this);
    });
};

$(function() {
    $('.lot-grid').lottery();

    // 获取卡密模态框
    window.showCardInfo = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <p>此活动只针对站长好友开放</p>
                        <p>需赞赏后获取卡密：中奖率100%</p>
                        <div class="wechat-row">
                            <span>复制站长微信</span>
                            <button class="copy-btn">📋 复制</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) modal.remove();
        });

        modal.find('.copy-btn').on('click', e => {
            e.stopPropagation();
            navigator.clipboard.writeText('LIVE-CS2025')
                .then(() => $('<div class="alert-message">微信号已复制</div>')
                    .appendTo('body').delay(2000).fadeOut(300, () => $(this).remove()))
                .catch(err => console.error('复制失败:', err));
        });
    };

    // 赞赏二维码模态框
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

        modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) modal.remove();
        });
    };
});
