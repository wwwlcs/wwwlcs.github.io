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
    prizeMap: { 1:1, 2:4, 3:6, 4:3 }
};

class Lottery {
    constructor() {
        this.$element = $('.hologrid');
        this.$items = $('.glass-card').not('#startBtn');
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
            this.history = JSON.parse(localStorage.getItem('lotteryHistory') || [];
            this.usedCards = new Set(JSON.parse(localStorage.getItem('usedCards') || []));
            this.updateHistoryDisplay();
        } catch(e) {
            console.error('存储读取失败:', e);
            this.history = [];
            this.usedCards = new Set();
        }
    }

    initAudio() {
        for(let i = 0; i < 5; i++) {
            this.audioPool.push(new Audio('./click.mp3'));
        }
        this.winAudio = new Audio('./win.mp3');
    }

    updateHistoryDisplay() {
        $('.history-list').empty().append(
            this.history.slice(-5).reverse().map(record => `
                <div class="history-item">
                    <span>${record.card} - ${record.name}</span>
                    <button class="copy-btn">📋</button>
                </div>
            `)
        );
    }

    bindEvents() {
        $(document).on('click', '#startBtn, .confirm-card, .clear-btn, .copy-btn, .prize-item', () => {
            if(!this.isDrawing) this.playSound('click');
        });

        this.$button.click(() => this.showCardModal());
        
        $(document).on('click', '.copy-btn', e => {
            navigator.clipboard.writeText($(e.target).prev().text().split(' - ')[0]);
        });

        $('.clear-btn').click(() => {
            this.history = [];
            localStorage.removeItem('lotteryHistory');
            this.updateHistoryDisplay();
        });

        $('.prize-item').click(e => {
            const prize = PRIZES.find(p => p.id == $(e.currentTarget).data('prize'));
            prize && this.showAlert(`奖项说明：${prize.desc}`);
        });
    }

    // 保持其他核心方法不变（checkPrizeLimit, getPrize, runAnimation等）
    // ...此处限于篇幅省略具体实现，实际需完整保留原有逻辑...

    showCardModal() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3>请输入卡密</h3>
                        <input class="card-input" placeholder="输入18位卡密" maxlength="18">
                        <button class="glow-btn confirm-card">确认抽奖</button>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.find('.confirm-card').click(() => {
            const card = modal.find('.card-input').val().trim().toUpperCase();
            if(this.validateCard(card)) {
                this.currentCard = card;
                modal.remove();
                this.start();
            }
        });
    }

    // 保持其他核心方法不变...
}

// 初始化抽奖系统
$(function() {
    new Lottery();

    window.showCardInfo = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <p>赞赏获取卡密</p>
                        <div class="wechat-row">
                            <span>站长微信：LIVE-CS2025</span>
                            <button class="glow-btn copy-btn">📋 复制</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');
    };

    window.showQRCode = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3>扫码赞赏</h3>
                        <img src="qrcode.jpg" style="width:200px;height:200px;">
                    </div>
                </div>
            </div>
        `).appendTo('body');
    };
});
