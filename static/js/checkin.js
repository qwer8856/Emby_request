// ==================== 签到系统 ====================

// 加载签到状态
async function loadCheckinStatus() {
    try {
        const response = await fetch('/api/user/checkin/status');
        const data = await response.json();
        
        if (data.success) {
            const { config, status } = data;
            
            // 获取签到相关元素
            const miniCard = document.getElementById('checkinMiniCard');
            const exchangeSection = document.getElementById('checkinExchangeSection');
            
            // 如果签到功能未开启，隐藏签到容器
            if (!config.enabled) {
                if (miniCard) miniCard.style.display = 'none';
                if (exchangeSection) exchangeSection.style.display = 'none';
                return;
            }
            
            // 显示签到容器
            if (miniCard) miniCard.style.display = 'block';
            
            // 检查是否有兑换套餐，有则显示兑换区域
            if (config.exchange_plans && config.exchange_plans.length > 0) {
                if (exchangeSection) exchangeSection.style.display = 'block';
            }
            
            // 更新迷你卡片信息
            const coinNameMini = document.getElementById('coinNameMini');
            const userCoinsMini = document.getElementById('userCoinsMini');
            const checkinMiniBtn = document.getElementById('checkinMiniBtn');
            const checkinMiniHint = document.getElementById('checkinMiniHint');
            
            if (coinNameMini) coinNameMini.textContent = config.coin_name;
            if (userCoinsMini) userCoinsMini.textContent = status.coins || 0;
            
            // 更新签到按钮状态
            if (checkinMiniBtn) {
                if (!config.can_checkin) {
                    // 无权签到（权限限制）
                    checkinMiniBtn.disabled = true;
                    checkinMiniBtn.classList.add('disabled');
                    checkinMiniBtn.innerHTML = '<span class="btn-text">不可签到</span>';
                    if (checkinMiniHint) checkinMiniHint.textContent = config.checkin_hint || '暂无签到权限';
                } else if (status.checked_today) {
                    checkinMiniBtn.disabled = true;
                    checkinMiniBtn.classList.add('disabled');
                    checkinMiniBtn.innerHTML = '<span class="btn-text">已签到</span>';
                    if (checkinMiniHint) checkinMiniHint.textContent = '明天再来~';
                } else {
                    checkinMiniBtn.disabled = false;
                    checkinMiniBtn.classList.remove('disabled');
                    checkinMiniBtn.innerHTML = '<span class="btn-text">签到</span>';
                    if (checkinMiniHint) checkinMiniHint.textContent = '签到获得奖励';
                }
            }
            
            // 加载兑换套餐
            renderExchangePlans(config.exchange_plans, config.coin_name, status.coins || 0);
            
            // 加载兑换记录
            loadExchangeRecords();
        } else {
            console.error('加载签到状态失败:', data.error);
        }
    } catch (error) {
        console.error('加载签到状态失败:', error);
    }
}

// 执行签到
let _checkinCaptcha = null;

function generateCheckinCaptcha() {
    const ops = [
        () => { const a = Math.floor(Math.random()*20)+1, b = Math.floor(Math.random()*20)+1; return { q: `${a} + ${b} = ?`, a: a+b }; },
        () => { const a = Math.floor(Math.random()*20)+5, b = Math.floor(Math.random()*a)+1; return { q: `${a} - ${b} = ?`, a: a-b }; },
        () => { const a = Math.floor(Math.random()*9)+2, b = Math.floor(Math.random()*9)+2; return { q: `${a} × ${b} = ?`, a: a*b }; },
    ];
    return ops[Math.floor(Math.random()*ops.length)]();
}

async function doCheckin() {
    const miniBtn = document.getElementById('checkinMiniBtn');
    if (miniBtn && miniBtn.disabled) return;

    // 生成验证码并弹出输入框
    _checkinCaptcha = generateCheckinCaptcha();
    const answer = await showPrompt({
        title: '🔒 签到验证',
        message: `请计算以下算式的结果\n\n${_checkinCaptcha.q}`,
        placeholder: '请输入计算结果',
        type: 'info'
    });

    // 用户取消
    if (answer === null) return;

    // 验证答案
    if (parseInt(answer) !== _checkinCaptcha.a) {
        window.showToast('验证失败，计算结果不正确', 'error');
        return;
    }
    
    if (miniBtn) {
        miniBtn.disabled = true;
        miniBtn.innerHTML = '<span class="btn-text">签到中...</span>';
    }
    
    try {
        const response = await fetch('/api/user/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 显示签到成功动画
            showCheckinSuccess(data.coins_earned, data.coin_name);
            
            // 刷新签到状态
            setTimeout(() => {
                loadCheckinStatus();
            }, 1500);
        } else {
            window.showToast(data.error || '签到失败', 'error');
            if (miniBtn) {
                miniBtn.disabled = false;
                miniBtn.innerHTML = '<span class="btn-text">签到</span>';
            }
        }
    } catch (error) {
        console.error('签到失败:', error);
        window.showToast('签到失败，请稍后重试', 'error');
        if (miniBtn) {
            miniBtn.disabled = false;
            miniBtn.innerHTML = '<span class="btn-text">签到</span>';
        }
    }
}

// 显示签到成功动画
function showCheckinSuccess(coins, coinName) {
    // 创建动画元素
    const animation = document.createElement('div');
    animation.className = 'checkin-success-animation';
    animation.innerHTML = `
        <div class="success-icon">🎉</div>
        <div class="success-text">签到成功!</div>
        <div class="success-reward">+${coins} ${coinName}</div>
    `;
    
    document.body.appendChild(animation);
    
    // 3秒后移除
    setTimeout(() => {
        animation.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(animation);
        }, 300);
    }, 2500);
}

// 渲染兑换套餐
function renderExchangePlans(plans, coinName, userCoins) {
    const container = document.getElementById('exchangePlans');
    if (!container) return;
    
    if (!plans || plans.length === 0) {
        container.innerHTML = '<div class="no-plans">暂无可兑换的套餐</div>';
        return;
    }
    
    const html = plans.map(plan => {
        const canExchange = userCoins >= plan.coins;
        return `
            <div class="exchange-plan ${canExchange ? '' : 'disabled'}">
                <div class="plan-header">
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">${plan.coins} ${coinName}</div>
                </div>
                <div class="plan-duration">${plan.days} 天订阅</div>
                <button class="exchange-btn ${canExchange ? '' : 'disabled'}" 
                        onclick="exchangePlan('${plan.id}', '${plan.name}', ${plan.coins}, ${plan.days})"
                        ${canExchange ? '' : 'disabled'}>
                    ${canExchange ? '立即兑换' : '积分不足'}
                </button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// 兑换套餐
async function exchangePlan(planId, planName, coins, days) {
    if (!confirm(`确定要使用 ${coins} 积分兑换 ${planName} (${days}天) 吗？`)) {
        return;
    }
    
    // 找到按钮并显示加载状态
    const btn = event.target.closest('button');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading-spinner"></span> 兑换中...';
    }
    
    try {
        const response = await fetch('/api/user/exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_id: planId,
                plan_name: planName,
                coins: coins,
                days: days
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.showToast(`兑换成功！订阅已延长 ${days} 天`, 'success');
            
            // 刷新签到状态和兑换记录
            loadCheckinStatus();
            
            // 如果在订阅页面，也刷新订阅信息
            if (typeof loadSubscription === 'function') {
                loadSubscription();
            }
        } else {
            window.showToast(data.error || '兑换失败', 'error');
            // 恢复按钮状态
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    } catch (error) {
        console.error('兑换失败:', error);
        window.showToast('兑换失败，请稍后重试', 'error');
        // 恢复按钮状态
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

// 加载兑换记录
async function loadExchangeRecords(page = 1) {
    try {
        const response = await fetch(`/api/user/exchange/records?page=${page}&per_page=5`);
        const data = await response.json();
        
        if (data.success) {
            renderExchangeRecords(data.records);
        }
    } catch (error) {
        console.error('加载兑换记录失败:', error);
    }
}

// 渲染兑换记录
function renderExchangeRecords(records) {
    const container = document.getElementById('exchangeRecordsList');
    if (!container) return;
    
    if (!records || records.length === 0) {
        container.innerHTML = '<div class="no-records">暂无兑换记录</div>';
        return;
    }
    
    const html = records.map(record => `
        <div class="exchange-record-item">
            <div class="record-info">
                <div class="record-name">${record.plan_name}</div>
                <div class="record-time">${record.created_at}</div>
            </div>
            <div class="record-details">
                <span class="record-cost">-${record.coins_cost} 积分</span>
                <span class="record-days">+${record.duration_days} 天</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// 查看全部兑换记录
function viewAllExchangeRecords() {
    // 可以打开一个模态框显示完整的兑换记录
    window.showToast('功能开发中', 'info');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 立即加载签到状态
    setTimeout(() => {
        loadCheckinStatus();
    }, 100);
});
