// ==================== 签到系统 ====================

let checkinRequestInFlight = false;

function normalizeErrorMessage(raw, fallback = '未知错误') {
    const text = String(raw || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return fallback;
    return text.length > 180 ? `${text.slice(0, 180)}...` : text;
}

async function readJsonResponse(response) {
    const responseText = await response.text();
    let data = null;
    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = null;
        }
    }
    return { data, responseText };
}

function setCheckinButtonState(disabled, text) {
    const btn = document.getElementById('checkinMiniBtn');
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.innerHTML = `<span class="btn-text">${text}</span>`;
    if (disabled) {
        btn.classList.add('disabled');
    } else {
        btn.classList.remove('disabled');
    }
}

async function loadCheckinStatus() {
    try {
        const response = await fetch('/api/user/checkin/status');
        const { data } = await readJsonResponse(response);
        if (!data || !data.success) {
            console.error('加载签到状态失败:', data && data.error);
            return;
        }

        const { config, status } = data;
        const miniCard = document.getElementById('checkinMiniCard');
        const exchangeSection = document.getElementById('checkinExchangeSection');
        const checkinMiniHint = document.getElementById('checkinMiniHint');
        const coinNameMini = document.getElementById('coinNameMini');
        const userCoinsMini = document.getElementById('userCoinsMini');

        if (!config.enabled) {
            if (miniCard) miniCard.style.display = 'none';
            if (exchangeSection) exchangeSection.style.display = 'none';
            return;
        }

        if (miniCard) miniCard.style.display = 'block';
        if (exchangeSection) {
            exchangeSection.style.display = (config.exchange_plans && config.exchange_plans.length > 0)
                ? 'block'
                : 'none';
        }

        if (coinNameMini) coinNameMini.textContent = config.coin_name || '积分';
        if (userCoinsMini) userCoinsMini.textContent = status.coins || 0;

        if (!config.can_checkin) {
            setCheckinButtonState(true, '不可签到');
            if (checkinMiniHint) checkinMiniHint.textContent = config.checkin_hint || '暂无签到权限';
        } else if (status.checked_today) {
            setCheckinButtonState(true, '已签到');
            if (checkinMiniHint) checkinMiniHint.textContent = '明天再来~';
        } else {
            setCheckinButtonState(false, '签到');
            if (checkinMiniHint) checkinMiniHint.textContent = '签到获得奖励';
        }

        renderExchangePlans(config.exchange_plans || [], config.coin_name || '积分', status.coins || 0);
        loadExchangeRecords();
    } catch (error) {
        console.error('加载签到状态失败:', error);
    }
}

async function doCheckin() {
    const miniBtn = document.getElementById('checkinMiniBtn');
    if (miniBtn && miniBtn.disabled) return;
    if (checkinRequestInFlight) return;

    checkinRequestInFlight = true;
    let success = false;

    try {
        // 1) 获取验证码
        const capRes = await fetch('/api/user/captcha');
        const { data: capData, responseText: capText } = await readJsonResponse(capRes);
        if (!capRes.ok || !capData || !capData.success || !capData.image) {
            const detail = (capData && (capData.error || capData.message))
                || capText
                || `HTTP ${capRes.status}`;
            throw new Error(`获取验证码失败：${normalizeErrorMessage(detail, `HTTP ${capRes.status}`)}`);
        }

        // 2) 弹窗输入验证码
        const answer = await showCaptchaPrompt({
            title: '🔒 签到验证',
            message: '请输入图片中的 4 位数字',
            image: capData.image,
            placeholder: '请输入验证码'
        });
        if (answer === null) return;

        setCheckinButtonState(true, '签到中...');

        // 3) 提交签到
        const response = await fetch('/api/user/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ captcha_answer: answer })
        });

        const { data, responseText } = await readJsonResponse(response);
        if (!response.ok) {
            const detail = (data && (data.error || data.message))
                || responseText
                || `HTTP ${response.status}`;
            throw new Error(normalizeErrorMessage(detail, `HTTP ${response.status}`));
        }
        if (!data) {
            throw new Error(`服务器返回格式错误（HTTP ${response.status}）`);
        }
        if (!data.success) {
            throw new Error(normalizeErrorMessage(data.error || data.message, '签到失败'));
        }

        success = true;
        showCheckinSuccess(data.coins_earned, data.coin_name || '积分');
        setTimeout(() => {
            loadCheckinStatus();
        }, 1500);
    } catch (error) {
        console.error('签到失败(详细):', error);
        const detail = normalizeErrorMessage(error && error.message, '请稍后重试');
        window.showToast(`签到失败：${detail}`, 'error');
    } finally {
        checkinRequestInFlight = false;
        if (!success) {
            setCheckinButtonState(false, '签到');
        }
    }
}

function showCheckinSuccess(coins, coinName) {
    const animation = document.createElement('div');
    animation.className = 'checkin-success-animation';
    animation.innerHTML = `
        <div class="success-icon">🎉</div>
        <div class="success-text">签到成功!</div>
        <div class="success-reward">+${coins} ${coinName}</div>
    `;

    document.body.appendChild(animation);
    setTimeout(() => {
        animation.classList.add('fade-out');
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 300);
    }, 2500);
}

function renderExchangePlans(plans, coinName, userCoins) {
    const container = document.getElementById('exchangePlans');
    if (!container) return;

    if (!plans || plans.length === 0) {
        container.innerHTML = '<div class="no-plans">暂无可兑换的套餐</div>';
        return;
    }

    const html = plans.map((plan) => {
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

async function exchangePlan(planId, planName, coins, days) {
    let captchaImage;
    try {
        const capRes = await fetch('/api/user/captcha');
        const { data: capData, responseText: capText } = await readJsonResponse(capRes);
        if (!capRes.ok || !capData || !capData.success || !capData.image) {
            const detail = (capData && (capData.error || capData.message))
                || capText
                || `HTTP ${capRes.status}`;
            window.showToast(`获取验证码失败：${normalizeErrorMessage(detail, `HTTP ${capRes.status}`)}`, 'error');
            return;
        }
        captchaImage = capData.image;
    } catch (e) {
        window.showToast(`获取验证码失败：${normalizeErrorMessage(e && e.message, '请稍后重试')}`, 'error');
        return;
    }

    const answer = await showCaptchaPrompt({
        title: '🔒 兑换验证',
        message: `确定使用 ${coins} 积分兑换 ${planName}（${days}天）？<br>请输入图片中的 4 位数字`,
        image: captchaImage,
        placeholder: '请输入验证码'
    });
    if (answer === null) return;

    const btn = document.querySelector(`.exchange-btn[onclick*="'${planId}'"]`);
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
                days: days,
                captcha_answer: answer
            })
        });

        const { data, responseText } = await readJsonResponse(response);
        if (!response.ok) {
            const detail = (data && (data.error || data.message))
                || responseText
                || `HTTP ${response.status}`;
            throw new Error(normalizeErrorMessage(detail, `HTTP ${response.status}`));
        }
        if (!data || !data.success) {
            throw new Error(normalizeErrorMessage(data && (data.error || data.message), '兑换失败'));
        }

        window.showToast(`兑换成功！订阅已延长 ${days} 天`, 'success');
        loadCheckinStatus();
        if (typeof loadSubscription === 'function') {
            loadSubscription();
        }
    } catch (error) {
        console.error('兑换失败(详细):', error);
        window.showToast(`兑换失败：${normalizeErrorMessage(error && error.message, '请稍后重试')}`, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function loadExchangeRecords(page = 1) {
    try {
        const response = await fetch(`/api/user/exchange/records?page=${page}&per_page=5`);
        const { data } = await readJsonResponse(response);
        if (data && data.success) {
            renderExchangeRecords(data.records);
        }
    } catch (error) {
        console.error('加载兑换记录失败:', error);
    }
}

function renderExchangeRecords(records) {
    const container = document.getElementById('exchangeRecordsList');
    if (!container) return;

    if (!records || records.length === 0) {
        container.innerHTML = '<div class="no-records">暂无兑换记录</div>';
        return;
    }

    const html = records.map((record) => `
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

function viewAllExchangeRecords() {
    window.showToast('功能开发中', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadCheckinStatus();
    }, 100);
});

