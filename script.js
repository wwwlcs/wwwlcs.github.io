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
        // 保存实例到全局以便访问
        window.lotteryInstance = this;
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
        const $placeholder = $('.history-placeholder');
        
        if (this.history.length === 0) {
            $list.hide();
            $placeholder.show();
        } else {
            $placeholder.hide();
            $list.show();
            this.history.slice(-5).reverse().forEach(record => {
                $list.append(`
                    <div class="history-item">
                        <span>${record.card} - ${record.name}</span>
                        <button class="copy-btn">📋</button>
                    </div>
                `);
            });
        }
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
            window.showAlert('卡密已复制');
            this.playSound('click');
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
                            <button class="confirm-card confirm-btn">确认抽奖</button>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => $(e.target).hasClass('modal-wrapper') && modal.remove());

        modal.find('.confirm-card').on('click', () => {
            this.playSound('click');
            const card = modal.find('.card-input').val().trim().toUpperCase();
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
        const audio = type === 'click' 
            ? this.audioPool[(this.audioIndex++ % this.audioPool.length)]
            : this.winAudio;
            
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
        if (!$.data(this, 'lottery')) new Lottery(this);
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
            // 确保播放音效
            if (window.lotteryInstance) {
                window.lotteryInstance.playSound('click');
            } else {
                const clickAudio = new Audio('./click.mp3');
                clickAudio.currentTime = 0;
                clickAudio.play().catch(e => console.log('点击音效播放失败:', e));
            }
            
            navigator.clipboard.writeText('LIVE-CS2025')
                .then(() => window.showAlert('微信号已复制'))
                .catch(e => console.error('复制失败:', e));
        });
    };

    // 卡密生成函数（12位时间+6位随机大写字母）
    function generateVerificationCode() {
        const now = new Date();
        
        // 格式化年月日时分
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        // 生成六位随机大写字母
        let randomLetters = '';
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 6; i++) {
            randomLetters += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
        
        // 组合成完整验证码 (12位数字 + 6位字母)
        return `${year}${month}${day}${hours}${minutes}${randomLetters}`;
    }

    // 防作弊状态变量
    let hiddenStartTime = 0;
    let hiddenDuration = 0;
    let timerInterval = null;
    let isValidationPassed = false;
    let timerSeconds = 0;

    // 防作弊核心功能
    function setupAntiCheat($modal) {
        // 重置状态
        hiddenStartTime = 0;
        hiddenDuration = 0;
        isValidationPassed = false;
        timerSeconds = 0;
        
        // 获取状态元素
        const $statusIndicator = $(`
            <div class="status-indicator">
                <div class="status-dot"></div>
                <span id="statusText">请在规定时间内完成支付</span>
            </div>
            <div class="status-timer">120秒内请完成支付：<span id="timer">0</span>秒</div>
        `);
        $modal.find('.qrcode-body').prepend($statusIndicator);
        
        const $statusDot = $modal.find('.status-dot');
        const $statusText = $modal.find('#statusText');
        const $timer = $modal.find('#timer');
        
        // 启动计时器
        timerInterval = setInterval(() => {
            timerSeconds++;
            $timer.text(timerSeconds);
            
            // 60秒超时重置
            if (timerSeconds > 120) {
                resetValidation($statusDot, $statusText);
                timerSeconds = 0;
                $timer.text('0');
                $statusText.text('操作超时，请重新开始');
                setTimeout(() => {
                    $statusText.text('完成支付后方可获取卡密');
                }, 3000);
            }
        }, 1000);
        
        // 页面可见性变化检测
        $(document).on('visibilitychange.anticheat', function() {
            if (document.hidden) {
                // 页面隐藏（用户离开）
                hiddenStartTime = Date.now();
                $statusText.text('检测到您正在支付...');
            } else {
                // 页面再次可见（用户返回）
                if (hiddenStartTime > 0) {
                    hiddenDuration = Date.now() - hiddenStartTime;
                    hiddenStartTime = 0;
                    
                    // 检查离开时间是否超过5秒
                    if (hiddenDuration >= 5000) {
                        isValidationPassed = true;
                        $statusDot.addClass('active');
                        $statusText.text('验证通过！点击获取卡密');
                    } else {
                        $statusText.text(`并未完成支付（${Math.floor(hiddenDuration/1000)}秒），请完成支付操作`);
                    }
                }
            }
        });
        
        return { $statusDot, $statusText };
    }
    
    function resetValidation($statusDot, $statusText) {
        isValidationPassed = false;
        hiddenStartTime = 0;
        hiddenDuration = 0;
        $statusDot.removeClass('active');
        $statusText.text('请打开微信扫码完成支付');
    }

    // 显示支付成功后的卡密弹窗
    function showPaymentCodeModal(code) {
        const $modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="modal-body">
                        <h3 style="margin-bottom:15px;text-align:center">🎉 支付成功</h3>
                        <div style="text-align:center">
                            <p>您的卡密已生成，请复制保存</p>
                            <div class="verification-code">${code}</div>
                            <button class="copy-payment-btn">
                                <i class="fas fa-copy"></i> 复制卡密
                            </button>
                            <p class="info-text" style="margin-top:15px;color:#aaa;font-size:12px">
                                注意：请复制中奖信息确保兑奖能够顺利完成<br>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        $modal.on('click', e => $(e.target).hasClass('modal-wrapper') && $modal.remove());
        
        const $copyBtn = $modal.find('.copy-payment-btn');
        $copyBtn.on('click', function() {
            navigator.clipboard.writeText(code)
                .then(() => {
                    // 更新按钮状态
                    $(this).addClass('copy-success').html('<i class="fas fa-check"></i> 已复制');
                    window.showAlert('卡密已复制到剪贴板');
                    
                    // 播放音效
                    if (window.lotteryInstance) {
                        window.lotteryInstance.playSound('click');
                    } else {
                        const clickAudio = new Audio('./click.mp3');
                        clickAudio.currentTime = 0;
                        clickAudio.play().catch(e => console.log('点击音效播放失败:', e));
                    }
                    
                    // 3秒后恢复按钮状态
                    setTimeout(() => {
                        $copyBtn.removeClass('copy-success').html('<i class="fas fa-copy"></i> 复制卡密');
                    }, 3000);
                })
                .catch(e => console.error('复制失败:', e));
        });
    }

    window.showQRCode = function() {
        const modal = $(`
            <div class="modal-wrapper">
                <div class="modal-content">
                    <div class="qrcode-body">
                        <h3>赞赏支持</h3>
                        <img src="qrcode.jpg" alt="赞赏二维码" style="max-width:100%">
                        <div class="payment-tip">长按图片保存至微信扫码赞赏回到页面</div>
                        <button class="payment-btn" id="paymentSuccessBtn" disabled>
                            <i class="fas fa-check-circle"></i> 获取卡密
                        </button>
                        <p style="margin-top:15px;color:#aaa">支付完成后点击上方按钮获取卡密</p>
                    </div>
                </div>
            </div>
        `).appendTo('body');

        modal.on('click', e => $(e.target).hasClass('modal-wrapper') && modal.remove());
        
        // 设置防作弊机制
        const { $statusDot, $statusText } = setupAntiCheat(modal);
        
        // 绑定支付成功按钮事件
        const $payBtn = modal.find('#paymentSuccessBtn');
        $payBtn.on('click', function() {
            // 播放音效
            if (window.lotteryInstance) {
                window.lotteryInstance.playSound('click');
            } else {
                const clickAudio = new Audio('./click.mp3');
                clickAudio.currentTime = 0;
                clickAudio.play().catch(e => console.log('点击音效播放失败:', e));
            }
            
            // 更新按钮状态
            $(this).addClass('payment-success').html('<i class="fas fa-check-circle"></i> 卡密生成中...');
            
            // 生成卡密并显示弹窗
            setTimeout(() => {
                // 清除防作弊事件监听
                $(document).off('visibilitychange.anticheat');
                clearInterval(timerInterval);
                
                const code = generateVerificationCode();
                modal.remove();
                showPaymentCodeModal(code);
            }, 1000);
        });
        
        // 监控验证状态
        const checkValidation = setInterval(() => {
            if (isValidationPassed) {
                $payBtn.prop('disabled', false);
                clearInterval(checkValidation);
            }
        }, 500);
    };

    function loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('lotteryHistory') || '[]');
            const $list = $('.history-list');
            const $placeholder = $('.history-placeholder');
            
            if (history.length === 0) {
                $list.hide();
                $placeholder.show();
            } else {
                $placeholder.hide();
                $list.show().empty();
                history.slice(-5).reverse().forEach(record => {
                    $list.append(`
                        <div class="history-item">
                            <span>${record.card} - ${record.name}</span>
                            <button class="copy-btn">📋</button>
                        </div>
                    `);
                });
            }
        } catch(e) {
            console.error('记录加载失败:', e);
        }
    }
    loadHistory();

    window.showAlert = function(msg) {
        // 先移除所有现有提示
        $('.alert-message').remove();
        
        const $alert = $('<div class="alert-message">'+msg+'</div>');
        $('#alert-container').append($alert);
        
        // 2秒后自动移除
        setTimeout(() => {
            $alert.fadeOut(300, function() { $(this).remove() });
        }, 2000);
    };
    
    // 动态加载 Font Awesome 图标库
    const faScript = document.createElement('script');
    faScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js';
    document.head.appendChild(faScript);
    
    // 动态加载 particles.js 库并初始化
    const particlesScript = document.createElement('script');
    particlesScript.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
    particlesScript.onload = function() {
        particlesJS('particles-js', {
            particles: {
                number: { 
                    value: 60, 
                    density: { 
                        enable: true, 
                        value_area: 1000 
                    } 
                },
                color: { 
                    value: ["#ffcc00", "#b19cd9", "#3498db", "#ff6b8b", "#8a6dbe"]
                },
                shape: { 
                    type: "circle"
                },
                opacity: { 
                    value: 0.8, 
                    random: true,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.3,
                        sync: false
                    }
                },
                size: { 
                    value: 4, 
                    random: true,
                    anim: {
                        enable: true,
                        speed: 3,
                        size_min: 1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: "#ffffff",
                    opacity: 0.1,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { 
                        enable: true, 
                        mode: "grab" 
                    },
                    onclick: { 
                        enable: true, 
                        mode: "push" 
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        line_linked: {
                            opacity: 0.3
                        }
                    },
                    push: {
                        particles_nb: 3
                    }
                }
            },
            retina_detect: true
        });
    };
    document.head.appendChild(particlesScript);
});
