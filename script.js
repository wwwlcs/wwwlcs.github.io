// script.js
"use strict";

const clockwiseOrder = [0, 1, 2, 5, 8, 7, 6, 3]; // 修正后的顺时针路径
const prizeMap = {
    1: '体验券',
    2: '店长特训',
    3: '周会员',
    4: '专属球杆'
};

class Lottery {
    constructor(element) {
        this.$element = $(element);
        this.$items = this.$element.find('.lot-item').not('.center');
        this.$button = this.$element.find('.center');
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
        this.speed = 80;
        this.currentIndex = 0;
        this.audioIndex = 0;
    }

    updateHistoryDisplay() {
        const $list = $('.history-list').empty();
        this.history.slice(-5).reverse().forEach(record => {
            $list.prepend(`
                <div class="history-item">
                    <span>${record.time}</span>
                    <span>${record.prize}</span>
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
            '.center',
            '.confirm-card',
            '.clear-history',
            '.copy-btn',
            '.action-btn'
        ].join(','), playClick);

        $('.clear-history').on('click', () => {
            this.history = [];
            localStorage.removeItem('lotteryHistory');
            this.updateHistoryDisplay();
        });
    }

    runAnimation(targetIndex) {
        return new Promise(resolve => {
            const totalSteps = 32 + Math.floor(8 * Math.random());
            let currentStep = 0;
            let cycleCount = 0;

            const animate = () => {
                this.$items.removeClass('active');
                const currentPos = clockwiseOrder[cycleCount % clockwiseOrder.length];
                this.$items.eq(currentPos).addClass('active');

                if (currentStep++ < totalSteps) {
                    this.speed = Math.min(this.speed + 3, 140);
                    cycleCount++;
                    setTimeout(animate, this.speed);
                } else {
                    const finalIndex = clockwiseOrder[targetIndex % clockwiseOrder.length];
                    this.$items.removeClass('active');
                    this.$items.eq(finalIndex).addClass('active');
                    resolve(finalIndex);
                }
            };
            animate();
        });
    }

    showCardModal() {
        if(this.isDrawing) return;
        
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3 style="margin-bottom:15px;text-align:center">请输入卡密</h3>
                        <input type="text" class="card-input" placeholder="输入18位卡密" maxlength="18">
                        <div style="margin-top:20px;text-align:center">
                            <button class="confirm-card action-btn">开始抽奖</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) {
                modal.fadeOut(200, () => modal.remove());
            }
        });

        $('.confirm-card').on('click', () => {
            const card = $('.card-input').val().trim().toUpperCase();
            if(this.validateCard(card)) {
                this.currentCard = card;
                modal.remove();
                this.start();
            }
        });
    }

    validateCard(card) {
        const regex = /^\d{12}[A-Z]{6}$/;
        if(!regex.test(card)) {
            this.showAlert('卡密格式错误');
            return false;
        }
        
        // 时间验证逻辑（保持原有）
        // ...

        if(this.usedCards.has(card)) {
            this.showAlert('卡密已使用');
            return false;
        }
        
        this.usedCards.add(card);
        localStorage.setItem('usedCards', JSON.stringify([...this.usedCards]));
        return true;
    }

    async start() {
        this.isDrawing = true;
        this.$button.addClass('disabled');

        const targetIndex = Math.floor(Math.random() * clockwiseOrder.length);
        const finalIndex = await this.runAnimation(targetIndex);
        this.showResult(finalIndex);
        this.recordHistory(finalIndex);

        this.isDrawing = false;
        this.$button.removeClass('disabled');
    }

    showResult(finalIndex) {
        this.playSound('win');
        const prizeId = this.$items.eq(finalIndex).data('prize');
        const prizeName = prizeMap[prizeId] || '幸运格';
        
        const $modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="result-body">
                        <h2>🎉 恭喜中奖！</h2>
                        <div class="prize-display">${prizeName}</div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        $modal.on('click', e => {
            if ($(e.target).hasClass('modal-wrapper')) {
                $modal.fadeOut(200, () => $modal.remove());
            }
        });
    }

    recordHistory(finalIndex) {
        const prizeId = this.$items.eq(finalIndex).data('prize');
        const record = {
            time: new Date().toLocaleString(),
            prize: prizeMap[prizeId] || '幸运格',
            card: this.currentCard,
            timestamp: Date.now()
        };

        this.history = [record, ...this.history].slice(0, this.historyLimit);
        localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
        this.updateHistoryDisplay();
    }

    playSound(type) {
        // 保持原有音效逻辑
        // ...
    }

    showAlert(message) {
        // 保持原有提示逻辑
        // ...
    }
}

// 初始化抽奖系统
$(function() {
    $('.lot-grid').lottery();

    window.showCardInfo = function() {
        // 保持原有卡密说明逻辑
        // ...
    };

    window.showQRCode = function() {
        // 保持原有赞赏二维码逻辑
        // ...
    };
});
