// script.js
"use strict";

class CyberLottery extends Lottery {
    constructor(element) {
        super(element);
        this.initSFX();
        this.initParticles();
    }

    initSFX() {
        this.tickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        this.tickSound.volume = 0.3;
        this.winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3');
    }

    initParticles() {
        // 粒子系统初始化代码...
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

                // 播放过渡音效
                if(currentStep % 2 === 0) {
                    this.tickSound.currentTime = 0;
                    this.tickSound.play().catch(() => {});
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

    showResult(prize) {
        this.winSound.play();
        // 全息投影效果模态框
        const $modal = $(`
            <div class="hologram-modal">
                <div class="hologram-content">
                    <div class="cyber-header">
                        <div class="cyber-glitch" data-text="量子纠缠结果">量子纠缠结果</div>
                    </div>
                    <div class="quantum-result">
                        <div class="result-particle"></div>
                        <h2>${prize.name}</h2>
                        <p>${prize.desc}</p>
                    </div>
                </div>
            </div>
        `).appendTo('body');
    }
}

// 其他扩展功能保持不变...
