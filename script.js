// script.js
"use strict";

const PRIZES = [
    { id: 1, name: '体验券', prob: 78.0, desc: '免费体验台球1小时' },
    { id: 2, name: '店长特训', prob: 18.0, desc: '店长一对一指导1小时', dailyLimit: 2 },
    { id: 3, name: '周会员', prob: 3.9,  desc: '一周会员资格', weeklyLimit: 1 },
    { id: 4, name: '专属球杆', prob: 0.1, desc: '定制台球杆一支', monthlyLimit: 1 }
];

const moveOrder = [0, 1, 2, 4, 7, 6, 5, 3]; // 顺时针移动顺序

class Lottery {
    constructor(element) {
        this.$element = $(element);
        this.$items = this.$element.find('.lot-item').not('.lot-btn');
        this.$button = this.$element.find('.lot-btn');
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
        $(document).on('click', '.copy-btn', (e) => {
            const text = $(e.target).prev().text().split(' - ')[0];
            navigator.clipboard.writeText(text);
        });

        this.$button.on('click', () => this.showCardModal());
        
        $(document).on('click', '.prize-item', (e) => {
            const prizeId = $(e.currentTarget).data('prize');
            const prize = PRIZES.find(p => p.id == prizeId);
            if(prize) this.showAlert(`奖项说明：${prize.desc}`);
        });
    }

    highlightItem(index) {
        this.$items.removeClass('active');
        this.$items.eq(moveOrder[index]).addClass('active');
    }

    async runAnimation(targetIndex) {
        return new Promise(resolve => {
            let steps = 0;
            let speed = 50;
            const totalSteps = 24 + targetIndex;

            const animate = () => {
                if (steps >= totalSteps) {
                    clearInterval(timer);
                    this.isDrawing = false;
                    resolve();
                    return;
                }

                this.highlightItem(this.currentIndex);
                this.currentIndex = (this.currentIndex + 1) % moveOrder.length;
                steps++;

                if (steps > totalSteps - 8) {
                    speed += 50;
                    clearInterval(timer);
                    timer = setInterval(animate, speed);
                }
            };

            let timer = setInterval(animate, speed);
        });
    }

    async getPrize() {
        return new Promise(resolve => {
            const random = Math.random() * 100;
            let accum = 0;
            
            for (const p of PRIZES) {
                accum += p.prob;
                if (random <= accum) {
                    resolve(this.checkPrizeLimit(p) ? p : PRIZES[0]);
                    return;
                }
            }
            resolve(PRIZES[0]);
        });
    }

    checkPrizeLimit(prize) {
        const now = new Date();
        const history = this.history.filter(r => r.id === prize.id);
        
        switch(prize.id) {
            case 2: return history.filter(r => 
                new Date(r.timestamp).toDateString() === now.toDateString()
            ).length < prize.dailyLimit;
            case 3: return history.filter(r => 
                Math.abs(new Date(r.timestamp) - now) < 604800000
            ).length < prize.weeklyLimit;
            case 4: return history.filter(r => 
                new Date(r.timestamp).getMonth() === now.getMonth()
            ).length < prize.monthlyLimit;
            default: return true;
        }
    }

    validateCard(card) {
        const regex = /^\d{12}[A-Z]{6}$/;
        if(!regex.test(card)) return false;
        
        const timePart = card.slice(0, 12);
        const now = new Date();
        const cardDate = new Date(
            parseInt(timePart.slice(0,4)),
            parseInt(timePart.slice(4,6)) - 1,
            parseInt(timePart.slice(6,8)),
            parseInt(timePart.slice(8,10)),
            parseInt(timePart.slice(10,12))
        );

        return Math.abs(now - cardDate) < 300000 && 
               !this.usedCards.has(card);
    }

    async start() {
        if(!this.validateCard(this.currentCard)) {
            this.showAlert('卡密无效或已使用');
            return;
        }

        this.isDrawing = true;
        this.usedCards.add(this.currentCard);
        localStorage.setItem('usedCards', JSON.stringify([...this.usedCards]));

        const prize = await this.getPrize();
        await this.runAnimation(prize.id % 4);
        this.showResult(prize);
        this.recordHistory(prize);
    }

    showResult(prize) {
        this.winAudio.play();
        $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <h2>🎉 恭喜获得：${prize.name}</h2>
                    <p>${prize.desc}</p>
                </div>
            </div>
        `).appendTo('body').click(function() {
            $(this).remove();
        });
    }

    recordHistory(prize) {
        this.history = [...this.history, {
            card: this.currentCard,
            name: prize.name,
            id: prize.id,
            timestamp: Date.now()
        }].slice(-this.historyLimit);
        localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
        this.updateHistoryDisplay();
    }

    showAlert(msg) {
        $(`<div class="alert-message">${msg}</div>`)
            .appendTo('body').delay(2000).fadeOut();
    }

    showCardModal() {
        $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <input type="text" class="card-input" placeholder="输入18位卡密">
                    <button class="confirm-btn">开始抽奖</button>
                </div>
            </div>
        `).appendTo('body').find('.confirm-btn').click(() => {
            this.currentCard = $('.card-input').val().trim().toUpperCase();
            $('.modal-wrapper').remove();
            this.start();
        });
    }
}

$.fn.lottery = function() {
    return this.each(function() {
        if (!$.data(this, 'lottery')) {
            new Lottery(this);
        }
    });
};

$(function() {
    $('.lot-grid').lottery();
});
