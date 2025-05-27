// lottery.js
"use strict";

class LotterySystem {
    constructor() {
        this.PRIZES = [
            { id: 1, name: '体验券', prob: 78.0, desc: '免费体验台球1小时' },
            { id: 2, name: '店长特训', prob: 18.0, desc: '店长一对一指导1小时', dailyLimit: 2 },
            { id: 3, name: '周会员', prob: 3.9,  desc: '一周会员资格', weeklyLimit: 1 },
            { id: 4, name: '专属球杆', prob: 0.1, desc: '定制台球杆一支', monthlyLimit: 1 }
        ];

        this.animationOrder = [0, 1, 2, 5, 8, 7, 6, 3]; // 顺时针动画路径
        this.prizePositions = { 1:0, 2:2, 3:6, 4:8 };   // 奖品对应格子索引
        this.init();
    }

    init() {
        this.isDrawing = false;
        this.speed = 80;
        this.history = JSON.parse(localStorage.getItem('lotteryHistory') || [];
        this.usedCards = new Set(JSON.parse(localStorage.getItem('usedCards') || []);

        this.$grid = $('.lot-grid');
        this.$items = this.$grid.find('.lot-item:not(.center)');
        this.$button = this.$grid.find('.center');
        this.bindEvents();
    }

    bindEvents() {
        this.$button.on('click', () => this.handleStart());
        $(document)
            .on('click', '.clear-history', () => this.clearHistory())
            .on('click', '.copy-btn', (e) => this.copyText(e))
            .on('click', '.prize-item', (e) => this.showPrizeDesc(e));
    }

    // 核心抽奖逻辑
    async handleStart() {
        if (this.isDrawing) return;
        this.isDrawing = true;
        
        try {
            const prize = await this.determinePrize();
            await this.runPrizeAnimation(prize);
            this.showResult(prize);
            this.recordHistory(prize);
        } finally {
            this.isDrawing = false;
        }
    }

    determinePrize() {
        return new Promise(resolve => {
            const rand = Math.random() * 100;
            let accum = 0;

            for (const prize of this.PRIZES) {
                accum += prize.prob;
                if (rand <= accum && this.checkLimit(prize)) {
                    return resolve(prize);
                }
            }
            resolve(this.PRIZES[0]); // 保底奖品
        });
    }

    checkLimit(prize) {
        const now = new Date();
        const records = this.history.filter(r => r.id === prize.id);

        switch(prize.id) {
            case 2: // 每日限制
                const todayStart = new Date(now).setHours(0,0,0,0);
                return records.filter(r => r.timestamp >= todayStart).length < prize.dailyLimit;
            case 3: // 每周限制
                const weekStart = new Date(now - (now.getDay() * 86400000)).setHours(0,0,0,0);
                return records.filter(r => r.timestamp >= weekStart).length < prize.weeklyLimit;
            case 4: // 每月限制
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                return records.filter(r => r.timestamp >= monthStart).length < prize.monthlyLimit;
            default:
                return true;
        }
    }

    // 动画控制逻辑
    async runPrizeAnimation(prize) {
        return new Promise(resolve => {
            const targetIndex = this.prizePositions[prize.id];
            const totalSteps = 32 + Math.floor(8 * Math.random());
            let steps = 0, cycle = 0;

            const animate = () => {
                this.$items.removeClass('active');
                const currentPos = this.animationOrder[cycle % 8];
                this.$items.eq(currentPos).addClass('active');

                if (steps++ < totalSteps) {
                    this.speed = Math.min(this.speed + 3, 140);
                    cycle++;
                    setTimeout(animate, this.speed);
                } else {
                    this.$items.eq(targetIndex).addClass('active');
                    resolve();
                }
            };
            
            animate();
        });
    }

    // 历史记录管理
    recordHistory(prize) {
        const record = {
            id: prize.id,
            name: prize.name,
            timestamp: Date.now(),
            card: this.currentCard
        };

        this.history = [...this.history, record].slice(-50);
        localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
        this.updateHistoryDisplay();
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

    // 辅助功能
    showResult(prize) {
        const $modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="result-body">
                        <h2>🎉 恭喜中奖！</h2>
                        <div class="prize-info">
                            <p>${prize.name}</p>
                            <small>${prize.desc}</small>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body').click(e => {
            if ($(e.target).is('.modal-wrapper')) $modal.remove();
        });
    }

    copyText(e) {
        const text = $(e.target).prev().text().split(' - ')[0];
        navigator.clipboard.writeText(text);
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('lotteryHistory');
        this.updateHistoryDisplay();
    }

    showPrizeDesc(e) {
        const prizeId = $(e.currentTarget).data('prize');
        const prize = this.PRIZES.find(p => p.id == prizeId);
        alert(`奖项说明：${prize.desc}`);
    }
}

// 初始化系统
$(document).ready(() => {
    window.lotterySystem = new LotterySystem();
});
