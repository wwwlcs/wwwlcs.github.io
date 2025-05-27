// script.js
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
    constructor() {
        this.$items = $('.lot-item').not('#startBtn');
        this.$button = $('#startBtn');
        this.historyLimit = 50;
        this.usedCards = new Set();
        this.currentCard = null;
        this.audioPool = [];
        this.initStorage();
        this.initAudio();
        this.bindEvents();
    }

    initStorage() {
        try {
            this.history = JSON.parse(localStorage.getItem('lotteryHistory') || '[]');
            this.usedCards = new Set(JSON.parse(localStorage.getItem('usedCards') || '[]'));
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
            prize && this.showAlert(`奖项说明：${prize.desc}`);
        });
    }

    // ...保持原有 Lottery 类核心方法不变...

    showCardModal() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3>请输入卡密</h3>
                        <input type="text" class="card-input" placeholder="输入卡密开始抽奖" maxlength="18">
                        <button class="action-btn confirm-card">确认抽奖</button>
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
                this.start();
            }
        });
    }

    // ...保持原有其他方法不变...
}

// 初始化
$(function() {
    new Lottery();

    window.showCardInfo = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <p>需赞赏后获取卡密</p>
                        <div class="wechat-row">
                            <button class="action-btn copy-btn">📋 复制微信</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.find('.copy-btn').on('click', () => {
            navigator.clipboard.writeText('LIVE-CS2025')
                .then(() => $('<div class="alert-message">微信号已复制</div>')
                    .appendTo('body').delay(2000).fadeOut());
        });
    };

    window.showQRCode = function() {
        $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="qrcode-body">
                        <h3>赞赏支持</h3>
                        <img src="qrcode.jpg" alt="赞赏二维码">
                        <p>扫码赞赏后联系站长核验</p>
                    </div>
                </div>
            </div>
        `).appendTo('body').on('click', e => $(e.target).hasClass('modal-wrapper') && $(e.target).remove());
    };
});
