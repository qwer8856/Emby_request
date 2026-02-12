// ==================== 签到系统管理 ====================

let allAvailablePlans = []; // 存储所有可用套餐
let selectedPlanForExchange = null; // 当前选中的套餐
let currentExchangePlans = []; // 当前配置的兑换套餐
let plansConfigCache = {}; // 套餐配置缓存 {id: plan}

// 加载签到配置
async function loadCheckinConfig() {
    try {
        // 先加载套餐配置，用于同步
        await loadPlansConfigForSync();
        
        const response = await fetch('/api/admin/system-config');
        const data = await response.json();
        
        if (data.success && data.config.checkin) {
            const config = data.config.checkin;
            
            // 更新状态标签
            const statusBadge = document.getElementById('checkinStatus');
            if (statusBadge) {
                statusBadge.textContent = config.enabled ? '已开启' : '未开启';
                statusBadge.className = 'status-badge ' + (config.enabled ? 'success' : '');
            }
            
            // 填充表单
            const checkinEnabledElement = document.getElementById('checkinEnabled');
            const checkinBotEnabledElement = document.getElementById('checkinBotEnabled');
            
            if (checkinEnabledElement) {
                checkinEnabledElement.checked = config.enabled || false;
            }
            
            if (checkinBotEnabledElement) {
                checkinBotEnabledElement.checked = config.bot_enabled || false;
            }
            
            // 签到权限
            const checkinPermEl = document.getElementById('checkinPermission');
            if (checkinPermEl) {
                checkinPermEl.value = config.checkin_permission || 'all';
            }
            
            document.getElementById('coinName').value = config.coin_name || '积分';
            document.getElementById('coinMin').value = config.coin_min || 1;
            document.getElementById('coinMax').value = config.coin_max || 10;
            
            // 切换详细配置显示
            toggleCheckinConfig();
            
            // 同步兑换套餐：过滤已删除的套餐，更新天数
            let exchangePlans = config.exchange_plans || [];
            const syncResult = syncExchangePlansWithConfig(exchangePlans);
            currentExchangePlans = syncResult.plans;
            renderExchangePlansAdmin(currentExchangePlans);
            
            // 如果有套餐被移除，自动保存清理后的配置到后端（避免每次打开都提示）
            if (syncResult.changed) {
                try {
                    await fetch('/api/admin/system-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            checkin: {
                                enabled: config.enabled || false,
                                bot_enabled: config.bot_enabled || false,
                                checkin_permission: config.checkin_permission || 'all',
                                coin_name: config.coin_name || '积分',
                                coin_min: config.coin_min || 1,
                                coin_max: config.coin_max || 10,
                                exchange_plans: currentExchangePlans
                            }
                        })
                    });
                    console.log('已自动清理失效的兑换套餐配置');
                } catch (e) {
                    console.error('自动清理兑换套餐失败:', e);
                }
            }
        }
    } catch (error) {
        console.error('加载签到配置失败:', error);
        window.showToast && window.showToast('错误', '加载签到配置失败', 'error');
    }
}

// 加载套餐配置用于同步
async function loadPlansConfigForSync() {
    try {
        const response = await fetch('/api/admin/plans-config');
        const data = await response.json();
        if (data.success) {
            plansConfigCache = {};
            (data.plans || []).forEach(plan => {
                plansConfigCache[plan.id] = plan;
            });
        }
    } catch (error) {
        console.error('加载套餐配置失败:', error);
    }
}

// 同步兑换套餐与套餐配置
function syncExchangePlansWithConfig(exchangePlans) {
    const synced = [];
    let hasChanges = false;
    
    for (const ep of exchangePlans) {
        const planConfig = plansConfigCache[ep.id];
        if (!planConfig) {
            // 套餐已被删除，跳过
            hasChanges = true;
            continue;
        }
        
        // 从套餐配置中获取正确的天数
        const correctDays = planConfig.duration_days || (planConfig.duration || 1) * 30;
        
        synced.push({
            id: ep.id,
            name: planConfig.name || ep.name, // 使用最新的套餐名称
            days: correctDays,
            coins: ep.coins
        });
    }
    
    if (hasChanges) {
        window.showToast && window.showToast('提示', '部分套餐已被删除，已自动从兑换列表移除并保存', 'info');
    }
    
    return { plans: synced, changed: hasChanges };
}

// 切换签到配置详情显示
function toggleCheckinConfig() {
    const enabled = document.getElementById('checkinEnabled').checked;
    const details = document.getElementById('checkinConfigDetails');
    if (details) {
        details.style.display = enabled ? 'block' : 'none';
    }
}

// 渲染兑换套餐列表（管理员端）
function renderExchangePlansAdmin(plans) {
    const container = document.getElementById('exchangePlansContainer');
    if (!container) return;
    
    // 更新全局变量
    currentExchangePlans = plans || [];
    
    container.innerHTML = '';
    
    if (currentExchangePlans.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无配置，点击添加</div></div>';
        return;
    }
    
    currentExchangePlans.forEach((plan, index) => {
        // 从套餐配置缓存中获取最新信息
        const planConfig = plansConfigCache[plan.id];
        const displayDays = planConfig 
            ? (planConfig.duration_days || (planConfig.duration || 1) * 30)
            : plan.days;
        const displayName = planConfig ? planConfig.name : plan.name;
        const isDeleted = !planConfig;
        
        const planItem = document.createElement('div');
        planItem.className = 'exchange-plan-item' + (isDeleted ? ' deleted' : '');
        planItem.innerHTML = `
            <div class="plan-item-content">
                <div class="plan-item-info">
                    <div class="plan-item-name">
                        ${displayName || '未命名套餐'}
                        ${isDeleted ? '<span style="color: #f56565; font-size: 11px; margin-left: 4px;">（已删除）</span>' : ''}
                    </div>
                    <div class="plan-item-details">
                        <div class="plan-item-detail">
                            <span>📅</span>
                            <span>${displayDays} 天</span>
                        </div>
                        <div class="plan-item-detail">
                            <span>🪙</span>
                            <span>${plan.coins || 0} 积分</span>
                        </div>
                        <div class="plan-item-detail" style="color: #a0aec0;">
                            <span>ID: ${plan.id || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="plan-item-actions">
                    <button class="btn-danger btn-sm" onclick="removeExchangePlan(${index})" title="删除">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `;
        container.appendChild(planItem);
    });
}

// 打开套餐选择模态弹窗
async function openPlanSelectModal() {
    try {
        // 加载可用套餐列表
        const response = await fetch('/api/admin/plans-config');
        const data = await response.json();
        
        if (data.success) {
            allAvailablePlans = data.plans || [];
            
            // 渲染套餐列表
            renderAvailablePlans();
            
            // 显示模态弹窗
            const modal = document.getElementById('planSelectModal');
            if (modal) {
                modal.classList.add('show');
                
                // 重置选择和输入
                selectedPlanForExchange = null;
                document.getElementById('planCoins').value = '';
            }
        } else {
            throw new Error('加载套餐列表失败');
        }
    } catch (error) {
        console.error('打开套餐选择失败:', error);
        window.showToast && window.showToast('错误', '加载套餐列表失败', 'error');
    }
}

// 渲染可用套餐列表
function renderAvailablePlans() {
    const container = document.getElementById('availablePlansList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allAvailablePlans.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无可用套餐<br>请先在「订阅套餐」中创建套餐</div></div>';
        return;
    }
    
    // 获取已配置的套餐ID列表
    const configuredPlanIds = currentExchangePlans.map(p => p.id);
    
    allAvailablePlans.forEach(plan => {
        const isConfigured = configuredPlanIds.includes(plan.id);
        // 优先使用 duration_days，否则用 duration(月) * 30
        const durationDays = plan.duration_days || (plan.duration || 1) * 30;
        
        const planOption = document.createElement('div');
        planOption.className = 'plan-option' + (isConfigured ? ' disabled' : '');
        planOption.onclick = isConfigured ? null : () => selectPlan(plan);
        
        planOption.innerHTML = `
            <input type="radio" name="selectedPlan" value="${plan.id}" ${isConfigured ? 'disabled' : ''}>
            <div class="plan-option-info">
                <div class="plan-option-name">
                    ${plan.name || '未命名套餐'}
                    ${isConfigured ? '<span style="color: #f56565; font-size: 12px; margin-left: 8px;">（已配置）</span>' : ''}
                </div>
                <div class="plan-option-meta">
                    时长: ${durationDays} 天 | 
                    价格: ¥${plan.price || 0} |
                    ID: ${plan.id || 'N/A'}
                </div>
            </div>
        `;
        
        container.appendChild(planOption);
    });
}

// 选择套餐
function selectPlan(plan) {
    selectedPlanForExchange = plan;
    
    // 更新选中状态
    document.querySelectorAll('.plan-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // 选中radio
    const radio = event.currentTarget.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    
    // 自动填充建议积分（套餐价格 * 10）
    const suggestedCoins = Math.max(1, Math.floor((plan.price || 0) * 10));
    document.getElementById('planCoins').value = suggestedCoins;
}

// 关闭套餐选择模态弹窗
function closePlanSelectModal() {
    const modal = document.getElementById('planSelectModal');
    if (modal) {
        modal.classList.remove('show');
    }
    selectedPlanForExchange = null;
}

// 确认添加套餐
function confirmAddPlan() {
    if (!selectedPlanForExchange) {
        window.showToast && window.showToast('提示', '请选择一个套餐', 'warning');
        return;
    }
    
    const coins = parseInt(document.getElementById('planCoins').value);
    if (!coins || coins < 1) {
        window.showToast && window.showToast('提示', '请输入有效的积分数量', 'warning');
        return;
    }
    
    // 优先使用 duration_days（天数），否则用 duration（月数）* 30
    const durationDays = selectedPlanForExchange.duration_days || (selectedPlanForExchange.duration || 1) * 30;
    
    // 添加到配置中
    const exchangePlan = {
        id: selectedPlanForExchange.id,
        name: selectedPlanForExchange.name,
        days: durationDays,
        coins: coins
    };
    
    // 添加到全局配置
    currentExchangePlans.push(exchangePlan);
    
    // 重新渲染
    renderExchangePlansAdmin(currentExchangePlans);
    
    // 关闭模态弹窗
    closePlanSelectModal();
    
    window.showToast && window.showToast('成功', '套餐已添加到兑换列表', 'success');
}

// 删除兑换套餐
async function removeExchangePlan(index) {
    const confirmed = await showConfirm({
        title: '删除套餐',
        message: '确定要删除这个兑换套餐吗？',
        type: 'danger',
        confirmText: '删除',
        cancelText: '取消'
    });
    if (!confirmed) return;
    
    currentExchangePlans.splice(index, 1);
    renderExchangePlansAdmin(currentExchangePlans);
    
    window.showToast && window.showToast('成功', '套餐已删除，请保存配置', 'success');
}

// 收集兑换套餐数据（保存前同步过滤已删除的套餐）
function collectExchangePlans() {
    // 过滤掉已删除的套餐，并更新天数
    const validPlans = [];
    for (const ep of currentExchangePlans) {
        const planConfig = plansConfigCache[ep.id];
        if (planConfig) {
            validPlans.push({
                id: ep.id,
                name: planConfig.name,
                days: planConfig.duration_days || (planConfig.duration || 1) * 30,
                coins: ep.coins
            });
        }
    }
    return validPlans;
}

// 保存签到配置
async function saveCheckinConfig() {
    try {
        // 先刷新套餐配置缓存
        await loadPlansConfigForSync();
        
        const enabled = document.getElementById('checkinEnabled').checked;
        const botEnabled = document.getElementById('checkinBotEnabled').checked;
        const checkinPermission = document.getElementById('checkinPermission')?.value || 'all';
        const coinName = document.getElementById('coinName').value.trim() || '积分';
        const coinMin = parseInt(document.getElementById('coinMin').value) || 1;
        const coinMax = parseInt(document.getElementById('coinMax').value) || 10;
        
        // 验证
        if (coinMin > coinMax) {
            window.showToast && window.showToast('错误', '最少积分不能大于最多积分', 'error');
            return;
        }
        
        if (coinMin < 1 || coinMax > 100) {
            window.showToast && window.showToast('错误', '积分范围应在 1-100 之间', 'error');
            return;
        }
        
        // 收集兑换套餐
        const exchangePlans = collectExchangePlans();
        
        if (enabled && exchangePlans.length === 0) {
            const confirmed = await showConfirm({
                title: '未配置套餐',
                message: '您还没有配置兑换套餐，用户将无法兑换。确定要继续吗？',
                type: 'warning',
                confirmText: '继续保存',
                cancelText: '返回配置'
            });
            if (!confirmed) {
                return;
            }
        }
        
        // 准备配置数据
        const configData = {
            checkin: {
                enabled,
                bot_enabled: botEnabled,
                checkin_permission: checkinPermission,
                coin_name: coinName,
                coin_min: coinMin,
                coin_max: coinMax,
                exchange_plans: exchangePlans
            }
        };
        
        // 发送保存请求
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.showToast && window.showToast('成功', '签到配置已保存', 'success');
            // 延迟一下再重新加载配置，确保服务器已保存
            setTimeout(() => {
                loadCheckinConfig();
            }, 500);
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存签到配置失败:', error);
        window.showToast && window.showToast('错误', '保存签到配置失败: ' + error.message, 'error');
    }
}

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 在设置页面加载签到配置
        if (document.getElementById('checkinEnabled')) {
            loadCheckinConfig();
        }
    });
} else {
    // DOM已加载
    if (document.getElementById('checkinEnabled')) {
        loadCheckinConfig();
    }
}

// 点击模态弹窗外部关闭
window.addEventListener('click', (event) => {
    const modal = document.getElementById('planSelectModal');
    if (modal && event.target === modal) {
        closePlanSelectModal();
    }
});
