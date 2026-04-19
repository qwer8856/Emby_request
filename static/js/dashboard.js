// ==================== Toast 提示兼容函数 ====================
// 兼容 common.js 的 showToast(title, message, type) 格式
// 当只传入 (message, type) 时，使用消息内容作为标题
const originalShowToast = window.showToast;
window.showToast = function(arg1, arg2, arg3) {
    if (arg3 !== undefined) {
        // 三个参数：showToast(title, message, type)
        return originalShowToast(arg1, arg2, arg3);
    } else if (arg2 !== undefined && ['success', 'error', 'warning', 'info'].includes(arg2)) {
        // 两个参数且第二个是类型：showToast(message, type)
        // 直接使用消息内容作为标题，不再使用泛化的"警告"、"提示"等
        return originalShowToast(arg1, '', arg2);
    } else {
        // 其他情况：showToast(title, message)
        return originalShowToast(arg1, arg2, 'info');
    }
};

// ==================== Emby 账号绑定/创建功能 ====================
let usernameCheckTimer = null;

async function readResponseData(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (e) {
        return {
            success: false,
            error: text.slice(0, 200) || `HTTP ${response.status}`
        };
    }
}

// 检查是否需要绑定 Emby 账号
async function checkEmbyBindStatus() {
    try {
        const response = await fetch('/api/emby/check-bindable');
        const data = await parseResponseData(response);
        
        if (data.success && !data.has_emby_account) {
            // 用户没有 Emby 账号，显示引导弹窗
            showEmbyGuideDialog(data.can_create);
        }
    } catch (error) {
        console.error('检查 Emby 绑定状态失败:', error);
    }
}

// 显示 Emby 账号引导弹窗
function showEmbyGuideDialog(canCreate) {
    const overlay = document.getElementById('embyGuideOverlay');
    if (!overlay) return;
    // 根据是否可创建来控制创建按钮状态
    const createBtn = document.getElementById('guideCreateBtn');
    const createHint = document.getElementById('guideCreateHint');
    if (createBtn) {
        if (canCreate) {
            createBtn.classList.remove('guide-btn-disabled');
            createBtn.onclick = function() { closeEmbyGuideDialog(); showEmbyCreateDialog(); };
        } else {
            createBtn.classList.add('guide-btn-disabled');
            createBtn.onclick = function() { showToast('您没有有效订阅，暂时无法创建新账号', 'warning'); };
        }
    }
    if (createHint) {
        createHint.style.display = canCreate ? 'none' : 'block';
    }
    overlay.style.display = 'flex';
}

// 关闭引导弹窗
function closeEmbyGuideDialog() {
    const overlay = document.getElementById('embyGuideOverlay');
    if (overlay) overlay.style.display = 'none';
}

// 从引导弹窗跳转到绑定
function guideToEmbyBind() {
    closeEmbyGuideDialog();
    showEmbyBindDialog();
}

// 从引导弹窗跳转到创建
function guideToEmbyCreate() {
    closeEmbyGuideDialog();
    showEmbyCreateDialog();
}

// 显示 Emby 账号绑定弹窗（仅绑定）
function showEmbyBindDialog() {
    const overlay = document.getElementById('embyBindOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // 清空表单
        document.getElementById('bindUsername').value = '';
        document.getElementById('bindPassword').value = '';
        document.getElementById('bindError').textContent = '';
    }
}

// 关闭 Emby 账号绑定弹窗
function closeEmbyBindDialog() {
    const overlay = document.getElementById('embyBindOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 显示 Emby 账号创建弹窗（带订阅检查）
async function showEmbyCreateDialog() {
    try {
        // 先检查是否有有效订阅
        const response = await fetch('/api/emby/check-bindable');
        const data = await parseResponseData(response);
        
        // 使用 can_create 检查是否可以新建账号
        if (data.success && !data.can_create) {
            // 没有有效订阅，提示用户
            showToast('您没有有效订阅，无法创建Emby账号', 'error');
            return;
        }
        
        // 显示创建弹窗
        const overlay = document.getElementById('embyCreateOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // 清空表单
            const createUsername = document.getElementById('createUsername');
            const createPassword = document.getElementById('createPassword');
            const createPasswordConfirm = document.getElementById('createPasswordConfirm');
            const createError = document.getElementById('createError');
            const usernameStatus = document.getElementById('usernameStatus');
            if (createUsername) createUsername.value = '';
            if (createPassword) createPassword.value = '';
            if (createPasswordConfirm) createPasswordConfirm.value = '';
            if (createError) createError.textContent = '';
            if (usernameStatus) usernameStatus.textContent = '';
        }
    } catch (error) {
        console.error('检查订阅状态失败:', error);
        showToast('检查订阅状态失败，请稍后重试', 'error');
    }
}

// 直接显示创建弹窗（不检查订阅，内部使用）
function showEmbyCreateDialogDirect() {
    const overlay = document.getElementById('embyCreateOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const createUsername = document.getElementById('createUsername');
        const createPassword = document.getElementById('createPassword');
        const createPasswordConfirm = document.getElementById('createPasswordConfirm');
        const createError = document.getElementById('createError');
        const usernameStatus = document.getElementById('usernameStatus');
        if (createUsername) createUsername.value = '';
        if (createPassword) createPassword.value = '';
        if (createPasswordConfirm) createPasswordConfirm.value = '';
        if (createError) createError.textContent = '';
        if (usernameStatus) usernameStatus.textContent = '';
    }
}

// 关闭 Emby 账号创建弹窗
function closeEmbyCreateDialog() {
    const overlay = document.getElementById('embyCreateOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 切换选项卡（保留兼容性，但现在不需要了）
function switchEmbyTab(tab) {
    // 此函数已弃用，绑定和创建弹窗已分离
    if (tab === 'create') {
        closeEmbyBindDialog();
        showEmbyCreateDialogDirect();
    } else {
        closeEmbyCreateDialog();
        showEmbyBindDialog();
    }
}

// 检查用户名是否可用
function checkEmbyUsername() {
    const username = document.getElementById('createUsername').value.trim();
    const statusEl = document.getElementById('usernameStatus');
    
    if (!username || username.length < 3) {
        statusEl.textContent = '';
        statusEl.className = 'username-status';
        return;
    }
    
    // 防抖
    clearTimeout(usernameCheckTimer);
    statusEl.textContent = '检查中...';
    statusEl.className = 'username-status checking';
    
    usernameCheckTimer = setTimeout(async () => {
        try {
            const response = await fetch('/api/emby/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await parseResponseData(response);
            
            if (data.success) {
                if (data.available) {
                    statusEl.textContent = '✓ 用户名可用';
                    statusEl.className = 'username-status available';
                } else {
                    statusEl.textContent = '✗ ' + data.message;
                    statusEl.className = 'username-status unavailable';
                }
            } else {
                statusEl.textContent = '检查失败';
                statusEl.className = 'username-status unavailable';
            }
        } catch (error) {
            statusEl.textContent = '网络错误';
            statusEl.className = 'username-status unavailable';
        }
    }, 500);
}

// 提交绑定现有账号
async function submitEmbyBind(event) {
    event.preventDefault();
    
    const username = document.getElementById('bindUsername').value.trim();
    const password = document.getElementById('bindPassword').value;
    const errorEl = document.getElementById('bindError');
    const btn = document.getElementById('bindSubmitBtn');
    
    if (!username) {
        errorEl.textContent = '请输入用户名';
        return;
    }
    
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '验证中...';
    
    try {
        const response = await fetch('/api/emby/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await readResponseData(response);
        
        // 检查是否需要重新登录
        if (data.need_login) {
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }
        
        if (!response.ok) {
            errorEl.textContent = data.error || `绑定失败（HTTP ${response.status}）`;
            btn.disabled = false;
            btn.textContent = '验证并绑定';
            return;
        }
        
        if (data.success) {
            showToast('Emby 账号绑定成功！', 'success');
            closeEmbyBindDialog();
            // 刷新页面更新用户信息
            setTimeout(() => location.reload(), 1500);
        } else {
            errorEl.textContent = data.error || '绑定失败';
            btn.disabled = false;
            btn.textContent = '验证并绑定';
        }
    } catch (error) {
        errorEl.textContent = `网络错误，请稍后重试${error?.message ? `：${error.message}` : ''}`;
        btn.disabled = false;
        btn.textContent = '验证并绑定';
    }
}

// 提交创建新账号
async function submitEmbyCreate(event) {
    event.preventDefault();
    
    const username = document.getElementById('createUsername').value.trim();
    const password = document.getElementById('createPassword').value;
    const passwordConfirm = document.getElementById('createPasswordConfirm').value;
    const errorEl = document.getElementById('createError');
    const btn = document.getElementById('createSubmitBtn');
    
    // 验证
    if (!username) {
        errorEl.textContent = '请填写用户名';
        return;
    }
    
    if (username.length < 1 || username.length > 20) {
        errorEl.textContent = '用户名长度必须在1-20个字符之间';
        return;
    }
    
    if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
        errorEl.textContent = '用户名只能包含中文、字母、数字、下划线';
        return;
    }
    
    if (password !== passwordConfirm) {
        errorEl.textContent = '两次输入的密码不一致';
        return;
    }
    
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '创建中...';
    
    try {
        const response = await fetch('/api/emby/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await readResponseData(response);
        
        // 检查是否需要重新登录
        if (data.need_login) {
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }
        
        if (!response.ok) {
            errorEl.textContent = data.error || `创建失败（HTTP ${response.status}）`;
            btn.disabled = false;
            btn.textContent = '创建账号';
            return;
        }
        
        if (data.success) {
            showToast('Emby 账号创建成功！', 'success');
            closeEmbyBindDialog();
            // 刷新页面更新用户信息
            setTimeout(() => location.reload(), 1500);
        } else {
            errorEl.textContent = data.error || '创建失败';
            btn.disabled = false;
            btn.textContent = '创建账号';
        }
    } catch (error) {
        errorEl.textContent = `网络错误，请稍后重试${error?.message ? `：${error.message}` : ''}`;
        btn.disabled = false;
        btn.textContent = '创建账号';
    }
}

// 手动打开 Emby 账号设置弹窗（绑定）
function openEmbyAccountSettings() {
    showEmbyBindDialog();
}

// ==================== Emby 账号解绑功能 ====================
// 显示解绑确认弹窗
function showUnbindEmbyDialog() {
    const overlay = document.getElementById('unbindEmbyOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // 清空表单
        document.getElementById('unbindPassword').value = '';
        document.getElementById('unbindError').textContent = '';
    }
}

// 关闭解绑确认弹窗
function closeUnbindEmbyDialog() {
    const overlay = document.getElementById('unbindEmbyOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 提交解绑请求
async function submitEmbyUnbind(event) {
    event.preventDefault();
    
    const password = document.getElementById('unbindPassword').value;
    const errorEl = document.getElementById('unbindError');
    const btn = document.getElementById('unbindSubmitBtn');
    
    if (!password) {
        errorEl.textContent = '请输入密码';
        return;
    }
    
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '解绑中...';
    
    try {
        const response = await fetch('/api/emby/unbind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await parseResponseData(response);
        
        if (data.success) {
            showToast('Emby 账号解绑成功！', 'success');
            closeUnbindEmbyDialog();
            // 刷新页面更新用户信息
            setTimeout(() => location.reload(), 1500);
        } else {
            errorEl.textContent = data.error || '解绑失败';
            btn.disabled = false;
            btn.textContent = '确认解绑';
        }
    } catch (error) {
        errorEl.textContent = '网络错误，请稍后重试';
        btn.disabled = false;
        btn.textContent = '确认解绑';
    }
}

// ==================== Telegram 绑定功能 ====================
let currentBindCode = null;
// 邮箱绑定 - 跳转到个人信息邮箱绑定卡片
function goToEmailBind() {
    switchSection('profile');
    // 等页面切换完成后滚动到邮箱绑定卡片
    setTimeout(() => {
        const emailCard = document.querySelector('#section-profile .feature-card-v2 .feature-title-v2');
        // 找到“绑定邮箱”卡片
        const cards = document.querySelectorAll('#section-profile .feature-card-v2');
        for (const card of cards) {
            const title = card.querySelector('.feature-title-v2');
            if (title && title.textContent.includes('绑定邮箱')) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 高亮闪烁一下
                card.style.transition = 'box-shadow 0.3s ease';
                card.style.boxShadow = '0 0 0 2px #8b5cf6, 0 4px 20px rgba(139, 92, 246, 0.3)';
                setTimeout(() => { card.style.boxShadow = ''; }, 2000);
                break;
            }
        }
    }, 300);
}

// 更新邮箱绑定侧边栏状态
function updateEmailBindSidebar(isBound) {
    const sidebar = document.getElementById('emailBindSidebar');
    if (!sidebar) return;
    const textEl = document.getElementById('emailBindText');
    const badgeEl = document.getElementById('emailBindBadge');
    
    if (isBound === undefined) {
        // 从初始渲染状态判断
        isBound = badgeEl && badgeEl.textContent.trim() === '已绑定';
    }
    
    if (isBound) {
        sidebar.classList.add('bound');
        if (textEl) textEl.textContent = '邮箱已绑定';
        if (badgeEl) badgeEl.textContent = '已绑定';
    } else {
        sidebar.classList.remove('bound');
        if (textEl) textEl.textContent = '绑定邮箱';
        if (badgeEl) badgeEl.textContent = '未绑定';
    }
}

let bindCodeExpireTimer = null;
let bindStatusCheckTimer = null;
let forceBindCheckTimer = null;
let forceBindExpireTimer = null;

// ====== 强制绑定 Telegram 逻辑 ======
function initForceBindTelegram() {
    const overlay = document.getElementById('forceBindTgOverlay');
    if (!overlay) return; // 模板没有渲染此块，说明不需要强制绑定
    
    // 生成绑定码
    generateForceBindCode(false);
    // 每 3 秒轮询绑定状态
    forceBindCheckTimer = setInterval(async () => {
        try {
            const resp = await fetch('/api/user/telegram');
            const data = await parseResponseData(resp);
            if (data.success && data.is_bound) {
                // 绑定成功，移除遮罩
                clearInterval(forceBindCheckTimer);
                if (forceBindExpireTimer) clearInterval(forceBindExpireTimer);
                overlay.style.display = 'none';
                showToast('🎉 Telegram 绑定成功！', 'success');
                loadTelegramBindStatus();
            }
        } catch (e) { /* ignore */ }
    }, 3000);
}

async function generateForceBindCode(forceRegenerate) {
    const codeEl = document.getElementById('forceBindCode');
    const instrEl = document.getElementById('forceBindInstruction');
    const botLinkEl = document.getElementById('forceBindBotLink');
    const botNameEl = document.getElementById('forceBindBotName');
    const expireEl = document.getElementById('forceBindExpire');
    
    if (codeEl) codeEl.textContent = '生成中...';
    
    try {
        const resp = await fetch('/api/user/telegram/bindcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_regenerate: !!forceRegenerate })
        });
        const data = await parseResponseData(resp);
        if (data.success) {
            if (codeEl) codeEl.textContent = data.bind_code;
            if (instrEl) instrEl.textContent = '/bind ' + data.bind_code;
            if (data.bot_username) {
                if (botLinkEl) botLinkEl.href = 'https://t.me/' + data.bot_username;
                if (botNameEl) botNameEl.textContent = '@' + data.bot_username;
            }
            // 倒计时
            if (forceBindExpireTimer) clearInterval(forceBindExpireTimer);
            let remaining = data.expires_in || 300;
            const updateExpire = () => {
                if (remaining <= 0) {
                    if (expireEl) expireEl.textContent = '已过期，请点击 🔄 重新生成';
                    clearInterval(forceBindExpireTimer);
                    return;
                }
                const m = Math.floor(remaining / 60);
                const s = remaining % 60;
                if (expireEl) expireEl.textContent = `${m}:${s.toString().padStart(2, '0')} 后过期`;
                remaining--;
            };
            updateExpire();
            forceBindExpireTimer = setInterval(updateExpire, 1000);
        } else {
            if (codeEl) codeEl.textContent = '生成失败';
        }
    } catch (e) {
        if (codeEl) codeEl.textContent = '网络错误';
    }
}

function copyForceBindCommand(event) {
    const instrEl = document.getElementById('forceBindInstruction');
    if (instrEl) {
        navigator.clipboard.writeText(instrEl.textContent).then(() => {
            const btn = event.currentTarget;
            const orig = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => btn.textContent = orig, 1500);
        });
    }
}

// 加载 Telegram 绑定状态
async function loadTelegramBindStatus() {
    try {
        const response = await fetch('/api/user/telegram');
        const data = await parseResponseData(response);
        
        const sidebar = document.getElementById('telegramBindSidebar');
        const textEl = document.getElementById('telegramBindText');
        const badgeEl = document.getElementById('telegramBindBadge');
        
        if (!sidebar || !textEl) return;
        
        if (data.success && data.is_bound) {
            // 已绑定状态
            sidebar.classList.add('bound');
            textEl.textContent = 'Telegram 已绑定';
            if (badgeEl) badgeEl.textContent = '已绑定';
            sidebar.onclick = unbindTelegramId;
        } else {
            // 未绑定状态
            sidebar.classList.remove('bound');
            textEl.textContent = '绑定 Telegram';
            if (badgeEl) badgeEl.textContent = '未绑定';
            sidebar.onclick = showTelegramBindDialog;
        }
    } catch (error) {
        console.error('加载 Telegram 绑定状态失败:', error);
    }
}

// 显示 Telegram 绑定弹窗
async function showTelegramBindDialog() {
    const overlay = document.getElementById('telegramBindOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // 生成绑定码
        await generateBindCode();
        // 开始轮询检查绑定状态
        startBindStatusCheck();
    }
}

// 关闭 Telegram 绑定弹窗
function closeTelegramBindDialog() {
    const overlay = document.getElementById('telegramBindOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    // 清除定时器
    if (bindCodeExpireTimer) {
        clearInterval(bindCodeExpireTimer);
        bindCodeExpireTimer = null;
    }
    // 清除绑定状态检查定时器
    if (bindStatusCheckTimer) {
        clearInterval(bindStatusCheckTimer);
        bindStatusCheckTimer = null;
    }
}

// 开始轮询检查绑定状态
function startBindStatusCheck() {
    // 清除之前的定时器
    if (bindStatusCheckTimer) {
        clearInterval(bindStatusCheckTimer);
    }
    
    // 每 3 秒检查一次绑定状态
    bindStatusCheckTimer = setInterval(async () => {
        try {
            const response = await fetch('/api/user/telegram');
            const data = await parseResponseData(response);
            
            if (data.success && data.is_bound) {
                // 绑定成功！
                clearInterval(bindStatusCheckTimer);
                bindStatusCheckTimer = null;
                
                // 关闭弹窗
                closeTelegramBindDialog();
                
                // 显示成功提示
                showToast('🎉 Telegram 绑定成功！', 'success');
                
                // 更新侧边栏状态
                loadTelegramBindStatus();
            }
        } catch (error) {
            console.error('检查绑定状态失败:', error);
        }
    }, 3000);
}

// 生成绑定码
async function generateBindCode(forceRegenerate = false) {
    const codeEl = document.getElementById('telegramBindCode');
    const instructionEl = document.getElementById('telegramBindInstruction');
    const botLinkEl = document.getElementById('telegramBotLink');
    const expireEl = document.getElementById('telegramBindExpire');
    const refreshBtn = document.getElementById('refreshBindCodeBtn');
    
    if (codeEl) codeEl.textContent = '生成中...';
    if (expireEl) expireEl.textContent = '';
    if (refreshBtn) refreshBtn.disabled = true;
    
    try {
        const response = await fetch('/api/user/telegram/bindcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_regenerate: forceRegenerate })
        });
        
        const data = await parseResponseData(response);
        
        if (data.success) {
            currentBindCode = data.bind_code;
            if (codeEl) codeEl.textContent = data.bind_code;
            
            // 设置 Bot 链接
            if (botLinkEl && data.bot_username) {
                botLinkEl.href = `https://t.me/${data.bot_username}`;
                // 只更新 bot-name 部分，保留图标和箭头
                const botNameEl = botLinkEl.querySelector('.bot-name');
                if (botNameEl) {
                    botNameEl.textContent = `@${data.bot_username}`;
                }
            }
            
            // 设置指令提示
            if (instructionEl) {
                instructionEl.textContent = `/bind ${data.bind_code}`;
            }
            
            // 倒计时
            let expiresIn = data.expires_in || 300;
            updateExpireCountdown(expiresIn);
            
            if (bindCodeExpireTimer) clearInterval(bindCodeExpireTimer);
            bindCodeExpireTimer = setInterval(() => {
                expiresIn--;
                if (expiresIn <= 0) {
                    clearInterval(bindCodeExpireTimer);
                    if (codeEl) codeEl.textContent = '已过期';
                    if (expireEl) expireEl.textContent = '请点击刷新获取新绑定码';
                    if (refreshBtn) refreshBtn.disabled = false;
                } else {
                    updateExpireCountdown(expiresIn);
                }
            }, 1000);
            
            if (refreshBtn) refreshBtn.disabled = false;
        } else {
            if (codeEl) codeEl.textContent = '生成失败';
            if (expireEl) expireEl.textContent = data.error || '请稍后重试';
            if (refreshBtn) refreshBtn.disabled = false;
        }
    } catch (error) {
        console.error('生成绑定码失败:', error);
        if (codeEl) codeEl.textContent = '生成失败';
        if (expireEl) expireEl.textContent = '网络错误，请稍后重试';
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

// 更新过期倒计时
function updateExpireCountdown(seconds) {
    const expireEl = document.getElementById('telegramBindExpire');
    if (expireEl) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        expireEl.textContent = `有效期: ${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// 复制绑定指令
function copyBindCommand(event) {
    // 阻止事件冒泡
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const instructionEl = document.getElementById('telegramBindInstruction');
    if (instructionEl && currentBindCode) {
        const command = `/bind ${currentBindCode}`;
        
        // 优先使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(command).then(() => {
                showToast('复制成功', '绑定指令已复制到剪贴板', 'success');
            }).catch(() => {
                // 降级使用 execCommand
                fallbackCopyText(command);
            });
        } else {
            // 不支持 Clipboard API，使用降级方案
            fallbackCopyText(command);
        }
    } else {
        showToast('提示', '绑定码未生成，请稍后重试', 'warning');
    }
}

// 降级复制方法（使用 execCommand）
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // 避免在页面上显示
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('复制成功', '绑定指令已复制到剪贴板', 'success');
        } else {
            showToast('复制失败', '请手动复制绑定指令', 'error');
        }
    } catch (err) {
        showToast('复制失败', '请手动复制绑定指令', 'error');
    }
    
    document.body.removeChild(textArea);
}

// 重新生成绑定码（点击刷新按钮）
async function regenerateBindCode() {
    const refreshBtn = document.getElementById('refreshBindCodeBtn');
    const codeEl = document.getElementById('telegramBindCode');
    const expireEl = document.getElementById('telegramBindExpire');
    
    // 显示加载状态
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.style.animation = 'spin 0.5s ease-in-out';
    }
    if (codeEl) codeEl.textContent = '重新生成中...';
    if (expireEl) expireEl.textContent = '';
    
    // 清除旧的倒计时定时器
    if (bindCodeExpireTimer) {
        clearInterval(bindCodeExpireTimer);
        bindCodeExpireTimer = null;
    }
    
    // 延迟一下，让动画效果更明显
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 调用生成绑定码函数，传入 true 强制重新生成
    await generateBindCode(true);
    
    // 恢复按钮状态
    if (refreshBtn) {
        refreshBtn.style.animation = '';
    }
    
    showToast('重新生成', '已生成新的绑定码，旧绑定码已失效', 'success');
}

// 解绑 Telegram ID
async function unbindTelegramId() {
    const confirmed = await showConfirm({
        title: '解绑 Telegram',
        message: '确定要解绑 Telegram 吗？\n\n解绑后您将无法接收以下通知：\n• 求片状态更新\n• 订阅到期提醒\n• 系统公告推送',
        confirmText: '确认解绑',
        cancelText: '取消',
        type: 'warning'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/user/telegram/unbind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await parseResponseData(response);
        
        if (data.success) {
            showToast('Telegram 解绑成功', 'success');
            loadTelegramBindStatus();
        } else {
            showToast(data.error || '解绑失败', 'error');
        }
    } catch (error) {
        console.error('解绑 Telegram 失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// ==================== 顶部消息提示 ====================
        function showToast(message, type = 'success') {
            // 移除已存在的 toast
            const existingToast = document.querySelector('.toast-message');
            if (existingToast) existingToast.remove();
            
            const toast = document.createElement('div');
            toast.className = `toast-message toast-${type}`;
            
            // 根据类型选择图标
            let icon = '✓';
            if (type === 'error') icon = '✗';
            else if (type === 'info') icon = 'ℹ';
            else if (type === 'warning') icon = '⚠';
            
            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <span class="toast-text">${message}</span>
            `;
            
            document.body.appendChild(toast);
            
            // 触发动画
            setTimeout(() => toast.classList.add('show'), 10);
            
            // 3秒后自动消失
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // showMessage 作为 showToast 的别名
        function showMessage(message, type = 'info') {
            showToast(message, type);
        }

// ==================== 删除账号功能 ====================
        function showDeleteAccountDialog() {
            // 创建确认弹窗
            const overlay = document.createElement('div');
            overlay.className = 'delete-confirm-overlay';
            overlay.id = 'deleteAccountOverlay';
            overlay.innerHTML = `
                <div class="delete-confirm-dialog">
                    <div class="delete-confirm-icon">⚠️</div>
                    <div class="delete-confirm-title">确认删除账号？</div>
                    <div class="delete-confirm-text">
                        此操作将永久删除您的账号及所有相关数据，包括：<br>
                        • 求片记录<br>
                        • 订阅信息<br>
                        <strong>此操作不可撤销！</strong>
                    </div>
                    <input type="text" class="delete-confirm-input" id="deleteConfirmInput" 
                           placeholder="请输入 确认删除" autocomplete="off">
                    <div class="delete-confirm-buttons">
                        <button class="delete-cancel-btn" onclick="closeDeleteAccountDialog()">取消</button>
                        <button class="delete-confirm-btn" id="deleteConfirmBtn" onclick="confirmDeleteAccount()" disabled>确认删除</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
            
            // 监听输入框
            const input = document.getElementById('deleteConfirmInput');
            const btn = document.getElementById('deleteConfirmBtn');
            input.addEventListener('input', () => {
                btn.disabled = input.value !== '确认删除';
            });
            
            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDeleteAccountDialog();
            });
        }
        
        function closeDeleteAccountDialog() {
            const overlay = document.getElementById('deleteAccountOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
            }
        }
        
        async function confirmDeleteAccount() {
            const input = document.getElementById('deleteConfirmInput');
            if (input.value !== '确认删除') {
                showToast('请输入 确认删除', 'error');
                return;
            }
            
            const btn = document.getElementById('deleteConfirmBtn');
            btn.disabled = true;
            btn.textContent = '删除中...';
            
            try {
                const response = await fetch('/api/account/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showToast('账号已删除，正在跳转...', 'success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                } else {
                    showToast(data.error || '删除失败', 'error');
                    btn.disabled = false;
                    btn.textContent = '确认删除';
                }
            } catch (error) {
                console.error('删除账号错误:', error);
                showToast('网络错误，请稍后重试', 'error');
                btn.disabled = false;
                btn.textContent = '确认删除';
            }
        }

// ==================== 修改密码功能 ====================
        function togglePasswordVisibilityField(inputId, btn) {
            const input = document.getElementById(inputId);
            const eyeIcon = btn.querySelector('.eye-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeIcon.textContent = '🙈';
            } else {
                input.type = 'password';
                eyeIcon.textContent = '👁️';
            }
        }
        
        async function changePassword(event) {
            event.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const btn = document.getElementById('changePasswordBtn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            
            // 验证
            if (!newPassword || !confirmPassword) {
                showToast('请填写新密码和确认密码', 'error');
                return false;
            }
            
            if (newPassword.length < 6) {
                showToast('新密码至少需要6个字符', 'error');
                return false;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('两次输入的新密码不一致', 'error');
                return false;
            }
            
            if (currentPassword && currentPassword === newPassword) {
                showToast('新密码不能与当前密码相同', 'error');
                return false;
            }
            
            // 显示加载状态
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            
            try {
                const response = await fetch('/api/account/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showToast('修改成功', '密码已修改，正在跳转登录页...', 'success');
                    // 清空表单
                    document.getElementById('changePasswordForm').reset();
                    // 密码修改成功后需要重新登录
                    if (data.require_relogin) {
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1500);
                    }
                } else {
                    showToast('修改失败', data.error || '密码修改失败', 'error');
                }
            } catch (error) {
                console.error('修改密码错误:', error);
                showToast('网络错误', '请稍后重试', 'error');
            } finally {
                // 恢复按钮状态
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
            
            return false;
        }

        // 修改 Emby 密码
        async function changeEmbyPassword(event) {
            event.preventDefault();
            
            const currentPassword = document.getElementById('currentEmbyPassword').value;
            const newPassword = document.getElementById('newEmbyPassword').value;
            const confirmPassword = document.getElementById('confirmEmbyPassword').value;
            const btn = document.getElementById('changeEmbyPasswordBtn');
            const btnText = btn.querySelector('.btn-text');
            const btnLoading = btn.querySelector('.btn-loading');
            
            // 验证
            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast('请填写所有密码字段', 'error');
                return false;
            }
            
            if (newPassword.length < 6) {
                showToast('新密码至少需要6个字符', 'error');
                return false;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('两次输入的新密码不一致', 'error');
                return false;
            }
            
            if (currentPassword === newPassword) {
                showToast('新密码不能与当前密码相同', 'error');
                return false;
            }
            
            // 显示加载状态
            btn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            
            try {
                const response = await fetch('/api/account/change-emby-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    if (data.partial) {
                        // 反代受限，密码验证通过但 Emby 端未修改
                        showToast('部分成功', data.message || '本地密码已更新，Emby 端需联系管理员', 'warning');
                    } else {
                        showToast('修改成功', 'Emby 密码已修改', 'success');
                    }
                    // 清空表单
                    document.getElementById('changeEmbyPasswordForm').reset();
                } else {
                    showToast('修改失败', data.error || 'Emby 密码修改失败', 'error');
                }
            } catch (error) {
                console.error('修改 Emby 密码错误:', error);
                showToast('网络错误', '请稍后重试', 'error');
            } finally {
                // 恢复按钮状态
                btn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
            
            return false;
        }

// ==================== 左侧边栏导航 ====================
        function setHelpCenterMenuOpen(forceOpen) {
            const menu = document.getElementById('helpCenterMenu');
            if (!menu) return;
            const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !menu.classList.contains('open');
            menu.classList.toggle('open', isOpen);
            menu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        function toggleHelpCenterMenu(event) {
            if (event) event.preventDefault();
            setHelpCenterMenuOpen();
        }

        window.toggleHelpCenterMenu = toggleHelpCenterMenu;

        function switchSection(sectionName, event, updateHash = true) {
            // 阻止默认跳转行为，防止闪屏
            if (event) event.preventDefault();
            
            // 切换前重置仪表盘的敏感信息显示状态（密码和线路）
            if (sectionName !== 'home') {
                // 重置密码显示状态
                passwordVisible = false;
                // 重置所有线路显示状态
                Object.keys(lineVisibility).forEach(key => {
                    lineVisibility[key] = false;
                });
                // 如果有数据，重新渲染以隐藏敏感信息
                if (serverLinesData) {
                    renderServerLines(serverLinesData);
                }
            }
            
            // 隐藏所有section
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // 显示目标section
            const targetSection = document.getElementById(`section-${sectionName}`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // 更新导航项激活状态
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            }

            const isHelpSection = ['docs', 'faq', 'support'].includes(sectionName);
            setHelpCenterMenuOpen(isHelpSection);
            
            // 更新URL hash（记住当前页面）
            if (updateHash) {
                history.replaceState(null, '', `#${sectionName}`);
            }

            currentDashboardSection = sectionName;
            
            // 移动端关闭侧边栏
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
            
            // 离开播放监控页面时停止自动刷新
            if (sectionName !== 'playback') {
                stopPlaybackAutoRefresh();
            }
            
            // 每次点击菜单都重新加载对应模块数据
            switch(sectionName) {
                case 'home':
                    refreshHomeOverview().catch(error => {
                        console.error('刷新首页失败:', error);
                    });
                    break;
                case 'search':
                    refreshSearchOverview().catch(error => {
                        console.error('刷新搜索页失败:', error);
                    });
                    break;
                case 'subscription':
                    loadSubscriptionInfo();
                    break;
                case 'purchase':
                    loadPlans();
                    break;
                case 'trending':
                    loadTrending('movie', 'trendingMovies', 'moviePagination', movieCurrentPage);
                    loadTrending('tv', 'trendingTV', 'tvPagination', tvCurrentPage);
                    trendingLoaded = true;
                    break;
                case 'requests':
                    refreshRequestList();
                    break;
                case 'playback':
                    loadPlaybackData();
                    startPlaybackAutoRefresh();
                    break;
                case 'invite':
                    loadInviteInfo();
                    break;
                case 'faq':
                    loadFAQ();
                    break;
                case 'support':
                    loadMyTickets();
                    break;
                case 'activity-logs':
                    loadMyActivityLogs(1);
                    break;
            }
        }
        
        // 从URL hash恢复页面
        function restoreSectionFromHash() {
            const hash = window.location.hash.slice(1); // 移除 # 号
            
            // 移除预加载样式（防止刷新闪屏用）
            const preloadStyle = document.getElementById('preload-style');
            if (preloadStyle) {
                preloadStyle.remove();
            }
            
            if (hash) {
                const targetSection = document.getElementById(`section-${hash}`);
                if (targetSection) {
                    switchSection(hash, null, false);
                    return true;
                }
            }
            return false;
        }
        
        function toggleMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        }
        
        function closeMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        }
        
        // 更新主页统计数据
        function updateDashboardStats() {
            refreshHomeOverview().catch(error => {
                console.error('刷新首页数据失败:', error);
            });
        }
        
        // 显示邀请对话框
        function showInviteDialog() {
            // 先从后端获取邀请码
            fetch('/api/invite/code')
                .then(response => parseResponseData(response))
                .then(data => {
                    if (data.success) {
                        showInviteModal(data);
                    } else {
                        showMessage(data.error || '获取邀请信息失败', 'error');
                    }
                })
                .catch(err => {
                    console.error('获取邀请码失败:', err);
                    showMessage('获取邀请信息失败，请稍后重试', 'error');
                });
        }
        
        // 显示邀请弹窗
        function showInviteModal(inviteData) {
            // 移除已存在的弹窗
            const existingModal = document.getElementById('inviteModal');
            if (existingModal) existingModal.remove();
            
            const modal = document.createElement('div');
            modal.id = 'inviteModal';
            modal.className = 'invite-modal-overlay';
            modal.innerHTML = `
                <div class="invite-modal">
                    <div class="invite-modal-header">
                        <h3>🎉 邀请好友</h3>
                        <button class="invite-modal-close" onclick="closeInviteModal()">×</button>
                    </div>
                    <div class="invite-modal-body">
                        <div class="invite-stats">
                            <div class="invite-stat-item">
                                <span class="stat-value">${inviteData.total_invites || 0}</span>
                                <span class="stat-label">总邀请</span>
                            </div>
                            <div class="invite-stat-item">
                                <span class="stat-value">${inviteData.successful_invites || 0}</span>
                                <span class="stat-label">成功邀请</span>
                            </div>
                            <div class="invite-stat-item">
                                <span class="stat-value">${inviteData.total_rewards || 0}</span>
                                <span class="stat-label">获得积分</span>
                            </div>
                        </div>
                        <div class="invite-code-section">
                            <label>我的邀请码</label>
                            <div class="invite-code-display">
                                <span id="modalInviteCode">${inviteData.invite_code}</span>
                                <button onclick="copyModalInviteCode()" class="copy-btn">复制</button>
                            </div>
                        </div>
                        <div class="invite-link-section">
                            <label>邀请链接</label>
                            <div class="invite-link-display">
                                <input type="text" id="modalInviteLink" value="${inviteData.invite_url}" readonly>
                                <button onclick="copyModalInviteLink()" class="copy-btn">复制</button>
                            </div>
                        </div>
                        <div class="invite-tips">
                            <p>💡 好友通过您的链接注册成功后，您将获得积分奖励！</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 点击遮罩关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeInviteModal();
            });
        }
        
        // 关闭邀请弹窗
        function closeInviteModal() {
            const modal = document.getElementById('inviteModal');
            if (modal) modal.remove();
        }
        
        // 复制弹窗中的邀请码
        function copyModalInviteCode() {
            const codeEl = document.getElementById('modalInviteCode');
            if (codeEl) {
                doCopy(codeEl.textContent, '邀请码已复制！');
            }
        }
        
        // 复制弹窗中的邀请链接
        function copyModalInviteLink() {
            const linkEl = document.getElementById('modalInviteLink');
            if (linkEl) {
                doCopy(linkEl.value, '邀请链接已复制！');
            }
        }
        
        // 通用复制方法
        function doCopy(text, successMsg) {
            // 尝试使用现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast(successMsg, 'success');
                }).catch(() => {
                    fallbackCopyText(text, successMsg);
                });
            } else {
                fallbackCopyText(text, successMsg);
            }
        }
        
        // 备用复制方法（兼容旧浏览器和非 HTTPS）
        function fallbackCopyText(text, successMsg) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showToast(successMsg, 'success');
                } else {
                    showToast('复制失败，请手动复制', 'error');
                }
            } catch (err) {
                console.error('复制失败:', err);
                // 最后的备选方案：弹出提示框让用户手动复制
                showPrompt({
                    title: '📋 请手动复制',
                    message: '自动复制失败，请手动复制以下内容',
                    defaultValue: text,
                    confirmText: '关闭',
                    type: 'info'
                });
            }
            
            document.body.removeChild(textarea);
        }

        let searchTimeout;
        let currentDashboardSection = 'home';
        let dashboardAutoRefreshTimer = null;
        let dashboardRefreshInFlight = false;
        let dashboardRefreshSyncBound = false;
        let dashboardRefreshUnsubscribe = null;
    let movieCurrentPage = 1;
        let tvCurrentPage = 1;
        let trendingLoaded = false;
        let isSearching = false;
        let requestCurrentPage = 1;
        const requestsPerPage = 5;
        let searchCurrentPage = 1;
        let searchResultsPerPage = 9; // 改为变量，支持动态调整
        let trendingItemsPerPage = 20; // 热门推荐每页项目数
        let downloadProgressTimer = null;
        let allSearchResults = [];
        const dashboardMetaElement = document.getElementById('dashboard-data');
        let dashboardMeta = {};
        if (dashboardMetaElement) {
            try {
                dashboardMeta = JSON.parse(dashboardMetaElement.textContent || '{}');
            } catch (error) {
                console.error('解析 dashboard 元数据失败:', error);
            }
        }
        const requestedMovies = new Set((dashboardMeta.requestedKeys) || []);
        const tmdbImageBase = dashboardMeta.tmdbImageBase || '';

        function shouldAutoRefreshDashboardSection(sectionName = currentDashboardSection) {
            return ['home', 'search', 'subscription', 'purchase', 'trending', 'requests', 'playback', 'invite', 'support', 'activity-logs'].includes(sectionName);
        }

        function setTextIfExists(id, value) {
            const el = document.getElementById(id);
            if (el && value !== undefined && value !== null) {
                el.textContent = value;
            }
        }

        function formatDashboardDate(value) {
            if (!value) return '--';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '--';
            return date.toLocaleDateString('zh-CN');
        }

        function syncRequestedMoviesFromRequests(requests) {
            requestedMovies.clear();
            (requests || []).forEach(req => {
                if (req && req.status !== 'rejected' && req.tmdb_id !== undefined && req.media_type) {
                    requestedMovies.add(`${req.tmdb_id}_${req.media_type}`);
                }
            });
        }

        function updateRequestCounters(data = {}) {
            const todayCount = data.today_count;
            const totalRequests = data.total_requests;
            const dailyLimit = data.daily_limit_text ?? data.daily_limit;

            [
                ['todayCount', todayCount],
                ['homeTodayCount', todayCount],
                ['dashTodayCount', todayCount]
            ].forEach(([id, value]) => setTextIfExists(id, value));

            [
                ['totalRequests', totalRequests],
                ['homeTotalRequests', totalRequests],
                ['subscriptionTotalRequests', totalRequests],
                ['dashTotalRequests', totalRequests]
            ].forEach(([id, value]) => setTextIfExists(id, value));

            [
                ['maxDaily', dailyLimit],
                ['homeMaxDaily', dailyLimit],
                ['subscriptionDailyLimit', dailyLimit],
                ['dashMaxDaily', dailyLimit]
            ].forEach(([id, value]) => setTextIfExists(id, value));

            const remainingText = data.remaining_text ?? data.remaining;
            if (remainingText !== undefined && remainingText !== null) {
                setTextIfExists('requestRemaining', remainingText);
            }
        }

        function applySubscriptionMini(subscriptionData) {
            const mini = document.getElementById('subscriptionMiniStatus');
            const icon = document.getElementById('subscriptionMiniIcon');
            const title = document.getElementById('subscriptionMiniTitle');
            const desc = document.getElementById('subscriptionMiniDesc');
            if (!mini || !icon || !title || !desc) return;

            const sub = subscriptionData && subscriptionData.subscription;
            if (!sub) {
                mini.className = 'status-badge-mini no-sub';
                icon.textContent = '📭';
                title.textContent = '未订阅';
                desc.innerHTML = '<a href="#purchase" onclick="switchSection(\'purchase\')">点击购买套餐</a>';
                return;
            }

            const isWhitelist = !!(sub.is_whitelist || sub.plan_type === 'whitelist');
            const isActive = isWhitelist || sub.status === 'active' || (sub.end_date && new Date(sub.end_date).getTime() > Date.now());

            if (isWhitelist) {
                mini.className = 'status-badge-mini whitelist';
                icon.textContent = '👑';
                title.textContent = '白名单用户';
                desc.textContent = '永久有效 · 无限求片';
                return;
            }

            if (isActive) {
                mini.className = 'status-badge-mini subscriber';
                icon.textContent = '✨';
                title.textContent = '订阅用户';
                desc.textContent = sub.end_date ? `有效期至 ${formatDashboardDate(sub.end_date)}` : '订阅有效';
                return;
            }

            mini.className = 'status-badge-mini no-sub';
            icon.textContent = '📭';
            title.textContent = '未订阅';
            desc.innerHTML = '<a href="#purchase" onclick="switchSection(\'purchase\')">点击购买套餐</a>';
        }

        function applyMyRequestsSnapshot(data, options = {}) {
            const requests = data.requests || [];
            syncRequestedMoviesFromRequests(requests);
            updateRequestCounters(data);

            if (options.markCards !== false) {
                markRequestedCards();
            }

            if (options.redrawSearch && allSearchResults.length > 0) {
                displaySearchPage(searchCurrentPage, false);
            }
        }

        async function fetchMyRequestsSnapshot() {
            const response = await fetch('/api/my-requests', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            checkSessionExpiry(response);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await parseResponseData(response);
            if (!data.success) {
                throw new Error(data.error || '获取求片数据失败');
            }

            return data;
        }

        async function refreshHomeOverview() {
            const [requestsResult, subscriptionResult] = await Promise.allSettled([
                fetchMyRequestsSnapshot(),
                fetch('/api/subscription/current')
            ]);

            if (requestsResult.status === 'fulfilled') {
                applyMyRequestsSnapshot(requestsResult.value, { markCards: true, redrawSearch: false });
            }

            if (subscriptionResult.status === 'fulfilled' && subscriptionResult.value && subscriptionResult.value.ok) {
                const subscriptionData = await parseResponseData(subscriptionResult.value);
                applySubscriptionMini(subscriptionData);
            }
        }

        async function refreshSearchOverview() {
            const requestsData = await fetchMyRequestsSnapshot();
            applyMyRequestsSnapshot(requestsData, {
                markCards: true,
                redrawSearch: false
            });
        }

        async function refreshCurrentDashboardSection(reason = 'auto') {
            if (document.hidden || dashboardRefreshInFlight || !shouldAutoRefreshDashboardSection()) {
                return;
            }

            if (reason === 'interval' && document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            if (currentDashboardSection === 'playback' && reason === 'interval') {
                return;
            }

            dashboardRefreshInFlight = true;
            try {
                switch (currentDashboardSection) {
                    case 'home':
                        await refreshHomeOverview();
                        break;
                    case 'search':
                        await refreshSearchOverview();
                        break;
                    case 'subscription':
                        await loadSubscriptionInfo();
                        break;
                    case 'purchase':
                        await loadPlans();
                        break;
                    case 'trending':
                        await Promise.all([
                            loadTrending('movie', 'trendingMovies', 'moviePagination', movieCurrentPage),
                            loadTrending('tv', 'trendingTV', 'tvPagination', tvCurrentPage)
                        ]);
                        break;
                    case 'requests':
                        await refreshRequestList();
                        break;
                    case 'playback':
                        await loadPlaybackData();
                        break;
                    case 'invite':
                        await loadInviteInfo();
                        break;
                    case 'support':
                        await loadMyTickets();
                        break;
                    case 'activity-logs':
                        await loadMyActivityLogs(myActivityCurrentPage);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('自动刷新前台失败:', error);
            } finally {
                dashboardRefreshInFlight = false;
            }
        }

        function startDashboardAutoRefresh() {
            stopDashboardAutoRefresh();
            dashboardAutoRefreshTimer = setInterval(() => {
                refreshCurrentDashboardSection('interval');
            }, 45000);
        }

        function stopDashboardAutoRefresh() {
            if (dashboardAutoRefreshTimer) {
                clearInterval(dashboardAutoRefreshTimer);
                dashboardAutoRefreshTimer = null;
            }
        }

        function bindDashboardRefreshSync() {
            if (dashboardRefreshSyncBound) return;
            dashboardRefreshSyncBound = true;

            if (typeof onAppRefresh === 'function' && !dashboardRefreshUnsubscribe) {
                dashboardRefreshUnsubscribe = onAppRefresh((payload) => {
                    if (!payload) return;
                    refreshCurrentDashboardSection('broadcast');
                });
            }

            window.addEventListener('focus', () => {
                refreshCurrentDashboardSection('focus');
            });

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    refreshCurrentDashboardSection('visible');
                }
            });
        }
        
        // 更新统计数据
        function updateStats(data = {}) {
            updateRequestCounters(data);
        }

        // 根据屏幕宽度动态设置每页显示数量
        function updateSearchResultsPerPage() {
            if (window.innerWidth <= 480) {
                searchResultsPerPage = 4; // 手机端4个
            } else if (window.innerWidth > 768) {
                searchResultsPerPage = 14; // 桌面端14个
            } else {
                searchResultsPerPage = 9; // 平板端9个
            }
        }
        
        // 根据屏幕宽度动态设置热门推荐每页项目数（两排）
        function updateTrendingItemsPerPage() {
            let columns = 10; // 默认列数
            
            if (window.innerWidth <= 599) {
                columns = 4;
            } else if (window.innerWidth <= 899) {
                columns = 5;
            } else if (window.innerWidth <= 1199) {
                columns = 6;
            } else if (window.innerWidth <= 1399) {
                columns = 7;
            } else if (window.innerWidth <= 1599) {
                columns = 8;
            } else {
                columns = 10;
            }
            
            // 每页显示两排
            trendingItemsPerPage = columns * 2;
        }
        
        // 初始化时设置
        updateSearchResultsPerPage();
        updateTrendingItemsPerPage();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            const oldPerPage = searchResultsPerPage;
            const oldTrendingPerPage = trendingItemsPerPage;
            updateSearchResultsPerPage();
            updateTrendingItemsPerPage();
            
            // 如果每页数量改变，重新显示当前页
            if (oldPerPage !== searchResultsPerPage && allSearchResults.length > 0) {
                displaySearchPage(1); // 重置到第一页
            }
        });
        
        // 公告弹窗函数
        function showAnnouncement() {
            const announcementOverlay = document.getElementById('announcementOverlay');
            if (!announcementOverlay) return; // 如果公告被禁用，直接返回
            
            // 检查是否已经显示过公告（使用sessionStorage，每次会话只显示一次）
            if (!sessionStorage.getItem('announcementShown')) {
                announcementOverlay.classList.add('show');
                sessionStorage.setItem('announcementShown', 'true');
            }
        }
        
        function closeAnnouncement() {
            const announcementOverlay = document.getElementById('announcementOverlay');
            if (announcementOverlay) {
                announcementOverlay.classList.remove('show');
            }
        }
        
        // ==================== 系统公告列表 ====================
        let announcementsCollapsed = false;
        let announcementsData = [];
        let currentAnnouncementIndex = 0;
        let announcementAutoPlayTimer = null;
        
        // 加载系统公告列表
        async function loadSystemAnnouncements() {
            try {
                const response = await fetch('/api/announcements');
                if (!response.ok) return;
                
                const data = await parseResponseData(response);
                announcementsData = data.announcements || [];
                
                const container = document.getElementById('announcementsContainer');
                const list = document.getElementById('announcementsList');
                
                if (!container || !list) return;
                
                if (announcementsData.length === 0) {
                    container.style.display = 'none';
                    return;
                }
                
                // 显示容器
                container.style.display = 'block';
                currentAnnouncementIndex = 0;
                
                // 渲染公告轮播
                renderAnnouncementCarousel();
                
                // 更新指示器
                updateAnnouncementIndicator();
                
                // 如果有多条公告，启动自动轮播
                if (announcementsData.length > 1) {
                    startAnnouncementAutoPlay();
                }
                
            } catch (error) {
                console.error('加载公告失败:', error);
            }
        }
        
        // 渲染公告轮播
        function renderAnnouncementCarousel() {
            const list = document.getElementById('announcementsList');
            if (!list || announcementsData.length === 0) return;
            
            list.innerHTML = announcementsData.map((ann, index) => {
                const typeConfig = {
                    'info': { icon: 'ℹ️', class: 'info' },
                    'warning': { icon: '⚠️', class: 'warning' },
                    'success': { icon: '✅', class: 'success' },
                    'error': { icon: '❌', class: 'error' }
                };
                const config = typeConfig[ann.type] || typeConfig.info;
                const pinnedBadge = ann.is_pinned ? '<span class="pinned-badge">📌 置顶</span>' : '';
                const createdTime = new Date(ann.created_at).toLocaleDateString('zh-CN');
                const activeClass = index === currentAnnouncementIndex ? 'active' : '';
                
                return `
                    <div class="announcement-item announcement-${config.class} ${activeClass}" data-index="${index}">
                        <div class="announcement-item-header">
                            <span class="announcement-icon">${config.icon}</span>
                            <span class="announcement-item-title">${escapeHtml(ann.title)}</span>
                            ${pinnedBadge}
                            <span class="announcement-time">${createdTime}</span>
                        </div>
                        <div class="announcement-item-content">${escapeHtml(ann.content)}</div>
                    </div>
                `;
            }).join('');
        }
        
        // 更新公告指示器
        function updateAnnouncementIndicator() {
            const indicator = document.getElementById('announcementIndicator');
            if (indicator && announcementsData.length > 0) {
                indicator.textContent = `${currentAnnouncementIndex + 1}/${announcementsData.length}`;
            }
        }
        
        // 显示指定索引的公告
        function showAnnouncementByIndex(index) {
            const items = document.querySelectorAll('#announcementsList .announcement-item');
            items.forEach((item, i) => {
                if (i === index) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            updateAnnouncementIndicator();
        }
        
        // 上一条公告
        function prevAnnouncement() {
            if (announcementsData.length <= 1) return;
            currentAnnouncementIndex = (currentAnnouncementIndex - 1 + announcementsData.length) % announcementsData.length;
            showAnnouncementByIndex(currentAnnouncementIndex);
            resetAnnouncementAutoPlay();
        }
        
        // 下一条公告
        function nextAnnouncement() {
            if (announcementsData.length <= 1) return;
            currentAnnouncementIndex = (currentAnnouncementIndex + 1) % announcementsData.length;
            showAnnouncementByIndex(currentAnnouncementIndex);
            resetAnnouncementAutoPlay();
        }
        
        // 启动自动轮播
        function startAnnouncementAutoPlay() {
            stopAnnouncementAutoPlay();
            announcementAutoPlayTimer = setInterval(() => {
                currentAnnouncementIndex = (currentAnnouncementIndex + 1) % announcementsData.length;
                showAnnouncementByIndex(currentAnnouncementIndex);
            }, 5000); // 5秒切换一次
        }
        
        // 停止自动轮播
        function stopAnnouncementAutoPlay() {
            if (announcementAutoPlayTimer) {
                clearInterval(announcementAutoPlayTimer);
                announcementAutoPlayTimer = null;
            }
        }
        
        // 重置自动轮播（用户手动切换后重新计时）
        function resetAnnouncementAutoPlay() {
            if (announcementsData.length > 1) {
                startAnnouncementAutoPlay();
            }
        }
        
        // 切换公告折叠状态
        function toggleAnnouncementsCollapse() {
            const list = document.getElementById('announcementsList');
            const btn = document.getElementById('announcementsToggleBtn');
            
            if (!list || !btn) return;
            
            announcementsCollapsed = !announcementsCollapsed;
            
            if (announcementsCollapsed) {
                list.style.display = 'none';
                btn.textContent = '展开';
                stopAnnouncementAutoPlay();
            } else {
                list.style.display = 'block';
                btn.textContent = '收起';
                if (announcementsData.length > 1) {
                    startAnnouncementAutoPlay();
                }
            }
        }
        
        // 防抖函数
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // 图片懒加载（优化配置）
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                        // 图片加载失败时显示占位符
                        img.onerror = function() {
                            this.style.display = 'none';
                            const placeholder = document.createElement('div');
                            placeholder.className = 'img-error-placeholder';
                            placeholder.innerHTML = '🎬';
                            this.parentNode.insertBefore(placeholder, this);
                        };
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.01
        });
        
        // 懒加载图片
        function lazyLoadImages() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
        
        // 检查是否已求片
        function isRequested(tmdbId, mediaType) {
            return requestedMovies.has(`${tmdbId}_${mediaType}`);
        }
        
        // 添加已求片标记
        function markRequestedCards() {
            document.querySelectorAll('.movie-card').forEach(card => {
                const onclick = card.getAttribute('onclick');
                if (onclick) {
                    const match = onclick.match(/requestMovie\((\d+),\s*'(\w+)'/);
                    if (match) {
                        card.classList.toggle('requested', isRequested(match[1], match[2]));
                    }
                }
            });
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // / 键聚焦搜索框
            if (e.key === '/' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            // ESC 关闭所有弹窗
            if (e.key === 'Escape') {
                closeConfirmDialog();
                document.getElementById('searchInput').blur();
            }
        });
        
        // 标签页切换函数
        function switchTab(tabName) {
            // 移除所有active类
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 添加active类到选中的标签
            if (tabName === 'search') {
                document.querySelector('.tab-button:nth-child(1)').classList.add('active');
                document.getElementById('searchTab').classList.add('active');
            } else if (tabName === 'trending') {
                document.querySelector('.tab-button:nth-child(2)').classList.add('active');
                document.getElementById('trendingTab').classList.add('active');
                
                // 首次切换到热门推荐时加载数据
                if (!trendingLoaded) {
                    loadTrending('movie', 'trendingMovies', 'moviePagination', 1);
                    loadTrending('tv', 'trendingTV', 'tvPagination', 1);
                    trendingLoaded = true;
                }
            }
        }
        
        // 更新问候时间
        function updateGreetingTime() {
            const greetingTime = document.getElementById('greetingTime');
            if (!greetingTime) return;
            
            const now = new Date();
            const hour = now.getHours();
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const weekday = weekdays[now.getDay()];
            const month = now.getMonth() + 1;
            const day = now.getDate();
            
            let greeting = '';
            if (hour >= 5 && hour < 12) {
                greeting = '早上好 ☀️';
            } else if (hour >= 12 && hour < 14) {
                greeting = '中午好 🌤';
            } else if (hour >= 14 && hour < 18) {
                greeting = '下午好 🌅';
            } else if (hour >= 18 && hour < 22) {
                greeting = '晚上好 🌙';
            } else {
                greeting = '夜深了 🌟';
            }
            
            greetingTime.textContent = `${greeting} · ${month}月${day}日 ${weekday}`;
        }
        
        // 页面加载时初始化求片记录分页
        window.addEventListener('DOMContentLoaded', () => {
            // 从URL hash恢复上次访问的页面
            restoreSectionFromHash();
            
            // 默认显示搜索标签
            initRequestPagination();
            
            // 加载线路信息
            loadServerLines();
            
            // 加载 Telegram 绑定状态
            loadTelegramBindStatus();
            
            // 强制绑定 Telegram 检查（如果管理员开启）
            initForceBindTelegram();
            
            // 更新问候时间
            updateGreetingTime();
            
            // 加载系统公告列表
            loadSystemAnnouncements();
            
            // 初始化邮箱绑定侧边栏状态
            updateEmailBindSidebar();
            
            // 检查未读工单消息（显示红点）
            checkUnreadTickets();
            
            // 延迟500ms显示公告弹窗，让页面先加载完成
            setTimeout(() => {
                showAnnouncement();
            }, 500);

            initDownloadProgressWatcher();
            bindDashboardRefreshSync();
            startDashboardAutoRefresh();
        });
        
        // 初始化求片记录分页
        function initRequestPagination() {
            const requestItems = document.querySelectorAll('.request-item');
            const totalItems = requestItems.length;
            
            if (totalItems === 0) return;
            
            const totalPages = Math.ceil(totalItems / requestsPerPage);
            
            // 显示第一页
            showRequestPage(1);
            
            // 创建分页按钮
            updateRequestPagination(totalPages);
        }
        
        // 显示指定页的求片记录
        function showRequestPage(page) {
            const requestItems = document.querySelectorAll('.request-item');
            const startIndex = (page - 1) * requestsPerPage;
            const endIndex = startIndex + requestsPerPage;
            
            requestItems.forEach((item, index) => {
                if (index >= startIndex && index < endIndex) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
            
            requestCurrentPage = page;
        }
        
        // 更新求片记录分页按钮
        function updateRequestPagination(totalPages) {
            const paginationContainer = document.getElementById('requestPagination');
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
            
            let paginationHTML = '';
            paginationHTML += `<button onclick="changeRequestPage(${requestCurrentPage - 1})" ${requestCurrentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `<button class="${i === requestCurrentPage ? 'active' : ''}" onclick="changeRequestPage(${i})">${i}</button>`;
            }
            
            paginationHTML += `<button onclick="changeRequestPage(${requestCurrentPage + 1})" ${requestCurrentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
            
            paginationContainer.innerHTML = paginationHTML;
        }
        
        // 切换求片记录页面
        function changeRequestPage(page) {
            const requestItems = document.querySelectorAll('.request-item');
            const totalItems = requestItems.length;
            const totalPages = Math.ceil(totalItems / requestsPerPage);
            
            if (page < 1 || page > totalPages) return;
            
            showRequestPage(page);
            updateRequestPagination(totalPages);
            
            // 滚动到求片记录区域
            document.getElementById('requestList').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // ==================== 下载进度 (动态轮询优化) ====================
        const downloadPollingIntervals = new Map(); // 存储每个任务的轮询间隔
        
        function initDownloadProgressWatcher() {
            const blocks = document.querySelectorAll('#requestList .download-progress');
            if (!blocks.length) {
                return;
            }
            blocks.forEach(block => {
                const progress = parseFloat(block.dataset.progress || '0');
                const speed = parseInt(block.dataset.speed || '0', 10);
                const eta = parseInt(block.dataset.eta || '-1', 10);
                updateDownloadProgress(block, { progress, download_speed: speed, eta });
                // 初始化每个任务的轮询间隔
                const requestId = block.dataset.requestId;
                if (requestId && !downloadPollingIntervals.has(requestId)) {
                    downloadPollingIntervals.set(requestId, getPollingInterval(progress));
                }
            });
            fetchUserDownloadStatuses();
            if (downloadProgressTimer) {
                clearInterval(downloadProgressTimer);
            }
            // 使用最短的轮询间隔作为定时器间隔
            const minInterval = Math.min(...Array.from(downloadPollingIntervals.values()), 10000);
            downloadProgressTimer = setInterval(fetchUserDownloadStatuses, minInterval);
        }
        
        // 根据下载进度动态计算轮询间隔
        function getPollingInterval(progress) {
            if (progress === 0) return 5000;           // 刚开始: 5秒
            if (progress < 10) return 8000;            // 初始阶段: 8秒
            if (progress < 50) return 10000;           // 中期: 10秒
            if (progress < 90) return 12000;           // 后期: 12秒
            if (progress < 99) return 3000;            // 接近完成: 3秒
            return 15000;                              // 已完成/停滞: 15秒
        }

        function fetchUserDownloadStatuses() {
            const now = Date.now();
            document.querySelectorAll('#requestList .download-progress').forEach(block => {
                // 如果已标记停止轮询，则跳过
                if (block.dataset.stopPolling === 'true') {
                    return;
                }
                const requestId = block.dataset.requestId;
                if (!requestId) return;
                
                // 检查是否到了该任务的轮询时间
                const lastPoll = parseInt(block.dataset.lastPoll || '0');
                const interval = downloadPollingIntervals.get(requestId) || 10000;
                
                if (now - lastPoll >= interval) {
                    block.dataset.lastPoll = now.toString();
                    updateDownloadStatusForRequest(requestId, block);
                }
            });
        }

        async function updateDownloadStatusForRequest(requestId, block) {
            try {
                const response = await fetch(`/api/downloads/${requestId}?_=${Date.now()}`);
                if (!response.ok) {
                    return;
                }
                const data = await parseResponseData(response);
                if (!data.success || !data.task) {
                    return;
                }
                updateDownloadProgress(block, data.task);
                
                // 检查求片状态是否已变为 completed（已入库）
                if (data.request_status === 'completed') {
                    // 更新状态徽章
                    const requestItem = block.closest('.request-item');
                    if (requestItem) {
                        const statusBadge = requestItem.querySelector('.status');
                        if (statusBadge && !statusBadge.classList.contains('completed')) {
                            statusBadge.className = 'status completed';
                            statusBadge.textContent = '已完成';
                        }
                    }
                    // 停止该任务的轮询
                    block.dataset.stopPolling = 'true';
                }
            } catch (error) {
                console.warn('获取下载状态失败', error);
            }
        }

        function updateDownloadProgress(block, task) {
            const fill = block.querySelector('.progress-fill');
            const value = block.querySelector('.progress-value');
            const speed = block.querySelector('.progress-speed');
            const eta = block.querySelector('.progress-eta');
            const progress = Math.min(100, Math.max(0, task.progress || 0));
            
            // 更新进度条
            if (fill) {
                fill.style.width = `${progress.toFixed(1)}%`;
            }
            if (value) {
                value.textContent = `${progress.toFixed(1)}%`;
            }
            if (speed) {
                speed.textContent = formatDownloadSpeed(task.download_speed || 0);
            }
            if (eta) {
                eta.textContent = formatDownloadEta(task.eta);
            }
            
            // 动态更新该任务的轮询间隔
            const requestId = block.dataset.requestId;
            if (requestId) {
                const newInterval = getPollingInterval(progress);
                downloadPollingIntervals.set(requestId, newInterval);
            }
            
            // 完成状态时添加 class（进度条变绿）
            if (progress >= 100) {
                block.classList.add('completed');
            } else {
                block.classList.remove('completed');
            }
        }

        function formatDownloadSpeed(value) {
            if (!value || value <= 0) {
                return '0 B/s';
            }
            const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
            let result = value;
            let index = 0;
            while (result >= 1024 && index < units.length - 1) {
                result /= 1024;
                index += 1;
            }
            return `${result.toFixed(1)} ${units[index]}`;
        }

        function formatDownloadEta(etaSeconds) {
            if (etaSeconds === undefined || etaSeconds === null || etaSeconds < 0) {
                return 'ETA --';
            }
            const hours = Math.floor(etaSeconds / 3600);
            const minutes = Math.floor((etaSeconds % 3600) / 60);
            const seconds = Math.floor(etaSeconds % 60);
            return `ETA ${[hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':')}`;
        }
        
        // 显示搜索结果的指定页
        function displaySearchPage(page, scrollToResults = true) {
            const resultsDiv = document.getElementById('searchResults');
            const paginationDiv = document.getElementById('searchPagination');
            const totalPages = Math.ceil(allSearchResults.length / searchResultsPerPage);
            
            if (page < 1 || page > totalPages) return;
            
            searchCurrentPage = page;
            const startIndex = (page - 1) * searchResultsPerPage;
            const endIndex = startIndex + searchResultsPerPage;
            const pageResults = allSearchResults.slice(startIndex, endIndex);
            
            resultsDiv.innerHTML = pageResults.map(item => {
                const title = (item.title || item.name || '未知影片').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const year = item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : '');
                const poster = item.poster_path ? `${tmdbImageBase}${item.poster_path}` : '';
                const mediaTypeLabel = item.media_type === 'movie' ? '🎬 电影' : '📺 剧集';
                const mediaTypeColor = item.media_type === 'movie' ? '#667eea' : '#764ba2';
                const requestedClass = isRequested(item.id, item.media_type) ? 'requested' : '';
                const rating = item.vote_average ? item.vote_average.toFixed(1) : '';
                
                return `
                    <div class="movie-card ${requestedClass}" style="position: relative;" data-tmdb-id="${item.id}" onclick="requestMovie(${item.id}, '${item.media_type}', '${title}')">
                        ${poster ? `<img data-src="${poster}" alt="${title}">` : '<div class="no-poster">🎬</div>'}
                        <div class="info">
                            <h3 title="${title}">${title}</h3>
                            <p>${year || '未知年份'}</p>
                            ${rating ? `<div class="rating"><span class="star">⭐</span><span class="score">${rating}</span></div>` : ''}
                            <p style="font-size: 10px; color: white; background: ${mediaTypeColor}; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-top: 3px;">${mediaTypeLabel}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            // 启动懒加载
            setTimeout(() => lazyLoadImages(), 100);
            
            // 检查 Emby 库状态（搜索结果可能包含混合类型）
            checkEmbyStatusBatch(pageResults, null, 'searchResults');
            
            // 更新分页按钮
            updateSearchPagination(totalPages);
            
            // 滚动到搜索结果顶部
            if (scrollToResults) {
                resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // 更新搜索结果分页按钮
        function updateSearchPagination(totalPages) {
            const paginationDiv = document.getElementById('searchPagination');
            
            if (totalPages <= 1) {
                paginationDiv.innerHTML = '';
                return;
            }
            
            let paginationHTML = '';
            paginationHTML += `<button onclick="changeSearchPage(${searchCurrentPage - 1})" ${searchCurrentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `<button class="${i === searchCurrentPage ? 'active' : ''}" onclick="changeSearchPage(${i})">${i}</button>`;
            }
            
            paginationHTML += `<button onclick="changeSearchPage(${searchCurrentPage + 1})" ${searchCurrentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
            
            paginationDiv.innerHTML = paginationHTML;
        }
        
        // 切换搜索结果页面
        function changeSearchPage(page) {
            const totalPages = Math.ceil(allSearchResults.length / searchResultsPerPage);
            
            if (page < 1 || page > totalPages) return;
            
            displaySearchPage(page);
        }
        
        // 生成骨架屏 HTML（直接生成卡片，不需要外层容器）
        function generateSkeletonHTML(count) {
            return Array(count).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-poster"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-year"></div>
                        <div class="skeleton-rating"></div>
                        <div class="skeleton-tag"></div>
                    </div>
                </div>
            `).join('');
        }
        
        // 加载热门内容
        async function loadTrending(mediaType, containerId, paginationId, page = 1) {
            const container = document.getElementById(containerId);
            const paginationContainer = document.getElementById(paginationId);
            
            // 显示骨架屏 - 根据当前屏幕计算数量
            updateTrendingItemsPerPage();
            container.innerHTML = generateSkeletonHTML(trendingItemsPerPage);
            
            try {
                const response = await fetch(`/trending?type=${mediaType}&page=${page}`);
                
                // 检查响应状态
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                // 使用 response.text() 避免移动端流消耗问题
                const responseText = await response.text();
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON解析失败:', parseError, '原始文本:', responseText.substring(0, 200));
                    throw new Error('数据格式错误');
                }
                
                if (data.results && data.results.length > 0) {
                    // 后端已按热度排序，根据当前屏幕宽度显示对应数量（两排）
                    const items = data.results.slice(0, trendingItemsPerPage);
                    container.innerHTML = items.map(item => {
                        const title = (item.title || item.name || '未知影片').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        const year = item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : '');
                        const poster = item.poster_path ? `${tmdbImageBase}${item.poster_path}` : '';
                        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
                        const popularity = item.popularity ? Math.round(item.popularity) : 0;
                        const requestedClass = isRequested(item.id, mediaType) ? 'requested' : '';
                        
                        return `
                            <div class="movie-card ${requestedClass}" style="position: relative;" data-tmdb-id="${item.id}" onclick="requestMovie(${item.id}, '${mediaType}', '${title}')">
                                ${poster ? `<img data-src="${poster}" alt="${title}">` : '<div class="no-poster">&#x1F3AC;</div>'}
                                <div class="info">
                                    <h3 title="${title}">${title}</h3>
                                    <p>${year || '未知年份'}</p>
                                    <div class="rating">
                                        <span class="star">⭐</span>
                                        <span class="score">${rating}</span>
                                        <span style="margin-left: 8px; color: #e74c3c;">🔥 ${popularity}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    // 立即启动懒加载
                    lazyLoadImages();
                    // 立即异步检查Emby库状态（不阻塞页面）
                    checkEmbyStatusBatch(items, mediaType, containerId);
                    
                    // 创建分页按钮
                    const totalPages = Math.min(data.total_pages || 100, 100); // 最多显示100页
                    const currentPage = mediaType === 'movie' ? movieCurrentPage : tvCurrentPage;
                    
                    let paginationHTML = '';
                    paginationHTML += `<button onclick="changePage('${mediaType}', '${containerId}', '${paginationId}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
                    
                    // 智能分页显示：显示首页、当前页附近、尾页
                    const maxVisible = 7; // 最多显示7个页码按钮
                    let startPage = Math.max(1, currentPage - 3);
                    let endPage = Math.min(totalPages, currentPage + 3);
                    
                    // 调整显示范围，确保始终显示 maxVisible 个按钮（如果总页数足够）
                    if (endPage - startPage + 1 < maxVisible) {
                        if (startPage === 1) {
                            endPage = Math.min(totalPages, startPage + maxVisible - 1);
                        } else if (endPage === totalPages) {
                            startPage = Math.max(1, endPage - maxVisible + 1);
                        }
                    }
                    
                    // 如果不是从第1页开始，显示第1页和省略号
                    if (startPage > 1) {
                        paginationHTML += `<button class="${1 === currentPage ? 'active' : ''}" onclick="changePage('${mediaType}', '${containerId}', '${paginationId}', 1)">1</button>`;
                        if (startPage > 2) {
                            paginationHTML += `<button disabled style="border: none; background: none; cursor: default;">...</button>`;
                        }
                    }
                    
                    // 显示中间页码
                    for (let i = startPage; i <= endPage; i++) {
                        paginationHTML += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage('${mediaType}', '${containerId}', '${paginationId}', ${i})">${i}</button>`;
                    }
                    
                    // 如果不是到最后一页，显示省略号和最后一页
                    if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            paginationHTML += `<button disabled style="border: none; background: none; cursor: default;">...</button>`;
                        }
                        paginationHTML += `<button class="${totalPages === currentPage ? 'active' : ''}" onclick="changePage('${mediaType}', '${containerId}', '${paginationId}', ${totalPages})">${totalPages}</button>`;
                    }
                    
                    paginationHTML += `<button onclick="changePage('${mediaType}', '${containerId}', '${paginationId}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
                    
                    paginationContainer.innerHTML = paginationHTML;
                } else {
                    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px 0;">暂无数据</p>';
                }
            } catch (error) {
                console.error('热门加载错误:', error);
                container.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px 0;">加载失败，请检查网络连接</p>';
            }
        }
        
        // 切换页面
        function changePage(mediaType, containerId, paginationId, page) {
            if (mediaType === 'movie') {
                movieCurrentPage = page;
            } else {
                tvCurrentPage = page;
            }
            loadTrending(mediaType, containerId, paginationId, page);
            
            // 不滚动页面，保持当前位置
        }
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.target.value.length >= 2) {
                    searchMovies();
                }
            }, 500); // 500ms防抖，避免频繁请求
        });
        
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchMovies();
            }
        });
        
        async function searchMovies() {
            const query = document.getElementById('searchInput').value;
            const resultsDiv = document.getElementById('searchResults');
            const loadingDiv = document.querySelector('.search-loading');
            const searchBtn = document.querySelector('.search-box button');
            
            if (!query) {
                resultsDiv.innerHTML = '';
                hideSearchFilters();
                return;
            }
            
            // 防止重复搜索
            if (isSearching) return;
            isSearching = true;
            
            // 隐藏过滤器
            hideSearchFilters();
            
            // 搜索按钮加载状态
            const originalBtnText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<span class="btn-spinner"></span>';
            searchBtn.disabled = true;
            searchBtn.classList.add('loading');
            
            // 显示骨架屏
            resultsDiv.innerHTML = generateSkeletonHTML(searchResultsPerPage);
            loadingDiv.style.display = 'none'; // 隐藏旧的 spinner
            
            try {
                // 同时搜索电影和剧集，但设置超时
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒总超时
                
                const [movieResponse, tvResponse] = await Promise.all([
                    fetch(`/search?q=${encodeURIComponent(query)}&type=movie`, {
                        signal: controller.signal
                    }),
                    fetch(`/search?q=${encodeURIComponent(query)}&type=tv`, {
                        signal: controller.signal
                    })
                ]).finally(() => clearTimeout(timeoutId));
                
                // 检查响应状态
                if (!movieResponse.ok || !tvResponse.ok) {
                    throw new Error('搜索请求失败');
                }
                
                // 使用 response.text() 避免移动端流消耗问题
                const [movieText, tvText] = await Promise.all([
                    movieResponse.text(),
                    tvResponse.text()
                ]);
                
                let movieData, tvData;
                try {
                    movieData = JSON.parse(movieText);
                    tvData = JSON.parse(tvText);
                } catch (parseError) {
                    console.error('搜索JSON解析失败:', parseError);
                    throw new Error('数据格式错误');
                }
                
                const movieResults = (movieData.results || []).map(item => ({...item, media_type: 'movie'}));
                const tvResults = (tvData.results || []).map(item => ({...item, media_type: 'tv'}));
                
                // 合并结果并按评分排序
                const allResults = [...movieResults, ...tvResults].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
                
                if (allResults.length > 0) {
                    // 保存所有搜索结果
                    allSearchResults = allResults;
                    searchCurrentPage = 1;
                    
                    // 骨架屏淡出效果
                    const skeletonCards = resultsDiv.querySelectorAll('.skeleton-card');
                    if (skeletonCards.length > 0) {
                        skeletonCards.forEach(card => card.classList.add('skeleton-fade-out'));
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                    
                    // 显示搜索过滤器
                    showSearchFilters(allResults);
                    
                    // 显示第一页
                    displaySearchPage(1);
                } else {
                    // 骨架屏淡出
                    const skeletonCards = resultsDiv.querySelectorAll('.skeleton-card');
                    if (skeletonCards.length > 0) {
                        skeletonCards.forEach(card => card.classList.add('skeleton-fade-out'));
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                    resultsDiv.innerHTML = '<p style="text-align: center; color: #999; padding: 40px 0;">未找到相关影片</p>';
                    document.getElementById('searchPagination').innerHTML = '';
                    hideSearchFilters();
                }
            } catch (error) {
                console.error('搜索错误:', error);
                // 骨架屏淡出
                const skeletonCards = resultsDiv.querySelectorAll('.skeleton-card');
                if (skeletonCards.length > 0) {
                    skeletonCards.forEach(card => card.classList.add('skeleton-fade-out'));
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
                resultsDiv.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 40px 0;">搜索失败，请检查网络连接</p>';
            } finally {
                isSearching = false;
                // 恢复搜索按钮
                searchBtn.innerHTML = '🔍 搜索';
                searchBtn.disabled = false;
                searchBtn.classList.remove('loading');
            }
        }
        
        // 存储待求片的信息
        let pendingRequest = null;
        // 存储电视剧季/集数据
        let tvSeasons = [];
        let tvEpisodes = [];
        let selectedRequestType = 'all';
        
        function requestMovie(tmdbId, mediaType, title) {
            // 保存待求片的信息
            pendingRequest = { tmdbId, mediaType, title };
            
            // 显示确认对话框
            document.getElementById('confirmMovieTitle').textContent = title;
            document.getElementById('confirmMovieType').textContent = mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
            
            // 显示Emby库状态信息
            const embyStatusDiv = document.getElementById('embyStatusInfo');
            if (mediaType === 'tv') {
                // 检查当前卡片的Emby状态
                const card = event.target.closest('.movie-card');
                const embyBadge = card?.querySelector('.emby-badge');
                
                if (embyBadge) {
                    const isPartial = embyBadge.classList.contains('emby-badge-partial');
                    if (isPartial) {
                        // 部分缺失，显示提示
                        embyStatusDiv.innerHTML = `
                            <div class="emby-status-warning">
                                <span class="warning-icon">⚠️</span>
                                <div class="warning-content">
                                    <strong>部分季已入库</strong>
                                    <p>正在获取详细信息...</p>
                                </div>
                            </div>
                        `;
                        embyStatusDiv.style.display = 'block';
                        
                        // 异步获取详细的季信息
                        fetchEmbySeasonDetails(tmdbId).then(seasonInfo => {
                            if (seasonInfo) {
                                const { hasSeasons, totalSeasons, missingSeasons } = seasonInfo;
                                embyStatusDiv.innerHTML = `
                                    <div class="emby-status-warning">
                                        <span class="warning-icon">⚠️</span>
                                        <div class="warning-content">
                                            <strong>库存状态</strong>
                                            <p class="season-info">✅ 已有: ${hasSeasons.map(s => `S${s}`).join(', ')}</p>
                                            <p class="season-info missing">❌ 缺失: ${missingSeasons.map(s => `S${s}`).join(', ')}</p>
                                        </div>
                                    </div>
                                `;
                            }
                        });
                    } else {
                        // 完全入库
                        embyStatusDiv.innerHTML = `
                            <div class="emby-status-complete">
                                <span class="complete-icon">✅</span>
                                <span>此剧集所有季已入库</span>
                            </div>
                        `;
                        embyStatusDiv.style.display = 'block';
                    }
                } else {
                    embyStatusDiv.style.display = 'none';
                }
            } else {
                embyStatusDiv.style.display = 'none';
            }
            
            // 重置选择状态
            selectedRequestType = 'all';
            document.querySelector('input[name="requestType"][value="all"]').checked = true;
            document.getElementById('seasonSelector').style.display = 'none';
            document.getElementById('episodeSelector').style.display = 'none';
            document.getElementById('seasonSelect').innerHTML = '<option value="">-- 请选择 --</option>';
            document.getElementById('episodeSelect').innerHTML = '<option value="">-- 请选择 --</option>';
            document.getElementById('userNoteInput').value = '';
            tvSeasons = [];
            tvEpisodes = [];
            
            // 如果是电视剧，显示季/集选择器并加载季信息
            if (mediaType === 'tv') {
                document.getElementById('tvScopeSelector').style.display = 'block';
                loadTvSeasons(tmdbId);
            } else {
                document.getElementById('tvScopeSelector').style.display = 'none';
            }
            
            document.getElementById('confirmOverlay').classList.add('show');
        }
        
        // 获取剧集的详细季信息
        async function fetchEmbySeasonDetails(tmdbId) {
            try {
                const response = await fetch(`/api/emby/season-details?tmdb_id=${tmdbId}`);
                const data = await parseResponseData(response);
                
                if (!response.ok) {
                    if (data.user_friendly && data.error) {
                        console.warn('Emby季详情:', data.error);
                    } else {
                        console.error('获取Emby季详情失败:', data.error || '未知错误');
                    }
                    return null;
                }
                
                if (data.success) {
                    return data;
                }
                return null;
            } catch (error) {
                console.error('网络请求失败:', error.message);
                return null;
            }
        }
        
        // 加载电视剧季信息
        async function loadTvSeasons(tmdbId) {
            document.getElementById('seasonLoading').style.display = 'flex';
            
            try {
                const response = await fetch(`/api/tv/${tmdbId}/seasons`);
                const data = await parseResponseData(response);
                
                if (data.success && data.seasons) {
                    tvSeasons = data.seasons;
                    const select = document.getElementById('seasonSelect');
                    select.innerHTML = '<option value="">-- 请选择 --</option>';
                    
                    data.seasons.forEach(season => {
                        const option = document.createElement('option');
                        option.value = season.season_number;
                        // Season 0 直接使用 TMDB 返回的名称（如"特别篇"、"OVA"等）
                        const seasonLabel = season.season_number === 0 
                            ? `${season.name || '特别篇'} (${season.episode_count} 集)` 
                            : `第 ${season.season_number} 季 (${season.episode_count} 集) - ${season.name}`;
                        option.textContent = seasonLabel;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('加载季信息失败:', error);
            } finally {
                document.getElementById('seasonLoading').style.display = 'none';
            }
        }
        
        // 选择求片类型
        function selectRequestType(type) {
            selectedRequestType = type;
            
            const seasonSelector = document.getElementById('seasonSelector');
            const episodeSelector = document.getElementById('episodeSelector');
            
            if (type === 'all') {
                seasonSelector.style.display = 'none';
                episodeSelector.style.display = 'none';
            } else if (type === 'season') {
                seasonSelector.style.display = 'block';
                episodeSelector.style.display = 'none';
            } else if (type === 'episode') {
                seasonSelector.style.display = 'block';
                episodeSelector.style.display = 'block';
            }
        }
        
        // 加载剧集列表
        async function loadEpisodes() {
            const seasonNumber = document.getElementById('seasonSelect').value;
            if (!seasonNumber || !pendingRequest) return;
            
            // 如果选择的是指定集，加载该季的剧集
            if (selectedRequestType === 'episode') {
                document.getElementById('episodeLoading').style.display = 'flex';
                
                try {
                    const response = await fetch(`/api/tv/${pendingRequest.tmdbId}/season/${seasonNumber}`);
                    const data = await parseResponseData(response);
                    
                    if (data.success && data.episodes) {
                        tvEpisodes = data.episodes;
                        const select = document.getElementById('episodeSelect');
                        select.innerHTML = '<option value="">-- 请选择 --</option>';
                        
                        data.episodes.forEach(episode => {
                            const option = document.createElement('option');
                            option.value = episode.episode_number;
                            option.textContent = `第 ${episode.episode_number} 集 - ${episode.name}`;
                            select.appendChild(option);
                        });
                    }
                } catch (error) {
                    console.error('加载剧集信息失败:', error);
                } finally {
                    document.getElementById('episodeLoading').style.display = 'none';
                }
            }
        }
        
        function closeConfirmDialog() {
            document.getElementById('confirmOverlay').classList.remove('show');
            pendingRequest = null;
            // 重置电视剧选择状态
            selectedRequestType = 'all';
            tvSeasons = [];
            tvEpisodes = [];
        }
        
        // 已使用 showToast() 代替
        
        function showLoading() {
            document.getElementById('loadingOverlay').classList.add('show');
        }
        
        function hideLoading() {
            document.getElementById('loadingOverlay').classList.remove('show');
        }
        
        async function confirmRequest() {
            if (!pendingRequest) return;
            
            const { tmdbId, mediaType, title } = pendingRequest;
            const messageDiv = document.getElementById('message');
            
            // 构建请求数据
            const requestData = {
                tmdb_id: tmdbId,
                media_type: mediaType
            };
            
            // 如果是电视剧，添加季/集选择信息
            if (mediaType === 'tv') {
                requestData.request_type = selectedRequestType;
                requestData.user_note = document.getElementById('userNoteInput').value.trim();
                
                if (selectedRequestType === 'season' || selectedRequestType === 'episode') {
                    const seasonNumber = document.getElementById('seasonSelect').value;
                    if (!seasonNumber) {
                        showToast('请选择季', '请先选择要求片的季数', 'error');
                        return;
                    }
                    requestData.season_number = parseInt(seasonNumber);
                }
                
                if (selectedRequestType === 'episode') {
                    const episodeNumber = document.getElementById('episodeSelect').value;
                    if (!episodeNumber) {
                        showToast('请选择集', '请先选择要求片的集数', 'error');
                        return;
                    }
                    requestData.episode_number = parseInt(episodeNumber);
                }
            }
            
            // 关闭确认对话框
            closeConfirmDialog();
            
            // 显示加载动画
            showLoading();
            
            try {
                const response = await fetch('/request-movie', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                // 隐藏加载动画
                hideLoading();
                
                // 先获取响应文本
                const responseText = await response.text();
                
                // 检查 HTTP 状态码
                if (!response.ok) {
                    let data = {};
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        console.error('JSON 解析失败:', e);
                    }
                    
                    // 根据错误类型显示不同标题
                    let errorTitle = '求片失败';
                    const errorMsg = data.error || `服务器错误 (${response.status})`;
                    
                    if (errorMsg.includes('达到求片上限') || errorMsg.includes('次数已用完')) {
                        errorTitle = '今日求片次数已用完';
                    } else if (errorMsg.includes('没有有效订阅') || errorMsg.includes('无法求片')) {
                        errorTitle = '无求片额度';
                    } else if (errorMsg.includes('账号已被禁用')) {
                        errorTitle = '账号已禁用';
                    } else if (errorMsg.includes('已在媒体库中')) {
                        errorTitle = '已入库';
                    } else if (errorMsg.includes('已求过') || errorMsg.includes('已经求过')) {
                        errorTitle = '重复求片';
                    }
                    
                    showToast(errorTitle, errorMsg, 'error');
                    return;
                }
                
                // 解析 JSON
                let data = {};
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.error('成功响应的 JSON 解析失败:', e);
                    showToast('网络错误', '响应格式错误', 'error');
                    return;
                }
                
                if (data.success) {
                    // 添加到已求片集合
                    requestedMovies.add(`${tmdbId}_${mediaType}`);
                    
                    // 标记卡片
                    markRequestedCards();
                    
                    // 更新统计数据
                    updateStats(data);
                    
                    // 成功提示弹窗
                    showToast(
                        '求片成功！',
                        `已提交给管理员审核，剩余次数: ${data.remaining}`,
                        'success'
                    );
                } else {
                    // 失败提示弹窗 - 根据错误类型显示不同标题
                    let errorTitle = '求片失败';
                    const errorMsg = data.error || '未知错误';
                    
                    if (errorMsg.includes('达到求片上限') || errorMsg.includes('次数已用完')) {
                        errorTitle = '今日求片次数已用完';
                    } else if (errorMsg.includes('没有有效订阅') || errorMsg.includes('无法求片')) {
                        errorTitle = '无求片额度';
                    } else if (errorMsg.includes('账号已被禁用')) {
                        errorTitle = '账号已禁用';
                    } else if (errorMsg.includes('已在媒体库中')) {
                        errorTitle = '已入库';
                    } else if (errorMsg.includes('已求过') || errorMsg.includes('已经求过')) {
                        errorTitle = '重复求片';
                    }
                    
                    showToast(errorTitle, errorMsg, 'error');
                }
            } catch (error) {
                // 隐藏加载动画
                hideLoading();
                
                console.error('求片错误详情:', error);
                console.error('错误类型:', error.name);
                console.error('错误消息:', error.message);
                showToast(
                    '求片失败',
                    `网络错误: ${error.message || '请检查连接后重试'}`,
                    'error'
                );
            }
        }
        
        // ==================== PWA 注册 ====================
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/static/sw.js')
                    .then(reg => {})
                    .catch(err => {});
            });
        }
        
        // ==================== 手势操作（滑动切换标签页）====================
        (function() {
            const tabsContainer = document.querySelector('.tab-container');
            if (!tabsContainer) return;
            
            let touchStartX = 0;
            let touchEndX = 0;
            const minSwipeDistance = 80;
            
            const tabs = ['search', 'trending', 'favorites'];
            
            function getCurrentTabIndex() {
                const buttons = document.querySelectorAll('.tab-button');
                for (let i = 0; i < buttons.length; i++) {
                    if (buttons[i].classList.contains('active')) {
                        return i;
                    }
                }
                return 0;
            }
            
            // 监听触摸事件
            tabsContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            tabsContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });
            
            function handleSwipe() {
                const swipeDistance = touchEndX - touchStartX;
                const currentIndex = getCurrentTabIndex();
                
                if (Math.abs(swipeDistance) < minSwipeDistance) return;
                
                if (swipeDistance > 0 && currentIndex > 0) {
                    // 右滑 -> 上一个标签
                    switchTab(tabs[currentIndex - 1]);
                } else if (swipeDistance < 0 && currentIndex < tabs.length - 1) {
                    // 左滑 -> 下一个标签
                    switchTab(tabs[currentIndex + 1]);
                }
            }
        })();
        
        // ==================== 安装 PWA 提示 ====================
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 显示安装提示（仅在移动端）
            if (window.innerWidth <= 768) {
                showInstallPrompt();
            }
        });
        
        function showInstallPrompt() {
            // 检查是否已经显示过
            if (localStorage.getItem('pwa_prompt_shown')) return;
            
            const prompt = document.createElement('div');
            prompt.className = 'pwa-install-prompt';
            prompt.innerHTML = `
                <div class="pwa-prompt-content">
                    <span>📱 安装到桌面，体验更流畅</span>
                    <div class="pwa-prompt-buttons">
                        <button onclick="installPWA()">安装</button>
                        <button onclick="dismissPWAPrompt(this.parentElement.parentElement.parentElement)">稍后</button>
                    </div>
                </div>
            `;
            document.body.appendChild(prompt);
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .pwa-install-prompt {
                    position: fixed;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    z-index: 10000;
                    animation: slideUp 0.3s ease;
                }
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .pwa-prompt-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .pwa-prompt-buttons {
                    display: flex;
                    gap: 8px;
                }
                .pwa-prompt-buttons button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .pwa-prompt-buttons button:first-child {
                    background: #3b82f6;
                    color: white;
                }
                .pwa-prompt-buttons button:last-child {
                    background: #e5e7eb;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }
        
        function installPWA() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    deferredPrompt = null;
                });
            }
            dismissPWAPrompt(document.querySelector('.pwa-install-prompt'));
        }
        
        function dismissPWAPrompt(el) {
            if (el) el.remove();
            localStorage.setItem('pwa_prompt_shown', 'true');
        }

        // ==================== 汉堡菜单功能 ====================
        function toggleMobileMenu() {
            const overlay = document.getElementById('mobileMenuOverlay');
            const drawer = document.getElementById('mobileMenuDrawer');
            const toggle = document.getElementById('mobileMenuToggle');
            
            if (drawer.classList.contains('show')) {
                closeMobileMenu();
            } else {
                overlay.classList.add('show');
                drawer.classList.add('show');
                toggle.classList.add('active');
                document.body.style.overflow = 'hidden'; // 防止背景滚动
            }
        }
        
        function closeMobileMenu() {
            const overlay = document.getElementById('mobileMenuOverlay');
            const drawer = document.getElementById('mobileMenuDrawer');
            const toggle = document.getElementById('mobileMenuToggle');
            
            overlay.classList.remove('show');
            drawer.classList.remove('show');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
        }

        // ==================== 下拉刷新功能 ====================
        let pullStartY = 0;
        let isPulling = false;
        let pullDistance = 0;
        const pullThreshold = 80;
        const requestListEl = document.getElementById('requestList');
        
        function initPullToRefresh() {
            const container = document.querySelector('.container');
            if (!container || window.innerWidth > 768) return; // 仅移动端
            
            container.addEventListener('touchstart', handleTouchStart, { passive: true });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
        
        function handleTouchStart(e) {
            if (window.scrollY === 0) {
                pullStartY = e.touches[0].clientY;
                isPulling = true;
            }
        }
        
        function handleTouchMove(e) {
            if (!isPulling || window.scrollY > 0) {
                isPulling = false;
                return;
            }
            
            pullDistance = e.touches[0].clientY - pullStartY;
            
            if (pullDistance > 0) {
                e.preventDefault();
                
                // 显示下拉刷新指示器
                let indicator = document.getElementById('pullRefreshIndicator');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'pullRefreshIndicator';
                    indicator.className = 'pull-refresh-indicator';
                    indicator.innerHTML = '<div class="pull-refresh-spinner"></div><span>下拉刷新求片记录</span>';
                    document.querySelector('.container').prepend(indicator);
                }
                
                const progress = Math.min(pullDistance / pullThreshold, 1);
                indicator.style.height = Math.min(pullDistance * 0.5, 60) + 'px';
                indicator.style.opacity = progress;
                
                if (pullDistance > pullThreshold) {
                    indicator.classList.add('ready');
                    indicator.querySelector('span').textContent = '松开刷新';
                } else {
                    indicator.classList.remove('ready');
                    indicator.querySelector('span').textContent = '下拉刷新求片记录';
                }
            }
        }
        
        function handleTouchEnd() {
            if (!isPulling) return;
            
            const indicator = document.getElementById('pullRefreshIndicator');
            
            if (pullDistance > pullThreshold) {
                // 执行刷新
                if (indicator) {
                    indicator.classList.add('refreshing');
                    indicator.querySelector('span').textContent = '刷新中...';
                }
                
                // 刷新求片记录
                refreshRequestList().finally(() => {
                    if (indicator) {
                        indicator.style.height = '0';
                        indicator.style.opacity = '0';
                        setTimeout(() => indicator.remove(), 300);
                    }
                });
            } else {
                // 取消刷新
                if (indicator) {
                    indicator.style.height = '0';
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
            }
            
            isPulling = false;
            pullDistance = 0;
            pullStartY = 0;
        }
        
        async function refreshRequestList() {
            try {
                const data = await fetchMyRequestsSnapshot();
                applyMyRequestsSnapshot(data, { markCards: true, redrawSearch: false });

                const requestList = document.getElementById('requestList');
                if (!requestList) return;

                const requests = data.requests || [];

                if (requests.length === 0) {
                    requestList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📭</div>
                            <div class="empty-title">暂无求片记录</div>
                            <div class="empty-desc">在上方搜索框中搜索想看的影片，点击即可提交求片请求</div>
                        </div>
                    `;
                    const paginationEl = document.getElementById('requestPagination');
                    if (paginationEl) paginationEl.innerHTML = '';
                    return;
                }
                
                let html = '';
                requests.forEach((req, index) => {
                    const posterHTML = req.poster_url
                        ? `<img src="${req.poster_url}" alt="${escapeHtml(req.title)}">`
                        : `<div style="width: 80px; height: 120px; background: #ddd; border-radius: 5px; display: flex; align-items: center; justify-content: center;">🎬</div>`;
                    
                    const mediaTypeLabel = req.media_type === 'movie'
                        ? '🎬 电影'
                        : '📺 剧集';
                    
                    const scopeHTML = (req.media_type === 'tv' && req.request_scope)
                        ? `<span style="font-size: 12px; background: #10b981; color: white; padding: 2px 8px; border-radius: 3px; margin-left: 4px;">📑 ${escapeHtml(req.request_scope)}</span>`
                        : '';
                    
                    // 状态文本
                    const statusMap = {
                        'pending': '待处理',
                        'approved': '已批准',
                        'processing': '已批准',
                        'completed': '已完成',
                        'rejected': '已拒绝',
                        'downloading': '下载中',
                        'downloaded': '待入库',
                        'failed': '下载失败'
                    };
                    const statusText = statusMap[req.status] || req.status;
                    
                    // 下载状态卡片
                    let downloadCard = '';
                    const dt = req.download_task;
                    
                    if (req.status === 'downloading' && dt) {
                        if (dt.progress && dt.progress >= 100) {
                            downloadCard = `
                                <div class="download-status-card pending-release">
                                    <div class="card-header">
                                        <span class="icon">📦</span>
                                        <span class="title">下载完成</span>
                                        <span class="badge">待入库</span>
                                    </div>
                                    <div class="download-progress completed" data-request-id="${req.id}">
                                        <div class="progress-track">
                                            <div class="progress-fill" style="width: 100%;"></div>
                                        </div>
                                        <div class="progress-meta">
                                            <span class="progress-value" style="color: #f59e0b;">✅ 已下载完成</span>
                                        </div>
                                    </div>
                                </div>`;
                        } else {
                            const progress = dt.progress ? dt.progress.toFixed(1) : '0.0';
                            const speed = dt.download_speed || 0;
                            const eta = dt.eta !== null && dt.eta !== undefined ? dt.eta : -1;
                            downloadCard = `
                                <div class="download-status-card downloading" data-request-id="${req.id}">
                                    <div class="card-header">
                                        <span class="icon">⬇️</span>
                                        <span class="title">正在下载</span>
                                        <span class="badge">进行中</span>
                                    </div>
                                    <div class="download-progress" data-request-id="${req.id}" data-progress="${progress}" data-speed="${speed}" data-eta="${eta}">
                                        <div class="progress-track">
                                            <div class="progress-fill" style="width: ${progress}%;"></div>
                                        </div>
                                        <div class="progress-meta">
                                            <span class="progress-value">${progress}%</span>
                                            <span class="progress-speed">0 B/s</span>
                                            <span class="progress-eta">ETA --:--:--</span>
                                        </div>
                                    </div>
                                </div>`;
                        }
                    } else if (req.status === 'downloaded') {
                        downloadCard = `
                            <div class="download-status-card pending-release">
                                <div class="card-header">
                                    <span class="icon">📦</span>
                                    <span class="title">下载完成</span>
                                    <span class="badge">待入库</span>
                                </div>
                                <div class="pending-message">
                                    <div class="spinner"></div>
                                    <span>资源已下载完成，等待入库到媒体库...</span>
                                </div>
                            </div>`;
                    } else if (req.status === 'completed') {
                        downloadCard = `
                            <div class="download-status-card completed">
                                <div class="card-header">
                                    <span class="icon">✅</span>
                                    <span class="title">已入库</span>
                                    <span class="badge">完成</span>
                                </div>
                                <div class="complete-message">
                                    <span>🎉 资源已成功上架，可前往媒体库观看！</span>
                                </div>
                            </div>`;
                    } else if (req.status === 'failed' && dt) {
                        const errMsg = escapeHtml(dt.error_message || '下载过程中出现错误');
                        const retryCount = dt.retry_count || 0;
                        const maxRetries = dt.max_retries || 3;
                        const retryHTML = retryCount < maxRetries
                            ? `<button class="retry-btn" onclick="retryDownload(${req.id}, this)"><span class="retry-icon">🔄</span> 重试下载 (${retryCount}/${maxRetries})</button>`
                            : `<p class="retry-exhausted">已达到最大重试次数 (${maxRetries}次)</p>`;
                        downloadCard = `
                            <div class="download-status-card failed" data-request-id="${req.id}">
                                <div class="card-header">
                                    <span class="icon">❌</span>
                                    <span class="title">下载失败</span>
                                    <span class="badge failed-badge">失败</span>
                                </div>
                                <div class="failed-message">
                                    <p class="error-text">${errMsg}</p>
                                    ${retryHTML}
                                </div>
                            </div>`;
                    }
                    
                    const overview = req.overview
                        ? escapeHtml(req.overview.length > 100 ? req.overview.substring(0, 100) + '...' : req.overview)
                        : '';
                    
                    const userNoteHTML = req.user_note
                        ? `<p style="margin-top: 5px; font-size: 12px; color: #3b82f6;">💬 我的备注: ${escapeHtml(req.user_note)}</p>`
                        : '';
                    const adminNoteHTML = req.admin_note
                        ? `<p style="margin-top: 5px; font-size: 12px; color: #e74c3c;">📝 管理员备注: ${escapeHtml(req.admin_note)}</p>`
                        : '';
                    
                    html += `
                        <div class="request-item" data-index="${index}" data-request-id="${req.id}">
                            ${posterHTML}
                            <div class="details">
                                <h3>${escapeHtml(req.title)} (${req.year || ''}) 
                                    <span style="font-size: 12px; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px; margin-left: 8px;">
                                        ${mediaTypeLabel}
                                    </span>
                                    ${scopeHTML}
                                </h3>
                                <p>${overview}</p>
                                <span class="status ${req.status}">${statusText}</span>
                                ${downloadCard}
                                <p style="margin-top: 10px; font-size: 12px; color: #999;">
                                    求片时间: ${req.created_at || ''}
                                </p>
                                ${userNoteHTML}
                                ${adminNoteHTML}
                            </div>
                        </div>
                    `;
                });
                
                requestList.innerHTML = html;
                
                // 重新初始化分页
                requestCurrentPage = 1;
                initRequestPagination();
                
                // 重新初始化下载进度监控
                initDownloadProgressWatcher();
                
            } catch (error) {
                console.error('刷新失败:', error);
                showMessage('刷新失败', 'error');
            }
        }
        
        // ==================== 搜索过滤功能 ====================
        let originalSearchResults = []; // 保存原始搜索结果
        
        function populateYearFilter(results) {
            const yearSelect = document.getElementById('filterYear');
            if (!yearSelect) return;
            
            const years = new Set();
            results.forEach(item => {
                const year = item.release_date || item.first_air_date;
                if (year) {
                    years.add(year.substring(0, 4));
                }
            });
            
            // 清除旧选项，保留"全部年份"
            yearSelect.innerHTML = '<option value="">全部年份</option>';
            
            // 按年份降序排列
            Array.from(years).sort((a, b) => b - a).forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year + '年';
                yearSelect.appendChild(option);
            });
        }
        
        function applyFilters() {
            const yearFilter = document.getElementById('filterYear')?.value || '';
            const typeFilter = document.getElementById('filterType')?.value || '';
            
            let filtered = [...originalSearchResults];
            
            // 按年份过滤
            if (yearFilter) {
                filtered = filtered.filter(item => {
                    const date = item.release_date || item.first_air_date || '';
                    return date.startsWith(yearFilter);
                });
            }
            
            // 按类型过滤
            if (typeFilter) {
                filtered = filtered.filter(item => item.media_type === typeFilter);
            }
            
            allSearchResults = filtered;
            displaySearchPage(1);
        }
        
        function resetFilters() {
            const yearSelect = document.getElementById('filterYear');
            const typeSelect = document.getElementById('filterType');
            if (yearSelect) yearSelect.value = '';
            if (typeSelect) typeSelect.value = '';
            
            allSearchResults = [...originalSearchResults];
            displaySearchPage(1);
        }
        
        function showSearchFilters(results) {
            const filtersEl = document.getElementById('searchFilters');
            if (filtersEl && results.length > 0) {
                originalSearchResults = [...results];
                populateYearFilter(results);
                filtersEl.style.display = 'flex';
            }
        }
        
        function hideSearchFilters() {
            const filtersEl = document.getElementById('searchFilters');
            if (filtersEl) {
                filtersEl.style.display = 'none';
            }
            originalSearchResults = [];
        }
        
        // ==================== 登录过期检测 ====================
        function checkSessionExpiry(response) {
            // 检查响应是否为重定向到登录页
            if (response.redirected && response.url.includes('/login')) {
                showSessionExpiredModal();
                return true;
            }
            
            // 检查401状态码
            if (response.status === 401) {
                showSessionExpiredModal();
                return true;
            }
            
            return false;
        }
        
        function showSessionExpiredModal() {
            // 如果已存在则不重复显示
            if (document.getElementById('sessionExpiredModal')) return;
            
            const modal = document.createElement('div');
            modal.id = 'sessionExpiredModal';
            modal.className = 'session-expired-modal';
            modal.innerHTML = `
                <div class="session-expired-content">
                    <div class="session-expired-icon">⚠️</div>
                    <h3>登录已过期</h3>
                    <p>您的登录会话已过期，请重新登录</p>
                    <button onclick="window.location.href='/login'">重新登录</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 添加样式
            if (!document.getElementById('sessionExpiredStyles')) {
                const style = document.createElement('style');
                style.id = 'sessionExpiredStyles';
                style.textContent = `
                    .session-expired-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.6);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10000;
                        animation: fadeIn 0.3s ease;
                    }
                    .session-expired-content {
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        max-width: 320px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    }
                    .session-expired-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                    .session-expired-content h3 {
                        margin: 0 0 12px;
                        color: #333;
                        font-size: 20px;
                    }
                    .session-expired-content p {
                        margin: 0 0 24px;
                        color: #666;
                    }
                    .session-expired-content button {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    .session-expired-content button:hover {
                        transform: scale(1.05);
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // 包装 fetch 以检测登录过期
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // 只检查 API 请求
            if (args[0] && typeof args[0] === 'string' && args[0].startsWith('/api/')) {
                checkSessionExpiry(response);
            }
            
            return response;
        };

        // ==================== Emby库状态异步检查 ====================
        // 获取剧集的详细季信息
        async function fetchEmbySeasonDetails(tmdbId) {
            try {
                const response = await fetch(`/api/emby/season-details?tmdb_id=${tmdbId}`);
                const data = await parseResponseData(response);
                
                if (!response.ok) {
                    if (data.user_friendly && data.error) {
                        console.warn('Emby季详情:', data.error);
                    } else {
                        console.error('获取Emby季详情失败:', data.error || '未知错误');
                    }
                    return null;
                }
                
                if (data.success) {
                    return data;
                }
                return null;
            } catch (error) {
                console.error('网络请求失败:', error.message);
                return null;
            }
        }
        
        async function checkEmbyStatusBatch(items, mediaType, containerId) {
            if (!items || items.length === 0) return;
            
            // 对于搜索结果，items 可能包含 media_type 字段（混合电影和剧集）
            // 热门推荐传入了 mediaType 参数，直接使用
            const movieItems = items.filter(item => item.media_type === 'movie');
            const tvItems = items.filter(item => item.media_type === 'tv');
            
            // 如果 items 有 media_type 字段（搜索结果），分组检查
            if (movieItems.length > 0 || tvItems.length > 0) {
                // 如果有电影，检查电影
                if (movieItems.length > 0) {
                    await checkEmbyStatusBatchByType(movieItems, 'movie', containerId);
                }
                
                // 如果有剧集，检查剧集
                if (tvItems.length > 0) {
                    await checkEmbyStatusBatchByType(tvItems, 'tv', containerId);
                }
            } else {
                // 热门推荐：items 没有 media_type 字段，使用传入的 mediaType
                await checkEmbyStatusBatchByType(items, mediaType, containerId);
            }
        }
        
        async function checkEmbyStatusBatchByType(items, mediaType, containerId) {
            if (!items || items.length === 0) return;
            
            // 收集TMDB ID
            const tmdbIds = items.map(item => item.id).join(',');
            
            try {
                const response = await fetch(`/api/check-emby-batch?ids=${tmdbIds}&type=${mediaType}`, {
                    signal: AbortSignal.timeout(10000)
                });
                
                if (!response.ok) return;
                
                const data = await parseResponseData(response);
                if (!data.success) return;
                
                // 更新UI，为已入库的影片添加标签
                const container = document.getElementById(containerId);
                if (!container) return;
                
                Object.keys(data.results).forEach(tmdbId => {
                    const result = data.results[tmdbId];
                    
                    let exists = false;
                    let badgeText = '✅ 已入库';
                    let badgeClass = 'emby-badge';
                    
                    if (typeof result === 'boolean') {
                        exists = result;
                    } else if (typeof result === 'object' && result.exists) {
                        exists = true;
                        if (result.is_complete === false) {
                            badgeText = '⚠️ 部分缺失';
                            badgeClass = 'emby-badge emby-badge-partial';
                        }
                    }
                    
                    if (exists) {
                        const card = container.querySelector(`.movie-card[data-tmdb-id="${tmdbId}"]`);
                        if (card && !card.querySelector('.emby-badge')) {
                            const badge = document.createElement('span');
                            badge.className = badgeClass;
                            badge.textContent = badgeText;
                            card.insertBefore(badge, card.firstChild);
                        }
                    }
                });
            } catch (error) {
                // 静默失败，不影响用户体验
            }
        }
        
        // 初始化下拉刷新
        document.addEventListener('DOMContentLoaded', initPullToRefresh);
        
        // ==================== 下载重试功能 ====================
        async function retryDownload(requestId, buttonElement) {
            if (!requestId) return;
            
            // 禁用按钮，防止重复点击
            const originalText = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span class="retry-icon spinning">🔄</span> 重试中...';
            
            try {
                const response = await fetch(`/api/downloads/${requestId}/retry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showToast('重试成功', data.message, 'success');
                    
                    // 3秒后刷新页面以显示最新状态
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    showToast('重试失败', data.error, 'error');
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = originalText;
                }
            } catch (error) {
                console.error('重试请求失败:', error);
                showToast('网络错误', '无法连接到服务器', 'error');
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalText;
            }
        }

        // ==================== 订阅信息功能 ====================
        
        async function loadSubscriptionInfo() {
            const historyList = document.getElementById('subscriptionHistory');
            const countdownProgress = document.getElementById('countdownProgress');
            const countdownDays = document.getElementById('countdownDays');
            const badgeText = document.getElementById('subscriptionBadgeText');
            const startDate = document.getElementById('subscriptionStartDate');
            const endDate = document.getElementById('subscriptionEndDate');
            
            try {
                const requestSnapshot = await fetchMyRequestsSnapshot().catch(() => null);
                if (requestSnapshot) {
                    applyMyRequestsSnapshot(requestSnapshot, { markCards: true, redrawSearch: false });
                }

                // 获取当前订阅
                const response = await fetch('/api/subscription/current');
                const data = await parseResponseData(response);
                
                let planType = null;
                let planName = null;
                
                if (data.success && data.subscription) {
                    const sub = data.subscription;
                    planType = sub.plan_type;
                    planName = sub.plan_name;
                    
                    // 白名单用户特殊显示
                    if (sub.is_whitelist || sub.plan_type === 'whitelist') {
                        if (badgeText) badgeText.textContent = '白名单用户';
                        if (countdownDays) countdownDays.textContent = '∞';
                        if (startDate) startDate.textContent = '永久有效';
                        if (endDate) endDate.textContent = '永不过期';
                        // 设置进度条为满
                        if (countdownProgress) {
                            countdownProgress.style.strokeDashoffset = '0';
                        }
                    } else {
                        if (badgeText) badgeText.textContent = sub.status === 'active' ? '订阅用户' : '已过期';
                        if (countdownDays) countdownDays.textContent = sub.days_remaining || '0';
                        if (startDate) startDate.textContent = new Date(sub.start_date).toLocaleDateString('zh-CN');
                        if (endDate) endDate.textContent = new Date(sub.end_date).toLocaleDateString('zh-CN');
                        
                        // 计算进度条 (假设最大周期为365天)
                        if (countdownProgress && sub.days_remaining !== undefined) {
                            const maxDays = 365;
                            const progress = Math.min(sub.days_remaining / maxDays, 1);
                            const offset = 283 * (1 - progress);
                            countdownProgress.style.strokeDashoffset = offset;
                        }
                    }
                } else {
                    if (badgeText) badgeText.textContent = '未订阅';
                    if (countdownDays) countdownDays.textContent = '0';
                    if (startDate) startDate.textContent = '--';
                    if (endDate) endDate.textContent = '--';
                    if (countdownProgress) {
                        countdownProgress.style.strokeDashoffset = '283';
                    }
                }
                
                // ===== 渲染保号信息 =====
                renderRetentionInfo(data.retention);
                
                // 获取订阅历史
                const historyResponse = await fetch('/api/subscription/history');
                const historyData = await parseResponseData(historyResponse);
                const historyCount = document.getElementById('subscriptionHistoryCount');
                
                if (historyData.success && historyData.subscriptions.length > 0) {
                    if (historyCount) historyCount.textContent = `${historyData.subscriptions.length} 条记录`;
                    historyList.innerHTML = historyData.subscriptions.map((sub, index) => {
                        // 判断来源类型 - 兼容旧数据
                        const price = parseFloat(sub.price) || 0;
                        const source = sub.source || (price === 0 ? 'gift' : 'purchase');
                        let sourceTag = '';
                        let sourceClass = '';
                        
                        switch(source) {
                            case 'gift':
                                sourceTag = '<span class="source-tag gift">🎁 赠送</span>';
                                sourceClass = 'gift';
                                break;
                            case 'redeem':
                                sourceTag = '<span class="source-tag redeem">🎟️ 兑换</span>';
                                sourceClass = 'redeem';
                                break;
                            case 'manual':
                                sourceTag = '<span class="source-tag manual">⚙️ 系统</span>';
                                sourceClass = 'manual';
                                break;
                            case 'purchase':
                            default:
                                sourceTag = '<span class="source-tag purchase">💳 购买</span>';
                                sourceClass = 'purchase';
                                break;
                        }
                        
                        const priceText = price > 0 ? `¥${price}` : '免费';
                        
                        // 计算持续时间：赠送类型显示天数，其他显示月数
                        let durationText = '';
                        // 优先根据实际日期计算天数
                        const subStartDate = new Date(sub.start_date);
                        const subEndDate = new Date(sub.end_date);
                        const actualDays = Math.ceil((subEndDate - subStartDate) / (1000 * 60 * 60 * 24));
                        if (actualDays > 0 && actualDays < 30) {
                            durationText = `${actualDays}天`;
                        } else if (source === 'gift' && sub.duration_months === 0) {
                            durationText = `${actualDays}天`;
                        } else if (sub.duration_months > 0) {
                            durationText = `${sub.duration_months}个月`;
                        } else {
                            // 其他情况也计算天数
                            const startDate = new Date(sub.start_date);
                            const endDate = new Date(sub.end_date);
                            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                            durationText = `${days}天`;
                        }
                        
                        return `
                            <div class="history-item-new ${sourceClass}-item">
                                <div class="history-dot ${sourceClass}"></div>
                                <div class="history-item-content">
                                    <div class="history-item-header">
                                        <div class="history-item-title">${sub.plan_name}</div>
                                        ${sourceTag}
                                    </div>
                                    <div class="history-item-meta">
                                        ${new Date(sub.start_date).toLocaleDateString('zh-CN')} ~ ${new Date(sub.end_date).toLocaleDateString('zh-CN')}
                                        <span class="duration-tag">${durationText}</span>
                                        <span class="price-tag">${priceText}</span>
                                        <span class="status-tag ${sub.status}">${sub.status === 'active' ? '有效' : (sub.status === 'pending' ? '待生效' : '已过期')}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    const historyCountEl = document.getElementById('subscriptionHistoryCount');
                    if (historyCountEl) historyCountEl.textContent = '0 条记录';
                    historyList.innerHTML = `
                        <div class="history-empty">
                            <div class="empty-illustration">
                                <svg viewBox="0 0 200 150" fill="none">
                                    <rect x="40" y="30" width="120" height="90" rx="8" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
                                    <path d="M60 60h80M60 80h60M60 100h40" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                                    <circle cx="160" cy="110" r="25" fill="#667eea" opacity="0.1"/>
                                    <path d="M155 105l5 5 10-10" stroke="#667eea" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <p>暂无订阅记录</p>
                            <span>购买套餐后记录将显示在这里</span>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('加载订阅信息失败:', error);
                if (badgeText) badgeText.textContent = '加载失败';
            }
        }
        
        function refreshSubscription() {
            showMessage('正在刷新订阅状态...', 'info');
            loadSubscriptionInfo();
        }

        /**
         * 渲染保号信息卡片
         */
        function renderRetentionInfo(retention) {
            const section = document.getElementById('retentionInfoSection');
            if (!section) return;
            
            // 保号关闭或无数据
            if (!retention || retention.mode === 'off') {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = '';
            
            const mode = retention.mode;
            const coinName = retention.coin_name || '积分';
            const userCoins = retention.user_coins || 0;
            const renewDays = retention.renew_days || 30;
            
            // 保号模式名称和图标
            let modeName, modeIcon, modeColor;
            switch (mode) {
                case 'checkin':
                    modeName = '积分保号';
                    modeIcon = '💰';
                    modeColor = '#f59e0b';
                    break;
                case 'watch':
                    modeName = '观看保号';
                    modeIcon = '▶️';
                    modeColor = '#10b981';
                    break;
                case 'both':
                    modeName = '双保模式';
                    modeIcon = '🔰';
                    modeColor = '#6366f1';
                    break;
                default:
                    section.style.display = 'none';
                    return;
            }
            
            // 构建条件详情
            let conditionCards = '';
            
            // 积分保号条件
            if (mode === 'checkin' || mode === 'both') {
                const cost = retention.checkin_cost || 0;
                const enough = userCoins >= cost;
                conditionCards += `
                    <div class="retention-condition-card ${enough ? 'condition-met' : 'condition-unmet'}">
                        <div class="condition-icon">💰</div>
                        <div class="condition-detail">
                            <div class="condition-title">积分条件</div>
                            <div class="condition-desc">需要 <b>${cost}</b> ${coinName}，当前 <b>${userCoins}</b> ${coinName}</div>
                        </div>
                        <div class="condition-status ${enough ? 'status-ok' : 'status-no'}">
                            ${enough ? '✅ 满足' : '❌ 不足'}
                        </div>
                    </div>`;
            }
            
            // 观看保号条件
            if (mode === 'watch' || mode === 'both') {
                const watchDays = retention.watch_days || 30;
                const watchMinutes = retention.watch_minutes || 30;
                conditionCards += `
                    <div class="retention-condition-card">
                        <div class="condition-icon">▶️</div>
                        <div class="condition-detail">
                            <div class="condition-title">观看条件</div>
                            <div class="condition-desc">${watchDays} 天内累计观看 ≥ <b>${watchMinutes}</b> 分钟</div>
                        </div>
                        <div class="condition-status status-info">📊 系统自动检测</div>
                    </div>`;
            }
            
            // 双保模式提示
            let bothTip = '';
            if (mode === 'both') {
                bothTip = `<div class="retention-both-tip">💡 双保模式：需<b>同时满足</b>积分和观看两个条件才能保号</div>`;
            }
            
            section.innerHTML = `
                <div class="retention-card">
                    <div class="retention-header">
                        <div class="retention-badge" style="--badge-color: ${modeColor}">
                            <span class="retention-badge-icon">${modeIcon}</span>
                            <span class="retention-badge-text">${modeName}</span>
                        </div>
                        <div class="retention-renew-tag">续期 ${renewDays} 天/次</div>
                    </div>
                    <div class="retention-body">
                        <div class="retention-explain">
                            <p>🛡️ 订阅到期后，如果满足以下条件，系统将<b>自动续期 ${renewDays} 天</b>，无需手动操作。</p>
                        </div>
                        <div class="retention-conditions">
                            ${conditionCards}
                        </div>
                        ${bothTip}
                    </div>
                </div>`;
        }

        // ==================== 线路信息功能 ====================
        let serverLinesData = null;
        let passwordVisible = false;
        let lineVisibility = {};  // 每条线路单独控制显示状态
        
        async function loadServerLines() {
            const container = document.getElementById('serverLinesContainer');
            if (!container) return;
            
            container.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>加载中...</p></div>';
            
            try {
                const response = await fetch('/api/lines');
                const data = await parseResponseData(response);
                
                if (data.success) {
                    serverLinesData = data;
                    // 初始化每条线路的显示状态
                    if (data.lines) {
                        data.lines.forEach((line, index) => {
                            if (lineVisibility[index] === undefined) {
                                lineVisibility[index] = false;  // 默认隐藏
                            }
                        });
                    }
                    renderServerLines(data);
                } else {
                    container.innerHTML = '<p class="error-text">加载失败</p>';
                }
            } catch (error) {
                console.error('加载线路信息失败:', error);
                container.innerHTML = '<p class="error-text">加载失败，请稍后重试</p>';
            }
        }
        
        function renderServerLines(data) {
            const container = document.getElementById('serverLinesContainer');
            if (!container) return;
            
            // 无权限用户
            if (!data.has_access) {
                container.innerHTML = `
                    <div class="server-lines-no-access">
                        <div class="no-access-icon">🔒</div>
                        <h3>暂无访问权限</h3>
                        <p>${data.message || '您需要有效订阅才能查看线路信息'}</p>
                        <a href="#purchase" onclick="switchSection('purchase')" class="btn-go-purchase">
                            立即订阅 →
                        </a>
                    </div>
                `;
                return;
            }
            
            // 有权限用户
            let html = '';
            
            // 账号信息（紧凑版）- 只在已绑定时显示
            if (data.account && data.account.username) {
                const safeUsername = (data.account.username || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safePassword = (data.account.password || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                html += `
                    <div class="server-account-compact">
                        <h4>🔑 您的Emby账号</h4>
                        <div class="account-row">
                            <div class="account-item">
                                <span class="label">账号</span>
                                <span class="value">${data.account.username}</span>
                                <button class="btn-small copy-btn" data-copy="${safeUsername}" title="复制">📋</button>
                            </div>
                            <div class="account-item">
                                <span class="label">密码</span>
                                <span class="value ${!passwordVisible ? 'hidden' : ''}" id="passwordValue">
                                    ${passwordVisible ? (data.account.password || '未设置') : '••••••••'}
                                </span>
                                <button class="btn-small" onclick="togglePasswordVisibility()" title="${passwordVisible ? '隐藏' : '显示'}">
                                    ${passwordVisible ? '🙈' : '👁️'}
                                </button>
                                <button class="btn-small copy-btn" data-copy="${safePassword}" title="复制">📋</button>
                            </div>
                        </div>
                    </div>
                `;
            }
            // 未绑定 Emby 账号时不显示账号区域
            
            // 线路列表（紧凑版）- 每条线路单独控制
            if (data.lines && data.lines.length > 0) {
                html += '<div class="server-lines-list-compact">';
                
                data.lines.forEach((line, index) => {
                    const isVisible = lineVisibility[index] || false;
                    const displayUrl = isVisible ? line.full_url : '••••••••••••••••••••';
                    const safeFullUrl = line.full_url.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const safeName = line.name.replace(/'/g, "\\'").replace(/</g, '&lt;');
                    html += `
                        <div class="server-line-compact">
                            <div class="line-main-compact">
                                <span class="line-icon-badge ${line.access_level}">
                                    ${line.access_level === 'whitelist' ? '👑' : '🔗'}
                                </span>
                                <div class="line-text-group">
                                    <span class="line-name-new">${safeName}</span>
                                    <span class="line-url-new ${!isVisible ? 'line-hidden' : ''}">${displayUrl}</span>
                                </div>
                            </div>
                            <div class="line-actions-compact">
                                <button class="line-toggle-btn" onclick="toggleSingleLineVisibility(${index})" title="${isVisible ? '隐藏' : '显示'}">
                                    <span class="line-action-icon">${isVisible ? '🙈' : '👁️'}</span>
                                </button>
                                <button class="line-copy-btn copy-btn" data-copy="${safeFullUrl}">
                                    <span class="line-action-icon">📋</span>
                                    <span>复制</span>
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // 一键导入按钮（仅绑定账号且有线路时显示）
                if (data.account && data.account.username) {
                    html += `
                        <div class="import-all-bar">
                            <button class="import-all-btn" onclick="showImportAllDialog()">
                                <span class="import-all-icon">📲</span>
                                <span>一键导入播放器</span>
                            </button>
                        </div>
                    `;
                }
            } else {
                html += `
                    <div class="server-lines-no-access" style="padding: 20px;">
                        <div class="no-access-icon">📭</div>
                        <h3>暂无可用线路</h3>
                        <p>管理员尚未配置线路信息</p>
                    </div>
                `;
            }
            
            container.innerHTML = html;

            // 为所有复制按钮绑定事件（避免 onclick 内联引号问题）
            container.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = this.getAttribute('data-copy');
                    copyToClipboard(text);
                });
            });
        }
        
        function togglePasswordVisibility() {
            passwordVisible = !passwordVisible;
            if (serverLinesData) {
                renderServerLines(serverLinesData);
            }
        }
        
        // 单独控制每条线路的显示/隐藏
        function toggleSingleLineVisibility(index) {
            const wasHidden = !lineVisibility[index];
            lineVisibility[index] = !lineVisibility[index];
            if (serverLinesData) {
                renderServerLines(serverLinesData);
                // 从隐藏变为显示时记录查看日志
                if (wasHidden && serverLinesData.lines && serverLinesData.lines[index]) {
                    const lineName = serverLinesData.lines[index].name || '';
                    fetch('/api/lines/view-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ line_name: lineName, line_index: index })
                    }).catch(() => {});
                }
            }
        }
        
        // 保留原函数以兼容
        function toggleLinesVisibility() {
            // 切换所有线路的显示状态
            const allVisible = Object.values(lineVisibility).every(v => v);
            Object.keys(lineVisibility).forEach(key => {
                lineVisibility[key] = !allVisible;
            });
            if (serverLinesData) {
                renderServerLines(serverLinesData);
            }
        }
        
        function copyToClipboard(text) {
            if (!text) {
                showMessage('没有可复制的内容', 'warning');
                return;
            }
            // 优先使用 Clipboard API（需要 HTTPS 或 localhost）
            if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    showMessage('已复制到剪贴板 ✅', 'success');
                }).catch(() => {
                    _fallbackCopy(text);
                });
            } else {
                _fallbackCopy(text);
            }
        }

        function _fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                const ok = document.execCommand('copy');
                if (ok) {
                    showMessage('已复制到剪贴板 ✅', 'success');
                } else {
                    showMessage('复制失败，请手动复制', 'error');
                }
            } catch (e) {
                showMessage('复制失败，请手动复制', 'error');
            }
            document.body.removeChild(textarea);
        }

        // ==================== 一键导入播放器功能 ====================
        
        // 从线路配置获取 scheme/host/port（直接使用API返回的字段）
        function getLineInfo(line) {
            return {
                scheme: line.is_https ? 'https' : 'http',
                host: line.server_url,
                port: line.port || (line.is_https ? 443 : 80)
            };
        }
        
        function showImportAllDialog() {
            if (!serverLinesData || !serverLinesData.account) {
                showMessage('请先绑定Emby账号', 'error');
                return;
            }
            if (!serverLinesData.lines || serverLinesData.lines.length === 0) {
                showMessage('暂无可用线路', 'error');
                return;
            }
            
            const account = serverLinesData.account;
            const username = account.username || '';
            const password = account.password || '';
            const lines = serverLinesData.lines;
            const encodedUser = encodeURIComponent(username);
            const encodedPwd = encodeURIComponent(password);
            
            // ========== SenPlayer（支持多线路一次性导入） ==========
            // senplayer://importserver?type=emby&name=服名&address=https://线路1:443&username=xx&password=xx&address1name=线路2名&address1=线路2地址:端口
            const siteName = dashboardMeta.siteName || 'Emby';
            const firstLine = lines[0];
            const firstInfo = getLineInfo(firstLine);
            const firstAddr = `${firstInfo.scheme}://${firstInfo.host}:${firstInfo.port}`;
            let senParams = `type=emby&name=${encodeURIComponent(siteName)}&address=${encodeURIComponent(firstAddr)}&username=${encodedUser}&password=${encodedPwd}`;
            lines.slice(1).forEach((line, i) => {
                const info = getLineInfo(line);
                const addr = `${info.scheme}://${info.host}:${info.port}`;
                senParams += `&address${i + 1}name=${encodeURIComponent(line.name)}&address${i + 1}=${encodeURIComponent(addr)}`;
            });
            const senplayerUrl = `https://gocy.pages.dev/#senplayer://importserver?${senParams}`;
            
            // ========== Forward（支持多线路一次性导入） ==========
            // forward://import?type=emby&scheme=https&host=xx&port=443&title=主线路名&username=xx&password=xx&line1=https://host:port&line1title=线路名
            let fwdParams = `type=emby&scheme=${firstInfo.scheme}&host=${encodeURIComponent(firstInfo.host)}&port=${firstInfo.port}&title=${encodeURIComponent(siteName)}&username=${encodedUser}&password=${encodedPwd}`;
            lines.slice(1).forEach((line, i) => {
                const info = getLineInfo(line);
                const addr = `${info.scheme}://${info.host}:${info.port}`;
                fwdParams += `&line${i + 1}=${encodeURIComponent(addr)}&line${i + 1}title=${encodeURIComponent(line.name)}`;
            });
            const forwardUrl = `https://gocy.pages.dev/#forward://import?${fwdParams}`;
            
            // ========== Hills（支持多线路一次性导入） ==========
            // hills://import?type=emby&scheme=https&host=xx&port=443&title=主线路名&username=xx&password=xx&line1=http%3a%2f%2fhost%3aport&line1title=线路名
            let hillsParams = `type=emby&scheme=${firstInfo.scheme}&host=${encodeURIComponent(firstInfo.host)}&port=${firstInfo.port}&title=${encodeURIComponent(siteName)}&username=${encodedUser}&password=${encodedPwd}`;
            lines.slice(1).forEach((line, i) => {
                const info = getLineInfo(line);
                const addr = `${info.scheme}://${info.host}:${info.port}`;
                hillsParams += `&line${i + 1}title=${encodeURIComponent(line.name)}&line${i + 1}=${encodeURIComponent(addr)}`;
            });
            const hillsUrl = `https://gocy.pages.dev/#hills://import?${hillsParams}`;
            
            // 构建复制信息
            let copyText = `账号: ${username}\n密码: ${password}\n\n`;
            lines.forEach((line) => { copyText += `${line.name}: ${line.full_url}\n`; });
            
            const safeUser = username.replace(/</g, '&lt;');
            const lineCount = lines.length;
            
            // 创建弹窗
            const overlay = document.createElement('div');
            overlay.className = 'import-dialog-overlay';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            
            overlay.innerHTML = `
                <div class="import-dialog">
                    <div class="import-dialog-header">
                        <h3>📲 一键导入播放器</h3>
                        <button class="import-dialog-close" onclick="this.closest('.import-dialog-overlay').remove()">✕</button>
                    </div>
                    <div class="import-dialog-account">
                        <div class="import-account-info">
                            <span>👤 <strong>${safeUser}</strong></span>
                            <span class="import-line-count">共 ${lineCount} 条线路</span>
                        </div>
                    </div>
                    <p class="import-dialog-tip">点击播放器按钮，自动导入服务器地址和账号密码。需先安装对应 App。</p>
                    <div class="import-dialog-buttons">
                        <a href="${senplayerUrl}" target="_blank" class="import-player-btn senplayer">
                            <span class="import-player-icon">🎬</span>
                            <div class="import-player-info">
                                <span class="import-player-name">SenPlayer</span>
                                <span class="import-player-desc">iOS / macOS · 一次导入全部 ${lineCount} 条线路</span>
                            </div>
                            <span class="import-arrow">→</span>
                        </a>
                        <a href="${forwardUrl}" target="_blank" class="import-player-btn forward">
                            <span class="import-player-icon">▶️</span>
                            <div class="import-player-info">
                                <span class="import-player-name">Forward</span>
                                <span class="import-player-desc">iOS / iPadOS · 一次导入全部 ${lineCount} 条线路</span>
                            </div>
                            <span class="import-arrow">→</span>
                        </a>
                        <a href="${hillsUrl}" target="_blank" class="import-player-btn hills">
                            <span class="import-player-icon">⛰️</span>
                            <div class="import-player-info">
                                <span class="import-player-name">Hills</span>
                                <span class="import-player-desc">iOS / iPadOS · 一次导入全部 ${lineCount} 条线路</span>
                            </div>
                            <span class="import-arrow">→</span>
                        </a>
                    </div>
                    <div class="import-dialog-footer">
                        <button class="import-copy-all-btn" onclick="copyAllImportInfo()">📋 复制全部连接信息</button>
                    </div>
                </div>
            `;
            
            window._importCopyText = copyText;
            document.body.appendChild(overlay);
        }
        
        function copyAllImportInfo() {
            if (window._importCopyText) {
                copyToClipboard(window._importCopyText);
            }
        }

        // ==================== 购买套餐功能 ====================
        let selectedPlan = null;
        let selectedDuration = 1;
        let selectedPayment = 'alipay';
        let plansData = []; // 存储从API加载的套餐数据

        function normalizePlanIdentifier(value) {
            if (value === undefined || value === null) {
                return '';
            }
            return String(value).trim();
        }

        function getPlanIdentifier(plan) {
            if (!plan || typeof plan !== 'object') {
                return '';
            }
            return normalizePlanIdentifier(plan.id) || normalizePlanIdentifier(plan.type);
        }

        function findPlanByIdentifier(identifier) {
            const target = normalizePlanIdentifier(identifier);
            if (!target) {
                return null;
            }
            return plansData.find(plan => {
                const planId = getPlanIdentifier(plan);
                const planType = normalizePlanIdentifier(plan && plan.type);
                const legacyIds = Array.isArray(plan && plan.legacy_ids)
                    ? plan.legacy_ids.map(normalizePlanIdentifier)
                    : [];
                return planId === target || planType === target || legacyIds.includes(target);
            }) || null;
        }

        function isWhitelistPlanEntry(plan) {
            if (!plan || typeof plan !== 'object') {
                return false;
            }
            if (plan.is_whitelist) {
                return true;
            }
            const planType = normalizePlanIdentifier(plan.type).toLowerCase();
            const legacyIds = Array.isArray(plan.legacy_ids)
                ? plan.legacy_ids.map(normalizePlanIdentifier)
                : [];
            return planType === 'whitelist' || legacyIds.includes('whitelist') || legacyIds.includes('0');
        }
        
        // 获取套餐的各周期价格（优先使用配置的价格，否则根据月付价格计算）
        function getPlanPrices(plan) {
            const priceOnceRaw = Number(plan.price_once || 0) || 0;
            const price1mRaw = Number(plan.price_1m || 0) || 0;
            const priceLegacyRaw = Number(plan.price || 0) || 0;
            const isWhitelistPlan = isWhitelistPlanEntry(plan);

            let oncePrice = priceOnceRaw;
            let monthlyPrice = Number(plan.price_1m || plan.price || 0) || 0;
            let quarterPrice = Number(plan.price_3m || 0) || 0;
            let halfyearPrice = Number(plan.price_6m || 0) || 0;
            let yearlyPrice = Number(plan.price_12m || 0) || 0;

            // 白名单套餐兼容兜底：若历史配置把价格填在月付/旧 price 字段，统一按最小正数显示/下单
            if (isWhitelistPlan) {
                const whitelistCandidates = [priceOnceRaw, price1mRaw, priceLegacyRaw].filter(v => v > 0);
                oncePrice = whitelistCandidates.length ? Math.min(...whitelistCandidates) : 0;
                monthlyPrice = 0;
                quarterPrice = 0;
                halfyearPrice = 0;
                yearlyPrice = 0;
            }
            return {
                0: oncePrice,  // 一次性价格
                1: monthlyPrice,
                3: quarterPrice || Math.round(monthlyPrice * 2.8 * 100) / 100,
                6: halfyearPrice || Math.round(monthlyPrice * 5 * 100) / 100,
                12: yearlyPrice || Math.round(monthlyPrice * 9 * 100) / 100
            };
        }
        
        // 计算节省金额
        function calculateSaving(monthlyPrice, duration, actualPrice) {
            const original = monthlyPrice * duration;
            return Math.round((original - actualPrice) * 100) / 100;
        }
        
        // 加载套餐列表
        async function loadPlans() {
            const plansGrid = document.getElementById('plansGrid');
            if (!plansGrid) return;
            
            try {
                const response = await fetch('/api/plans');
                const data = await parseResponseData(response);
                
                if (data.success && data.plans) {
                    plansData = data.plans;
                    renderPlansNew(data.plans);
                } else {
                    plansGrid.innerHTML = '<div class="plans-error">加载套餐失败，请刷新重试</div>';
                }
            } catch (error) {
                console.error('加载套餐失败:', error);
                plansGrid.innerHTML = '<div class="plans-error">加载套餐失败，请刷新重试</div>';
            }
        }
        
        // 渲染新版套餐卡片（商品详情展示 + 立即购买按钮）
        function renderPlansNew(plans) {
            const plansGrid = document.getElementById('plansGrid');
            if (!plansGrid || !plans.length) return;
            
            // 直接使用所有套餐（每个套餐有唯一ID，不再按type分组去重）
            const finalPlans = plans;
            
            plansGrid.innerHTML = finalPlans.map(plan => {
                const planId = getPlanIdentifier(plan);
                const isPopular = plan.popular;
                const durationDays = plan.duration_days || 30;
                const isWhitelistPlan = isWhitelistPlanEntry(plan);
                const isPermanent = isWhitelistPlan;
                const isShortTerm = !isPermanent && durationDays < 30;
                const cardClass = [isPopular ? 'popular' : '', isPermanent ? 'ultimate' : ''].filter(Boolean).join(' ');
                
                // 判断是否有任何可购买的价格
                const prices = getPlanPrices(plan);
                const priceOnce = prices[0] || 0;
                const monthlyPrice = prices[1] || 0;
                // 互斥：有一次性价格优先。白名单套餐不再回退月付价，避免金额误判
                const effectiveOncePrice = priceOnce > 0 ? priceOnce : 0;
                const useOnceMode = effectiveOncePrice > 0;
                const hasAnyPrice = useOnceMode ? true : (!isWhitelistPlan && monthlyPrice > 0);
                
                // 显示价格：互斥，一次性优先
                let displayPrice = 0;
                let pricePeriod = '';
                if (useOnceMode) {
                    displayPrice = effectiveOncePrice;
                    pricePeriod = isPermanent ? '' : `/${durationDays}天`;
                } else if (!isWhitelistPlan && monthlyPrice > 0) {
                    displayPrice = monthlyPrice;
                    pricePeriod = isShortTerm ? `/${durationDays}天` : '/月起';
                }

                const displayPriceText = Number.isInteger(displayPrice)
                    ? String(displayPrice)
                    : String(displayPrice.toFixed(2)).replace(/\.00$/, '');

                const planTitle = plan.name || '套餐';
                const planSubtitle = plan.description || (isPermanent ? '一次开通，长期稳定可用' : '按需续费，灵活管理开通周期');
                const featureList = Array.isArray(plan.features) && plan.features.length > 0
                    ? plan.features.slice(0, 5)
                    : [
                        isPermanent ? '长期可用权限' : '订阅权限自动生效',
                        '账号状态同步更新',
                        '支持在线支付开通',
                        '支持续费与扩展'
                    ];
                const pricingTypeText = useOnceMode ? '一次性计费' : '周期计费';
                const durationText = isPermanent ? '永久有效' : `有效期 ${durationDays} 天`;
                
                return `
                    <div class="plan-card-new ${cardClass}" data-plan-type="${planId}">
                        <div class="plan-topline">
                            <span class="plan-ribbon ${isPopular ? 'popular' : 'normal'}">${isPopular ? '🔥 最受欢迎' : '✨ 推荐套餐'}</span>
                            ${isPermanent ? '<span class="plan-ribbon ultimate">♾️ 永久</span>' : ''}
                        </div>
                        <div class="plan-header-new">
                            <span class="plan-icon-wrap"><span class="plan-icon">${plan.icon || '📦'}</span></span>
                            <div class="plan-title-group">
                                <h3 class="plan-name-new">${planTitle}</h3>
                                <p class="plan-subtitle">${planSubtitle}</p>
                            </div>
                        </div>
                        
                        ${hasAnyPrice ? `
                        <div class="plan-price-display">
                            <span class="price-currency">¥</span>
                            <span class="price-amount">${displayPriceText}</span>
                            <span class="price-period">${pricePeriod}</span>
                        </div>
                        ` : `
                        <div class="plan-price-display no-price">
                            <span class="price-empty">仅限管理员分配</span>
                        </div>
                        `}
                        
                        <div class="plan-meta-row">
                            <span class="plan-meta-chip">⏱ ${durationText}</span>
                            <span class="plan-meta-chip">💳 ${pricingTypeText}</span>
                        </div>
                        
                        <ul class="plan-features-new">
                            ${featureList.map(f => `<li><span class="check-icon">✓</span>${f}</li>`).join('')}
                        </ul>
                        
                        ${hasAnyPrice ? `
                        <button class="plan-buy-btn ${cardClass}" onclick="openPurchaseDialog('${planId}')">
                            <span>立即购买</span>
                            <span class="buy-btn-arrow">→</span>
                        </button>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
        
        // 生成4位随机验证码
        function generateVerifyCode() {
            return Math.floor(1000 + Math.random() * 9000).toString();
        }
        
        // 当前验证码
        let currentVerifyCode = '';
        
        // 打开购买弹窗
        function openPurchaseDialog(planType) {
            selectedPlan = normalizePlanIdentifier(planType);
            selectedDuration = 1;
            selectedPayment = 'alipay';
            currentVerifyCode = generateVerifyCode();
            
            // 获取套餐价格（按ID匹配，兼容旧type匹配）
            const plan = findPlanByIdentifier(selectedPlan);
            
            // 使用后台配置的名称和图标
            const planName = plan ? (plan.name || '套餐') : '套餐';
            const planIcon = plan ? (plan.icon || '📦') : '📦';
            const prices = plan ? getPlanPrices(plan) : { 0: 0, 1: 0, 3: 0, 6: 0, 12: 0 };
            const durationDays = plan ? (plan.duration_days || 30) : 30;
            const isWhitelistPlan = !!(plan && isWhitelistPlanEntry(plan));
            const isPermanent = isWhitelistPlan;
            const isShortTerm = !isPermanent && durationDays < 30;
            const hasOncePrice = prices[0] > 0;
            const hasMonthlyPrice = prices[1] > 0;
            
            // 白名单套餐必须使用一次性价格
            if (isPermanent && !hasOncePrice) {
                showMessage('该白名单套餐未配置一次性价格，请联系管理员', 'error');
                return;
            }
            
            // 互斥逻辑：有一次性价格就只显示一次性，否则显示月付/季付等
            const useOnceMode = prices[0] > 0;
            
            // 默认选中
            if (useOnceMode) {
                selectedDuration = 0;
            } else {
                selectedDuration = 1;
            }
            
            // 构建时长选项
            let durationGridHTML = '';
            const durationOptions = [];
            
            if (useOnceMode) {
                // 一次性模式：只显示一次性价格选项
                const onceName = isPermanent ? '永久' : `${durationDays}天`;
                durationOptions.push({
                    duration: 0, name: onceName, price: prices[0],
                    tag: isPermanent ? '永久' : '', active: true
                });
            } else if (hasMonthlyPrice) {
                // 周期模式：显示月付/季付/半年付/年付
                if (isShortTerm) {
                    durationOptions.push({
                        duration: 1, name: `${durationDays}天`, price: prices[1],
                        tag: '', active: selectedDuration === 1
                    });
                } else {
                    durationOptions.push({ duration: 1, name: '月付', price: prices[1], tag: '', active: selectedDuration === 1 });
                    if (prices[3] > 0) durationOptions.push({ duration: 3, name: '季付', price: prices[3], tag: '推荐', active: false });
                    if (prices[6] > 0) durationOptions.push({ duration: 6, name: '半年付', price: prices[6], tag: '', active: false });
                    if (prices[12] > 0) durationOptions.push({ duration: 12, name: '年付', price: prices[12], tag: '最划算', active: false });
                }
            }
            
            durationGridHTML = durationOptions.map(opt => {
                const optionPriceText = Number.isInteger(opt.price)
                    ? String(opt.price)
                    : String(opt.price.toFixed(2)).replace(/\.00$/, '');
                return `
                <label class="dur-card ${opt.active ? 'active' : ''}" data-duration="${opt.duration}">
                    <input type="radio" name="dur" value="${opt.duration}" ${opt.active ? 'checked' : ''} onchange="updateDuration(${opt.duration})">
                    <span class="dur-name">${opt.name}</span>
                    <span class="dur-price">¥${optionPriceText}</span>
                    ${opt.tag ? `<span class="dur-tag ${opt.tag === '最划算' ? 'hot' : ''}">${opt.tag}</span>` : ''}
                </label>
            `;
            }).join('');
            
            const initialPrice = prices[selectedDuration] || 0;
            const initialPriceText = Number.isInteger(initialPrice)
                ? String(initialPrice)
                : String(initialPrice.toFixed(2)).replace(/\.00$/, '');
            const planSubtitle = isPermanent ? '永久服务' : (isShortTerm ? durationDays + '天体验' : '订阅服务');
            
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.id = 'purchaseDialogOverlay';
            overlay.onclick = (e) => { if (e.target === overlay) closePurchaseDialog(); };
            overlay.innerHTML = `
                <div class="purchase-dialog-horizontal" onclick="event.stopPropagation()">
                    <button class="dialog-close-x" onclick="closePurchaseDialog()">×</button>
                    
                    <!-- 左侧: 套餐信息 -->
                    <div class="dialog-left-panel">
                        <div class="dialog-left-head">支付摘要</div>
                        <div class="selected-plan-info">
                            <span class="plan-icon-lg">${planIcon}</span>
                            <div class="plan-text">
                                <h3>${planName}</h3>
                                <p>${planSubtitle}</p>
                            </div>
                        </div>
                        <div class="price-display-lg">
                            <span class="currency">¥</span>
                            <span class="amount" id="dialogPriceAmount">${initialPriceText}</span>
                        </div>
                        <div class="dialog-pay-tip">支付后将自动激活，订单可在下方实时查看状态</div>
                        <div class="verify-section">
                            <div class="verify-label">安全验证</div>
                            <div class="verify-row">
                                <div class="verify-code-box" id="verifyCodeBox">${currentVerifyCode}</div>
                                <button class="verify-refresh-btn" onclick="refreshVerifyCode()" title="刷新验证码">↻</button>
                            </div>
                            <input type="text" id="verifyCodeInput" class="verify-input" placeholder="输入验证码" maxlength="4" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
                        </div>
                        <button class="confirm-pay-btn" onclick="confirmPurchase()"><span>确认支付</span><span class="pay-arrow">→</span></button>
                    </div>
                    
                    <!-- 右侧: 选择项 -->
                    <div class="dialog-right-panel">
                        <div class="dialog-right-head">
                            <h4>购买配置</h4>
                            <p>请先选择时长，再确认支付方式</p>
                        </div>
                        <!-- 时长选择 -->
                        <div class="option-group">
                            <div class="option-title">选择时长</div>
                            <div class="duration-grid">
                                ${durationGridHTML}
                            </div>
                        </div>
                        
                        <!-- 支付方式 -->
                        <div class="option-group">
                            <div class="option-title">支付方式</div>
                            <div class="pay-grid">
                                <label class="pay-card active">
                                    <input type="radio" name="payMethod" value="alipay" checked onchange="updatePaymentInDialog('alipay')">
                                    <div class="pay-icon alipay">
                                        <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8.67,2C4.7,2 2,4.7 2,8.67V15.33C2,19.3 4.7,22 8.67,22H15.33C19.3,22 22,19.3 22,15.33V8.67C22,4.7 19.3,2 15.33,2H8.67M15.29,6C15.77,6 16.18,6.41 16.18,6.88V12.94C18,14.53 16.5,17.62 13.62,17.38L8.21,17.5C8.21,17.5 15.16,11.54 14.28,10.34C13.4,9.14 9.5,10.28 8.21,10.94L8.21,8.75L11.15,7.05L15.29,6Z"/></svg>
                                    </div>
                                    <div class="pay-meta">
                                        <span class="pay-name">支付宝</span>
                                        <span class="pay-desc">推荐，快速到账</span>
                                    </div>
                                </label>
                                <label class="pay-card">
                                    <input type="radio" name="payMethod" value="wxpay" onchange="updatePaymentInDialog('wxpay')">
                                    <div class="pay-icon wechat">
                                        <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9.5,4C5.36,4 2,6.69 2,10C2,11.89 3.08,13.56 4.78,14.66L4,17L6.5,15.5C7.39,15.81 8.37,16 9.41,16C9.15,15.37 9,14.7 9,14C9,10.69 12.13,8 16,8C16.19,8 16.38,8 16.56,8.03C15.54,5.69 12.78,4 9.5,4M6.5,6.5A1,1 0 0,1 7.5,7.5A1,1 0 0,1 6.5,8.5A1,1 0 0,1 5.5,7.5A1,1 0 0,1 6.5,6.5M11.5,6.5A1,1 0 0,1 12.5,7.5A1,1 0 0,1 11.5,8.5A1,1 0 0,1 10.5,7.5A1,1 0 0,1 11.5,6.5M16,9C12.69,9 10,11.24 10,14C10,16.76 12.69,19 16,19C16.67,19 17.31,18.92 17.91,18.75L20,20L19.38,18.13C20.95,17.22 22,15.71 22,14C22,11.24 19.31,9 16,9M14,11.5A1,1 0 0,1 15,12.5A1,1 0 0,1 14,13.5A1,1 0 0,1 13,12.5A1,1 0 0,1 14,11.5M18,11.5A1,1 0 0,1 19,12.5A1,1 0 0,1 18,13.5A1,1 0 0,1 17,12.5A1,1 0 0,1 18,11.5Z"/></svg>
                                    </div>
                                    <div class="pay-meta">
                                        <span class="pay-name">微信支付</span>
                                        <span class="pay-desc">便捷，扫码支付</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
        }
        
        // 关闭购买弹窗
        function closePurchaseDialog() {
            const overlay = document.getElementById('purchaseDialogOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 200);
            }
        }
        
        // 更新选择的时长
        function updateDuration(duration) {
            selectedDuration = duration;
            // 更新卡片选中状态
            document.querySelectorAll('.dur-card').forEach(card => {
                card.classList.toggle('active', card.dataset.duration == duration);
            });
            // 更新价格显示
            const plan = findPlanByIdentifier(selectedPlan);
            const prices = plan ? getPlanPrices(plan) : { 0: 0, 1: 0, 3: 0, 6: 0, 12: 0 };
            const priceAmount = document.getElementById('dialogPriceAmount');
            if (priceAmount) {
                const price = prices[duration] || 0;
                const priceText = Number.isInteger(price)
                    ? String(price)
                    : String(price.toFixed(2)).replace(/\.00$/, '');
                priceAmount.textContent = priceText;
            }
        }
        
        // 更新弹窗中的支付方式
        function updatePaymentInDialog(method) {
            selectedPayment = method;
            document.querySelectorAll('.pay-card').forEach(card => {
                card.classList.toggle('active', card.querySelector('input').value === method);
            });
        }
        
        // 刷新验证码
        function refreshVerifyCode() {
            currentVerifyCode = generateVerifyCode();
            const codeBox = document.getElementById('verifyCodeBox');
            const input = document.getElementById('verifyCodeInput');
            if (codeBox) {
                codeBox.textContent = currentVerifyCode;
                codeBox.classList.add('refresh-animate');
                setTimeout(() => codeBox.classList.remove('refresh-animate'), 300);
            }
            if (input) {
                input.value = '';
                input.focus();
            }
        }
        
        // 确认购买
        async function confirmPurchase() {
            // 验证码校验
            const inputCode = document.getElementById('verifyCodeInput')?.value;
            if (inputCode !== currentVerifyCode) {
                showMessage('验证码错误，请重新输入', 'error');
                return;
            }
            
            closePurchaseDialog();
            
            // 获取价格
            const plan = findPlanByIdentifier(selectedPlan);
            const prices = plan ? getPlanPrices(plan) : { 0: 0, 1: 0, 3: 0, 6: 0, 12: 0 };
            const price = prices[selectedDuration] || 0;
            
            await createOrderDirect(selectedPlan, selectedDuration, selectedPayment);
        }
        
        // 直接创建订单
        async function createOrderDirect(planType, duration, paymentMethod) {
            const normalizedPlanType = normalizePlanIdentifier(planType);
            // 检查是否有未支付订单
            if (hasPendingOrder) {
                showMessage('您有未支付的订单，请先支付或取消后再购买', 'warning');
                // 滚动到订单列表
                const ordersSection = document.querySelector('.my-orders-section');
                if (ordersSection) {
                    ordersSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            
            try {
                showMessage('正在创建订单...', 'info');

                if (!normalizedPlanType) {
                    showMessage('请选择有效的套餐', 'error');
                    return;
                }
                
                const response = await fetch('/api/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan_type: normalizedPlanType,
                        duration: duration,
                        payment_method: paymentMethod
                    })
                });

                const rawText = await response.text();
                let data = null;
                try {
                    data = rawText ? JSON.parse(rawText) : {};
                } catch (_) {
                    data = null;
                }
                if (!response.ok && !data) {
                    showMessage(`创建订单失败：HTTP ${response.status}`, 'error');
                    return;
                }
                
                if (data && data.success) {
                    // 刷新订单列表
                    loadMyOrders();
                    
                    // 创建支付
                    const payResponse = await fetch('/api/payment/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_no: data.order.order_no,
                            payment_method: paymentMethod
                        })
                    });
                    
                    const payData = await parseResponseData(payResponse);
                    
                    if (payData.success) {
                        if (payData.payment_url) {
                            showPaymentRedirectDialog(payData.payment_url, data.order);
                        } else {
                            showMessage('获取支付链接失败', 'error');
                        }
                    } else if (payData.test_mode) {
                        showMessage(payData.error || '支付功能未配置', 'warning');
                        loadMyOrders(); // 刷新订单列表显示待支付订单
                    } else {
                        showMessage(payData.error || '创建支付失败', 'error');
                    }
                } else {
                    showMessage((data && data.error) || `创建订单失败（HTTP ${response.status}）`, 'error');
                }
            } catch (error) {
                console.error('创建订单失败:', error);
                showMessage(`网络错误：${error && error.message ? error.message : '请稍后重试'}`, 'error');
            }
        }
        
        // 保留旧版函数兼容性
        function selectPlan(planType, basePrice) {
            quickBuy(planType, 1, basePrice);
        }
        
        function updatePriceDisplay(basePrice) {
            // 旧版兼容，已不使用
        }
        
        function updateOrderSummary() {
            // 旧版兼容，已不使用
        }
        
        async function createOrder() {
            if (!normalizePlanIdentifier(selectedPlan)) {
                showMessage('请先选择套餐', 'error');
                return;
            }
            await createOrderDirect(selectedPlan, selectedDuration, selectedPayment);
        }
        
        // 监听支付方式选择变化
        document.addEventListener('DOMContentLoaded', () => {
            // 加载套餐列表
            loadPlans();
            // 加载我的订单
            loadMyOrders();
            
            document.querySelectorAll('input[name="payment"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    selectedPayment = e.target.value;
                    // 更新选中状态样式
                    document.querySelectorAll('.payment-option-inline').forEach(opt => {
                        opt.classList.toggle('active', opt.querySelector('input').value === selectedPayment);
                    });
                });
            });
            
            // 检查是否有支付回调待确认
            checkPendingOrder();
            
            // 检查是否需要绑定Emby账号
            checkNeedEmbyBind();
        });
        
        // ==================== 我的订单功能 ====================
        let hasPendingOrder = false; // 是否有未支付订单
        
        // 加载我的订单
        async function loadMyOrders() {
            const ordersList = document.getElementById('myOrdersList');
            if (!ordersList) return;
            
            try {
                const response = await fetch('/api/orders/my');
                const data = await parseResponseData(response);
                
                if (data.success && data.orders) {
                    renderOrders(data.orders);
                } else {
                    ordersList.innerHTML = `
                        <div class="orders-empty">
                            <div class="empty-icon">📭</div>
                            <p>暂无订单记录</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('加载订单失败:', error);
                ordersList.innerHTML = `
                    <div class="orders-empty">
                        <div class="empty-icon">❌</div>
                        <p>加载失败，请刷新重试</p>
                    </div>
                `;
            }
        }
        
        // 渲染订单列表
        function renderOrders(orders) {
            const ordersList = document.getElementById('myOrdersList');
            if (!ordersList || !orders.length) {
                ordersList.innerHTML = `
                    <div class="orders-empty">
                        <div class="empty-icon">📭</div>
                        <p>暂无订单记录</p>
                    </div>
                `;
                hasPendingOrder = false;
                return;
            }
            
            // 检查是否有未支付订单
            hasPendingOrder = orders.some(o => o.payment_status === 'pending');
            
            const statusMap = {
                'pending': { text: '⏳ 待支付', class: 'pending' },
                'paid': { text: '✅ 已支付', class: 'paid' },
                'cancelled': { text: '❌ 已取消', class: 'cancelled' },
                'expired': { text: '⌛ 已过期', class: 'expired' }
            };
            
            ordersList.innerHTML = orders.map(order => {
                const status = statusMap[order.payment_status] || { text: order.payment_status, class: '' };
                const isPending = order.payment_status === 'pending';
                const createTime = new Date(order.created_at).toLocaleString('zh-CN');
                
                return `
                    <div class="order-card ${isPending ? 'pending' : ''}">
                        <div class="order-info">
                            <div class="order-main">
                                <span class="order-plan">${order.plan_name || order.plan_type}</span>
                                <span class="order-duration">${order.duration_text || (order.duration_days ? order.duration_days + '天' : (order.duration_months || 1) + '个月')}</span>
                                <span class="order-status ${status.class}">${status.text}</span>
                            </div>
                            <div class="order-meta">
                                <span class="order-no">${order.order_no}</span>
                                <span class="order-time">${createTime}</span>
                            </div>
                        </div>
                        <span class="order-price">¥${parseFloat(order.final_price || 0).toFixed(2)}</span>
                        <div class="order-actions">
                            ${isPending ? `
                                <button class="order-btn pay" onclick="continuePayOrder('${order.order_no}')">继续支付</button>
                                <button class="order-btn cancel" onclick="cancelOrder('${order.order_no}')">取消</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // 继续支付订单
        async function continuePayOrder(orderNo) {
            try {
                showMessage('正在获取支付链接...', 'info');
                
                const response = await fetch('/api/payment/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_no: orderNo,
                        payment_method: selectedPayment
                    })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success && data.payment_url) {
                    // 获取订单信息用于显示
                    const orderResponse = await fetch('/api/orders/my');
                    const orderData = await parseResponseData(orderResponse);
                    const order = orderData.orders?.find(o => o.order_no === orderNo);
                    
                    if (order) {
                        showPaymentRedirectDialog(data.payment_url, order);
                    } else {
                        window.location.href = data.payment_url;
                    }
                } else {
                    showMessage(data.error || '获取支付链接失败', 'error');
                }
            } catch (error) {
                console.error('继续支付失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }
        
        // 取消订单 - 显示确认弹窗
        let cancellingOrderNo = '';
        
        function cancelOrder(orderNo) {
            cancellingOrderNo = orderNo;
            showCancelOrderDialog(orderNo);
        }
        
        // 显示取消订单确认弹窗
        function showCancelOrderDialog(orderNo) {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.id = 'cancelOrderOverlay';
            overlay.onclick = (e) => { if (e.target === overlay) closeCancelOrderDialog(); };
            overlay.innerHTML = `
                <div class="confirm-dialog cancel-order-dialog" onclick="event.stopPropagation()">
                    <div class="icon">⚠️</div>
                    <h3>确认取消订单？</h3>
                    <div class="cancel-info">
                        <p>订单号: <strong>${orderNo}</strong></p>
                        <p class="warning-text">取消后无法恢复，如需购买请重新下单</p>
                    </div>
                    <div class="buttons">
                        <button class="btn-cancel" onclick="closeCancelOrderDialog()">再想想</button>
                        <button class="btn-confirm btn-danger" onclick="confirmCancelOrder()">确认取消</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
        }
        
        function closeCancelOrderDialog() {
            const overlay = document.getElementById('cancelOrderOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 200);
            }
        }
        
        // 确认取消订单
        async function confirmCancelOrder() {
            closeCancelOrderDialog();
            
            try {
                showMessage('正在取消订单...', 'info');
                
                const response = await fetch('/api/orders/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_no: cancellingOrderNo })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('订单已取消', 'success');
                    loadMyOrders(); // 刷新订单列表
                } else {
                    showMessage(data.error || '取消订单失败', 'error');
                }
            } catch (error) {
                console.error('取消订单失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }
        
        // 全局变量保存支付信息
        let pendingPaymentUrl = '';
        let pendingOrderNo = '';
        
        function showPaymentRedirectDialog(paymentUrl, order) {
            // 保存支付URL到全局变量，避免HTML转义问题
            pendingPaymentUrl = paymentUrl;
            pendingOrderNo = order.order_no;
            
            // 创建支付确认弹窗
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.id = 'paymentOverlay';
            overlay.innerHTML = `
                <div class="confirm-dialog payment-dialog" onclick="event.stopPropagation()">
                    <div class="icon">💳</div>
                    <h3>即将跳转支付</h3>
                    <div class="payment-info">
                        <p>订单号: ${order.order_no}</p>
                        <p>金额: <strong style="color: #f59e0b; font-size: 24px;">¥${parseFloat(order.final_price || 0).toFixed(2)}</strong></p>
                        <p>支付方式: ${selectedPayment === 'alipay' ? '支付宝' : selectedPayment === 'wxpay' ? '微信支付' : 'QQ钱包'}</p>
                    </div>
                    <p class="payment-tip">点击下方按钮跳转到支付页面完成支付</p>
                    <div class="buttons">
                        <button class="btn-cancel" onclick="closePaymentDialog()">取消</button>
                        <button class="btn-confirm" onclick="goToPayment()">立即支付</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // 使用 classList.add('show') 来显示弹窗，与 CSS 保持一致
            setTimeout(() => overlay.classList.add('show'), 10);
        }
        
        function goToPayment() {
            // 保存订单号到本地，用于回来后查询状态
            localStorage.setItem('pendingOrderNo', pendingOrderNo);
            // 跳转到易支付页面
            window.location.href = pendingPaymentUrl;
        }
        
        function showPaymentDialog(paymentUrl, qrCodeUrl, order) {
            // 创建支付弹窗（保留旧版二维码方式备用）
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.id = 'paymentOverlay';
            overlay.innerHTML = `
                <div class="confirm-dialog payment-dialog" onclick="event.stopPropagation()">
                    <div class="icon">💳</div>
                    <h3>扫码支付</h3>
                    <div class="payment-info">
                        <p>订单号: ${order.order_no}</p>
                        <p>金额: ¥${parseFloat(order.final_price || 0).toFixed(2)}</p>
                    </div>
                    <div class="qr-code">
                        <img src="${qrCodeUrl}" alt="支付二维码">
                    </div>
                    <p class="payment-tip">请使用${selectedPayment === 'alipay' ? '支付宝' : '微信'}扫码支付</p>
                    <div class="buttons">
                        <button class="btn-cancel" onclick="closePaymentDialog()">取消支付</button>
                        <button class="btn-confirm" onclick="checkPaymentStatus('${order.order_no}')">我已支付</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
        }
        
        function closePaymentDialog() {
            const overlay = document.getElementById('paymentOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 200);
            }
        }
        
        async function checkPaymentStatus(orderNo) {
            showMessage('正在确认支付状态...', 'info');
            
            try {
                const response = await fetch(`/api/payment/query?order_no=${orderNo}`);
                const data = await parseResponseData(response);
                
                if (data.success && data.paid) {
                    closePaymentDialog();
                    loadMyOrders(); // 刷新订单列表
                    
                    // 根据是否有 Emby 账号显示不同提示
                    if (data.has_emby_account) {
                        // 已有 Emby 账号，直接延长订阅时间
                        showMessage('🎉 支付成功！订阅已自动延长', 'success');
                        switchSection('subscription');
                        loadSubscriptionInfo();
                    } else {
                        // 没有 Emby 账号，弹窗引导去创建
                        showPaymentSuccessGuide();
                    }
                } else {
                    showMessage('支付尚未完成，请完成支付后再确认', 'warning');
                }
            } catch (error) {
                console.error('查询支付状态失败:', error);
                showMessage('查询失败，请稍后重试', 'error');
            }
        }
        
        // 支付成功后引导用户创建 Emby 账号的弹窗
        function showPaymentSuccessGuide() {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.id = 'paymentSuccessOverlay';
            overlay.innerHTML = `
                <div class="confirm-dialog" onclick="event.stopPropagation()">
                    <div class="icon">🎉</div>
                    <h3>支付成功！</h3>
                    <p style="margin: 15px 0; color: #666; line-height: 1.6;">
                        您已成功购买订阅，但还未创建 Emby 账号。<br>
                        请前往「我的信息」页面创建您的专属账号，<br>
                        即可开始使用所有服务。
                    </p>
                    <div class="buttons">
                        <button class="btn-cancel" onclick="closePaymentSuccessGuide()">稍后再说</button>
                        <button class="btn-confirm" onclick="goToCreateAccount()">立即创建</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
        }
        
        function closePaymentSuccessGuide() {
            const overlay = document.getElementById('paymentSuccessOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 200);
            }
            // 仍然跳转到订阅信息页面
            switchSection('subscription');
            loadSubscriptionInfo();
        }
        
        function goToCreateAccount() {
            closePaymentSuccessGuide();
            // 跳转到我的信息页面
            switchSection('profile');
        }
        
        // 页面加载时检查是否有待确认的订单
        function checkPendingOrder() {
            const pendingOrderNo = localStorage.getItem('pendingOrderNo');
            if (pendingOrderNo) {
                localStorage.removeItem('pendingOrderNo');
                // 延迟查询，给异步通知一点时间
                setTimeout(() => {
                    checkPaymentStatus(pendingOrderNo);
                }, 1000);
            }
        }

        // ==================== 邀请返利功能 ====================
        async function loadInviteInfo() {
            try {
                const response = await fetch('/api/invite/code');
                const data = await parseResponseData(response);
                
                if (data.success) {
                    document.getElementById('myInviteCode').textContent = data.invite_code;
                    document.getElementById('inviteLink').value = data.invite_url;
                    document.getElementById('totalInvites').textContent = data.total_invites;
                    document.getElementById('validInvites').textContent = data.successful_invites;
                    document.getElementById('totalReward').textContent = data.total_rewards;
                    document.getElementById('pendingReward').textContent = data.pending_rewards || 0;
                }
                
                // 加载邀请记录
                const recordsResponse = await fetch('/api/invite/records');
                const recordsData = await parseResponseData(recordsResponse);
                
                if (recordsData.success && recordsData.records.length > 0) {
                    const recordsList = document.getElementById('inviteRecords');
                    recordsList.innerHTML = recordsData.records.map(record => {
                        // 状态显示
                        let statusHtml = '';
                        if (record.status === 'pending') {
                            statusHtml = '<span style="color:#f59e0b;font-size:12px;">⏳ 待审核 ' + (record.pending_reward || 0) + ' 天</span>';
                        } else if (record.status === 'approved') {
                            statusHtml = '<span style="color:#10b981;font-size:12px;">✅ 已发放</span>';
                        } else {
                            statusHtml = '<span style="color:#9ca3af;font-size:12px;">等待购买</span>';
                        }
                        
                        return `
                            <div class="record-item">
                                <div class="record-user">
                                    <div class="record-avatar">${record.invitee_name?.[0] || '?'}</div>
                                    <div class="record-info">
                                        <div class="record-name">${record.invitee_name}</div>
                                        <div class="record-date">${new Date(record.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div class="record-reward">
                                    ${record.reward_value ? '+' + record.reward_value + ' 天' : ''}
                                    <div>${statusHtml}</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('加载邀请信息失败:', error);
            }
        }
        
        function copyInviteCode() {
            const code = document.getElementById('myInviteCode').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showMessage('邀请码已复制！', 'success');
            }).catch(() => {
                showMessage('复制失败，请手动复制', 'error');
            });
        }
        
        function copyInviteLink() {
            const link = document.getElementById('inviteLink').value;
            navigator.clipboard.writeText(link).then(() => {
                showMessage('邀请链接已复制！', 'success');
            }).catch(() => {
                showMessage('复制失败，请手动复制', 'error');
            });
        }

        // ==================== FAQ 功能 ====================
        let faqData = [];
        let faqCategories = [];
        
        async function loadFAQ() {
            try {
                const response = await fetch('/api/knowledge');
                const result = await parseResponseData(response);
                
                if (result.success) {
                    faqData = result.items || [];
                    faqCategories = result.categories || [];
                    renderFAQCategories();
                    renderFAQList();
                }
            } catch (error) {
                console.error('加载知识库失败:', error);
                document.getElementById('faqList').innerHTML = '<p style="text-align:center;color:#999;">加载失败，请刷新页面重试</p>';
            }
        }
        
        function renderFAQCategories() {
            const container = document.getElementById('faqCategories');
            if (!container) return;
            
            container.innerHTML = '<button class="category-btn active" data-category="all" onclick="filterFAQCategory(\'all\')">全部</button>' +
                faqCategories.map(c => 
                    `<button class="category-btn" data-category="${c.id}" onclick="filterFAQCategory('${c.id}')">${c.name}</button>`
                ).join('');
        }
        
        function renderFAQList(items = null) {
            const list = items || faqData;
            const container = document.getElementById('faqList');
            
            if (!container) return;
            
            if (list.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">暂无常见问题</p>';
                return;
            }
            
            container.innerHTML = list.map(item => `
                <div class="faq-item" data-category="${item.category}">
                    <div class="faq-question" onclick="toggleFAQ(this)">
                        <span class="q-icon">Q</span>
                        <span class="q-text">${escapeHtml(item.question)}</span>
                        <span class="toggle-icon">+</span>
                    </div>
                    <div class="faq-answer">
                        ${item.answer}
                    </div>
                </div>
            `).join('');
        }
        
        function toggleFAQ(element) {
            const faqItem = element.parentElement;
            faqItem.classList.toggle('active');
        }
        
        // 当前选中的分类
        let currentFAQCategory = 'all';
        
        function filterFAQ() {
            const searchTerm = document.getElementById('faqSearch').value.toLowerCase().trim();
            
            let filtered = faqData;
            
            // 分类过滤
            if (currentFAQCategory !== 'all') {
                filtered = filtered.filter(item => item.category === currentFAQCategory);
            }
            
            // 搜索过滤
            if (searchTerm) {
                filtered = filtered.filter(item => 
                    item.question.toLowerCase().includes(searchTerm) ||
                    item.answer.toLowerCase().includes(searchTerm)
                );
            }
            
            renderFAQList(filtered);
        }
        
        function filterFAQCategory(category) {
            currentFAQCategory = category;
            
            // 更新按钮状态
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
            
            // 重新应用过滤
            filterFAQ();
        }
        
        // 页面加载时加载FAQ
        document.addEventListener('DOMContentLoaded', function() {
            loadFAQ();
        });

        // ==================== 技术支持功能 ====================
        
        // 检查未读工单消息
        async function checkUnreadTickets() {
            try {
                const response = await fetch('/api/support/unread-count');
                const data = await parseResponseData(response);
                
                const badge = document.getElementById('supportUnreadBadge');
                if (badge && data.success) {
                    if (data.unread_count > 0) {
                        badge.textContent = data.unread_count > 9 ? '9+' : data.unread_count;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('检查未读工单失败:', error);
            }
        }
        
        async function submitTicket(event) {
            event.preventDefault();
            
            const category = document.getElementById('ticketCategory').value;
            const subject = document.getElementById('ticketSubject').value;
            const description = document.getElementById('ticketDescription').value;
            const priority = document.querySelector('input[name="priority"]:checked')?.value || 'normal';
            
            if (!category || !subject || !description) {
                showMessage('请填写完整信息', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/support/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category, subject, description, priority })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('工单提交成功！', 'success');
                    // 清空表单
                    document.getElementById('ticketForm').reset();
                    // 刷新工单列表
                    loadMyTickets();
                } else {
                    showMessage(data.error || '提交失败', 'error');
                }
            } catch (error) {
                console.error('提交工单失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }
        
        async function loadMyTickets() {
            try {
                const response = await fetch('/api/support/my-tickets');
                const data = await parseResponseData(response);
                
                const ticketsList = document.getElementById('myTickets');
                
                if (data.success && data.tickets.length > 0) {
                    const statusMap = {
                        'open': '待处理',
                        'in_progress': '处理中',
                        'resolved': '已解决',
                        'closed': '已关闭'
                    };
                    const categoryMap = {
                        'account': '账户问题',
                        'payment': '支付问题',
                        'technical': '技术问题',
                        'content': '内容反馈',
                        'other': '其他问题'
                    };
                    
                    ticketsList.innerHTML = data.tickets.map(ticket => `
                        <div class="ticket-item" data-ticket-id="${ticket.id}" onclick="showTicketDetail(${ticket.id})">
                            <div class="ticket-header">
                                <span class="ticket-no">#${ticket.ticket_no}</span>
                                <span class="ticket-status ${ticket.status}">${statusMap[ticket.status]}</span>
                            </div>
                            <div class="ticket-subject">${ticket.subject}</div>
                            <div class="ticket-meta">
                                <span>${categoryMap[ticket.category]}</span>
                                <span>${new Date(ticket.created_at).toLocaleDateString()}</span>
                                ${ticket.message_count > 0 ? `<span class="message-count">💬 ${ticket.message_count}</span>` : ''}
                            </div>
                            ${ticket.admin_reply ? `<div class="ticket-reply"><strong>最新回复：</strong>${ticket.admin_reply.substring(0, 100)}${ticket.admin_reply.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                    `).join('');
                } else {
                    ticketsList.innerHTML = `
                        <div class="empty-state small">
                            <div class="empty-icon">📭</div>
                            <div class="empty-title">暂无工单</div>
                            <div class="empty-desc">提交工单后可在此查看处理进度</div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('加载工单失败:', error);
            }
        }
        
        // 显示工单详情弹窗
        async function showTicketDetail(ticketId) {
            try {
                const response = await fetch(`/api/support/tickets/${ticketId}`);
                const data = await parseResponseData(response);
                
                if (!data.success) {
                    showMessage(data.error || '获取工单详情失败', 'error');
                    return;
                }
                
                const ticket = data.ticket;
                const statusMap = {
                    'open': '待处理',
                    'in_progress': '处理中',
                    'resolved': '已解决',
                    'closed': '已关闭'
                };
                const categoryMap = {
                    'account': '账户问题',
                    'payment': '支付问题',
                    'technical': '技术问题',
                    'content': '内容反馈',
                    'other': '其他问题'
                };
                
                // 构建对话消息HTML
                let messagesHtml = '';
                if (ticket.messages && ticket.messages.length > 0) {
                    messagesHtml = ticket.messages.map(msg => `
                        <div class="chat-message ${msg.sender_type}">
                            <div class="message-header">
                                <span class="sender-name">${msg.sender_type === 'admin' ? '👨‍💼 ' + msg.sender_name : '👤 ' + msg.sender_name}</span>
                                <span class="message-time">${new Date(msg.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                            <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
                        </div>
                    `).join('');
                }
                
                // 创建弹窗
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay ticket-detail-overlay';
                overlay.innerHTML = `
                    <div class="ticket-detail-modal">
                        <div class="modal-header">
                            <h3>🎫 工单详情</h3>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="ticket-info-card">
                                <div class="info-row">
                                    <span class="info-label">工单号</span>
                                    <span class="info-value">#${ticket.ticket_no}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">状态</span>
                                    <span class="ticket-status ${ticket.status}">${statusMap[ticket.status]}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">分类</span>
                                    <span class="info-value">${categoryMap[ticket.category]}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">创建时间</span>
                                    <span class="info-value">${new Date(ticket.created_at).toLocaleString('zh-CN')}</span>
                                </div>
                            </div>
                            
                            <div class="ticket-subject-section">
                                <h4>📌 ${ticket.subject}</h4>
                                <div class="ticket-description">${ticket.description.replace(/\n/g, '<br>')}</div>
                            </div>
                            
                            ${messagesHtml ? `
                            <div class="ticket-chat-section">
                                <h4>💬 对话记录</h4>
                                <div class="chat-messages">${messagesHtml}</div>
                            </div>
                            ` : ''}
                            
                            ${ticket.status !== 'closed' ? `
                            <div class="ticket-reply-section">
                                <h4>✉️ 回复工单</h4>
                                <textarea id="ticketReplyContent" placeholder="请输入您的回复内容..." rows="3"></textarea>
                                <button class="ticket-send-btn" onclick="replyTicketFromDetail(${ticket.id})">
                                    <span class="btn-icon">✉️</span>
                                    <span class="btn-text">发送回复</span>
                                </button>
                            </div>
                            ` : '<div class="ticket-closed-notice">该工单已关闭，无法继续回复</div>'}
                        </div>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.remove();
                });
                
                // 查看工单后刷新未读状态
                checkUnreadTickets();
                
            } catch (error) {
                console.error('获取工单详情失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }
        
        // 从详情弹窗回复工单
        async function replyTicketFromDetail(ticketId) {
            const content = document.getElementById('ticketReplyContent')?.value?.trim();
            if (!content) {
                showMessage('请输入回复内容', 'warning');
                return;
            }
            
            try {
                const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reply: content })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('回复成功！', 'success');
                    // 关闭当前弹窗并重新打开以刷新内容
                    document.querySelector('.ticket-detail-overlay')?.remove();
                    showTicketDetail(ticketId);
                    loadMyTickets(); // 同时刷新列表
                } else {
                    showMessage(data.error || '回复失败', 'error');
                }
            } catch (error) {
                console.error('回复工单失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }
        
        // 显示回复工单表单
        async function showReplyTicketForm(ticketId) {
            const content = await showPrompt({
                title: '✉️ 追加回复',
                message: '请输入您的追加回复内容',
                placeholder: '请输入回复内容...',
                confirmText: '发送回复',
                cancelText: '取消',
                type: 'info'
            });
            if (content && content.trim()) {
                replyTicket(ticketId, content.trim());
            }
        }
        
        // 用户回复工单
        async function replyTicket(ticketId, content) {
            try {
                const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reply: content })
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('回复成功！', 'success');
                    loadMyTickets(); // 刷新工单列表
                } else {
                    showMessage(data.error || '回复失败', 'error');
                }
            } catch (error) {
                console.error('回复工单失败:', error);
                showMessage('网络错误，请稍后重试', 'error');
            }
        }

        // ==================== 文档导航功能 ====================
        function scrollToDoc(docId) {
            const element = document.getElementById(docId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 更新导航激活状态
                document.querySelectorAll('.docs-nav .nav-list a').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + docId);
                });
            }
        }

        // ==================== 兑换码功能 ====================
        let redeemInProgress = false;

        async function redeemCode() {
            const input = document.getElementById('redeemCodeInput');
            const btn = document.getElementById('redeemBtn');
            const code = input ? input.value.trim() : '';
            
            if (!code) {
                showMessage('请输入兑换码', 'warning');
                if (input) input.focus();
                return;
            }

            if (redeemInProgress) {
                showMessage('正在处理兑换，请勿重复提交', 'warning');
                return;
            }

            redeemInProgress = true;
            let originalText = '立即兑换';

            if (btn) {
                originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-small"></span> 处理中...';
            }
            
            try {
                // 1. 从后端获取图片验证码
                let captchaImage = '';
                const capRes = await fetch('/api/user/captcha');
                const capText = await capRes.text();
                let capData = null;
                if (capText) {
                    try {
                        capData = JSON.parse(capText);
                    } catch (parseErr) {
                        console.error('验证码响应解析失败:', parseErr, capText);
                    }
                }

                if (!capRes.ok || !capData || !capData.success || !capData.image) {
                    const capError = (capData && (capData.error || capData.message)) || '';
                    const fallbackError = capRes.status === 429
                        ? '请求太频繁，请稍后再试'
                        : `获取验证码失败（HTTP ${capRes.status}）`;
                    showMessage(capError || fallbackError, 'error');
                    return;
                }
                captchaImage = capData.image;

                // 2. 弹窗确认 + 图片验证码
                const maskedCode = code.length > 4 ? code.substring(0, 4) + '░'.repeat(code.length - 4) : code;
                const answer = await showCaptchaPrompt({
                    title: '🔒 兑换验证',
                    message: `确定使用兑换码 ${maskedCode}？<br>请输入图片中的 4 位数字`,
                    image: captchaImage,
                    placeholder: '请输入验证码'
                });

                // 用户取消
                if (answer === null) return;

                if (btn) {
                    btn.innerHTML = '<span class="spinner-small"></span> 兑换中...';
                }

                // 3. 提交兑换请求，携带验证码答案
                const response = await fetch('/api/redeem/use', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code: code, captcha_answer: answer })
                });
                
                const rawText = await response.text();
                let data = null;
                if (rawText) {
                    try {
                        data = JSON.parse(rawText);
                    } catch (parseErr) {
                        console.error('兑换响应解析失败:', parseErr, rawText);
                    }
                }

                if (!response.ok) {
                    const serverError = data && (data.error || data.message);
                    const fallbackError = response.status === 401
                        ? '登录已过期，请重新登录后再试'
                        : `兑换失败（HTTP ${response.status}）`;
                    showMessage(serverError || fallbackError, 'error');
                    return;
                }

                if (data && data.success) {
                    showMessage(data.message || '🎉 兑换成功！套餐已激活', 'success');
                    if (input) input.value = '';
                    
                    // 根据是否有 Emby 账号显示不同提示
                    if (data.has_emby_account === false) {
                        // 没有 Emby 账号，弹窗引导去创建
                        setTimeout(() => {
                            showPaymentSuccessGuide();
                        }, 500);
                    } else {
                        // 已有 Emby 账号，延迟后刷新页面
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                    return;
                }

                if (data && (data.error || data.message)) {
                    showMessage(data.error || data.message || '兑换失败', 'error');
                    return;
                }
                
                if (response.ok && !rawText) {
                    showMessage('兑换请求已提交，正在同步状态，请稍后查看', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1200);
                    return;
                }

                showMessage('兑换失败，服务器响应异常，请稍后重试', 'error');
            } catch (error) {
                console.error('兑换失败:', error);
                showMessage('兑换失败，请稍后重试', 'error');
            } finally {
                redeemInProgress = false;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }

        // ==================== 播放监控功能 ====================
        let playbackDataLoaded = false;
        let playbackRefreshInterval = null;
        let playbackHistoryData = [];  // 存储完整的播放历史数据
        let historyCurrentPage = 1;    // 当前页码
        const historyPageSize = 5;     // 每页显示条数
        
        async function loadPlaybackData() {
            try {
                // 显示加载状态
                const devicesContainer = document.getElementById('devicesContainer');
                const historyContainer = document.getElementById('historyContainer');
                
                if (devicesContainer) {
                    devicesContainer.innerHTML = `
                        <div class="loading-placeholder">
                            <div class="loading-spinner"></div>
                            <span>加载设备信息中...</span>
                        </div>
                    `;
                }
                
                // 同时加载会话和历史
                const [sessionsRes, historyRes] = await Promise.all([
                    fetch('/api/emby/sessions'),
                    fetch('/api/emby/playback-history?limit=20')
                ]);
                
                const sessionsData = await parseResponseData(sessionsRes);
                const historyData = await parseResponseData(historyRes);
                
                // 检查播放流数限制
                if (sessionsData.stream_limit && sessionsData.stream_limit.exceeded) {
                    const sl = sessionsData.stream_limit;
                    const stoppedNames = sl.stopped_sessions.map(s => s.device || '未知设备').join('、');
                    showMessage(`同时播放设备数超过限制（${sl.max_streams}），已自动停止: ${stoppedNames}`, 'warning');
                }
                
                // 更新统计卡片
                updatePlaybackStats(sessionsData);
                
                // 渲染设备列表
                renderDevices(sessionsData);
                
                // 渲染播放历史
                renderPlaybackHistory(historyData);
                
                // 加载用户设备列表
                loadMyDevices();
                
                playbackDataLoaded = true;
                
            } catch (error) {
                console.error('加载播放数据失败:', error);
                const devicesContainer = document.getElementById('devicesContainer');
                if (devicesContainer) {
                    devicesContainer.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon">❌</div>
                            <h4>加载失败</h4>
                            <p>无法获取播放数据，请检查 Emby 连接</p>
                        </div>
                    `;
                }
            }
        }
        
        function updatePlaybackStats(data) {
            const onlineCountEl = document.getElementById('onlineDeviceCount');
            const playingCountEl = document.getElementById('playingCount');
            
            // 统计正在播放的设备数量
            const playingCount = data.success ? (data.playing_count || 0) : 0;
            
            if (onlineCountEl && data.success) {
                onlineCountEl.textContent = playingCount;  // 改为显示播放中数量
            }
            if (playingCountEl && data.success) {
                playingCountEl.textContent = playingCount;
            }
        }
        
        function renderDevices(data) {
            const container = document.getElementById('devicesContainer');
            if (!container) return;
            
            if (!data.success) {
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h4>${data.error || '无法获取设备信息'}</h4>
                        <p>请确保已绑定 Emby 账号</p>
                    </div>
                `;
                return;
            }
            
            // 只显示正在播放的会话
            const sessions = (data.sessions || []).filter(s => s.is_playing);
            
            if (sessions.length === 0) {
                container.innerHTML = `
                    <div class="empty-devices">
                        <div class="empty-icon">📱</div>
                        <h4>暂无播放中的设备</h4>
                        <p>当前没有正在播放的设备</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `
                <div class="devices-grid">
                    ${sessions.map(session => renderDeviceCard(session)).join('')}
                </div>
            `;
        }
        
        function renderDeviceCard(session) {
            const isPlaying = session.is_playing;
            const isPaused = session.play_state?.is_paused;
            const deviceIcon = getDeviceIcon(session.client);
            
            // 计算播放进度
            let progressPercent = 0;
            let progressTime = '';
            if (session.now_playing && session.play_state) {
                const positionTicks = session.play_state.position_ticks || 0;
                const runTimeTicks = session.now_playing.run_time_ticks || 0;
                if (runTimeTicks > 0) {
                    progressPercent = Math.round((positionTicks / runTimeTicks) * 100);
                    progressTime = `${formatTicks(positionTicks)} / ${formatTicks(runTimeTicks)}`;
                }
            }
            
            // 播放方式标签
            let playMethodTag = '';
            if (session.play_state?.play_method) {
                const method = session.play_state.play_method;
                if (method === 'Transcode') {
                    playMethodTag = '<span class="play-state-tag transcoding">🔄 转码播放</span>';
                } else if (method === 'DirectPlay' || method === 'DirectStream') {
                    playMethodTag = '<span class="play-state-tag direct">⚡ 直接播放</span>';
                }
            }
            
            return `
                <div class="device-card ${isPlaying ? 'playing' : ''}" data-device-id="${session.db_device_id || ''}">
                    <div class="device-header">
                        <div class="device-info">
                            <div class="device-icon">${deviceIcon}</div>
                            <div class="device-details">
                                <h4>${escapeHtml(session.device_name)}</h4>
                                <p>${escapeHtml(session.client)} ${session.app_version ? 'v' + session.app_version : ''}</p>
                            </div>
                        </div>
                        <div class="device-header-right">
                            <div class="device-status ${isPaused ? 'paused' : 'playing'}">
                                <span class="status-dot"></span>
                                ${isPaused ? '已暂停' : '播放中'}
                            </div>
                            ${session.db_device_id ? `
                                <button class="device-delete-btn" onclick="deleteDevice(${session.db_device_id}, '${escapeHtml(session.device_name)}')" title="删除此设备">
                                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${session.remote_end_point ? `
                        <div class="device-ip">
                            <span>📍 IP: ${session.remote_end_point}</span>
                        </div>
                    ` : ''}
                    ${isPlaying && session.now_playing ? `
                        <div class="now-playing">
                            <div class="now-playing-header">
                                <span>🎬</span> 正在播放
                            </div>
                            <div class="now-playing-content">
                                <div class="now-playing-info">
                                    <div class="now-playing-title">${escapeHtml(session.now_playing.display_name || session.now_playing.name)}</div>
                                    <div class="now-playing-meta">${session.now_playing.type === 'Episode' ? '剧集' : '电影'}</div>
                                    <div class="playback-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                                        </div>
                                        <span class="progress-time">${progressTime}</span>
                                    </div>
                                    ${playMethodTag}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        function getDeviceIcon(client) {
            const clientLower = (client || '').toLowerCase();
            if (clientLower.includes('android')) return '📱';
            if (clientLower.includes('ios') || clientLower.includes('iphone') || clientLower.includes('ipad')) return '📱';
            if (clientLower.includes('tv') || clientLower.includes('android tv') || clientLower.includes('fire')) return '📺';
            if (clientLower.includes('web') || clientLower.includes('chrome') || clientLower.includes('firefox')) return '🌐';
            if (clientLower.includes('windows') || clientLower.includes('mac') || clientLower.includes('linux')) return '💻';
            if (clientLower.includes('emby') || clientLower.includes('jellyfin')) return '🎬';
            if (clientLower.includes('kodi') || clientLower.includes('infuse') || clientLower.includes('plex')) return '🎥';
            return '📱';
        }
        
        function formatTicks(ticks) {
            // Emby 使用 ticks (1 tick = 100 纳秒)
            const seconds = Math.floor(ticks / 10000000);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            return `${minutes}:${String(secs).padStart(2, '0')}`;
        }
        
        function renderPlaybackHistory(data) {
            const container = document.getElementById('historyContainer');
            if (!container) return;
            
            // 更新历史数量
            const historyCountEl = document.getElementById('historyCount');
            if (historyCountEl && data.success) {
                historyCountEl.textContent = data.count || 0;
            }
            
            if (!data.success) {
                container.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h4>${data.error || '无法获取播放历史'}</h4>
                        <p>请确保已绑定 Emby 账号</p>
                    </div>
                `;
                return;
            }
            
            const history = data.history || [];
            playbackHistoryData = history;  // 存储完整数据
            historyCurrentPage = 1;          // 重置到第一页
            
            if (history.length === 0) {
                container.innerHTML = `
                    <div class="empty-devices">
                        <div class="empty-icon">📼</div>
                        <h4>暂无播放记录</h4>
                        <p>开始观看内容后，播放历史将显示在这里</p>
                    </div>
                `;
                return;
            }
            
            renderHistoryPage();
        }
        
        function renderHistoryPage() {
            const container = document.getElementById('historyContainer');
            if (!container || playbackHistoryData.length === 0) return;
            
            const totalPages = Math.ceil(playbackHistoryData.length / historyPageSize);
            const startIndex = (historyCurrentPage - 1) * historyPageSize;
            const endIndex = Math.min(startIndex + historyPageSize, playbackHistoryData.length);
            const pageItems = playbackHistoryData.slice(startIndex, endIndex);
            
            container.innerHTML = `
                <div class="history-cards-grid">
                    ${pageItems.map(item => renderHistoryItem(item)).join('')}
                </div>
                ${totalPages > 1 ? renderHistoryPagination(totalPages) : ''}
            `;
        }
        
        function renderHistoryPagination(totalPages) {
            const total = playbackHistoryData.length;
            const startNum = (historyCurrentPage - 1) * historyPageSize + 1;
            const endNum = Math.min(historyCurrentPage * historyPageSize, total);
            
            let pagesHtml = '';
            
            // 显示页码
            for (let i = 1; i <= totalPages; i++) {
                if (totalPages <= 7) {
                    // 页数少于7，全部显示
                    pagesHtml += `<button class="page-btn ${i === historyCurrentPage ? 'active' : ''}" onclick="goToHistoryPage(${i})">${i}</button>`;
                } else {
                    // 页数多，显示省略号
                    if (i === 1 || i === totalPages || (i >= historyCurrentPage - 1 && i <= historyCurrentPage + 1)) {
                        pagesHtml += `<button class="page-btn ${i === historyCurrentPage ? 'active' : ''}" onclick="goToHistoryPage(${i})">${i}</button>`;
                    } else if (i === historyCurrentPage - 2 || i === historyCurrentPage + 2) {
                        pagesHtml += `<span class="page-ellipsis">...</span>`;
                    }
                }
            }
            
            return `
                <div class="history-pagination">
                    <div class="pagination-info">
                        显示 ${startNum}-${endNum} / 共 ${total} 条
                    </div>
                    <div class="pagination-controls">
                        <button class="page-btn page-prev" onclick="goToHistoryPage(${historyCurrentPage - 1})" ${historyCurrentPage === 1 ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/></svg>
                        </button>
                        ${pagesHtml}
                        <button class="page-btn page-next" onclick="goToHistoryPage(${historyCurrentPage + 1})" ${historyCurrentPage === totalPages ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }
        
        function goToHistoryPage(page) {
            const totalPages = Math.ceil(playbackHistoryData.length / historyPageSize);
            if (page < 1 || page > totalPages) return;
            
            historyCurrentPage = page;
            renderHistoryPage();
            
            // 滚动到历史区域顶部
            const historySection = document.getElementById('historyContainer');
            if (historySection) {
                historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        function renderHistoryItem(item) {
            const typeLabel = item.type === 'Episode' ? '剧集' : '电影';
            const typeBadgeClass = item.type === 'Episode' ? 'episode' : 'movie';
            const typeIcon = item.type === 'Episode' ? '📺' : '🎬';
            
            // 格式化最后播放时间
            let lastPlayedText = '';
            if (item.last_played_date) {
                const date = new Date(item.last_played_date);
                const now = new Date();
                const diffMs = now - date;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    if (diffHours === 0) {
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        lastPlayedText = diffMins <= 1 ? '刚刚' : `${diffMins} 分钟前`;
                    } else {
                        lastPlayedText = `${diffHours} 小时前`;
                    }
                } else if (diffDays === 1) {
                    lastPlayedText = '昨天';
                } else if (diffDays < 7) {
                    lastPlayedText = `${diffDays} 天前`;
                } else {
                    lastPlayedText = date.toLocaleDateString('zh-CN');
                }
            }
            
            // 播放进度
            const progressPercent = Math.round(item.played_percentage || 0);
            
            // 格式化时长
            const formatDuration = (seconds) => {
                if (!seconds || seconds <= 0) return '--:--';
                const hours = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                if (hours > 0) {
                    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            
            const playDuration = formatDuration(item.play_duration);
            const totalDuration = formatDuration(item.total_duration);
            
            // 播放方式标签
            let playMethodBadge = '';
            if (item.play_method) {
                const methodClass = item.play_method === 'DirectPlay' ? 'direct' : 'transcode';
                const methodText = item.play_method === 'DirectPlay' ? '直播' : '转码';
                playMethodBadge = `<span class="history-method-badge ${methodClass}">${methodText}</span>`;
            }
            
            // 设备信息
            let deviceInfo = '';
            if (item.device_name || item.client) {
                deviceInfo = `<span class="history-device">${item.client || ''} ${item.device_name ? `· ${item.device_name}` : ''}</span>`;
            }
            
            return `
                <div class="history-card">
                    <div class="history-card-header">
                        <div class="history-icon">${typeIcon}</div>
                        <div class="history-header-info">
                            <div class="history-title">${escapeHtml(item.display_name || item.name)}</div>
                            <div class="history-subtitle">
                                <span class="history-badge ${typeBadgeClass}">${typeLabel}</span>
                                ${item.series_name ? `<span class="history-series">${escapeHtml(item.series_name)}</span>` : ''}
                                ${playMethodBadge}
                            </div>
                        </div>
                    </div>
                    <div class="history-card-body">
                        <div class="history-progress-section">
                            <div class="history-progress-header">
                                <span class="progress-label">播放进度</span>
                                <span class="progress-value">${progressPercent}%</span>
                            </div>
                            <div class="history-progress-bar">
                                <div class="history-progress-fill ${progressPercent >= 90 ? 'completed' : ''}" style="width: ${progressPercent}%"></div>
                            </div>
                            <div class="history-progress-time">
                                <span>${playDuration}</span>
                                <span>/</span>
                                <span>${totalDuration}</span>
                            </div>
                        </div>
                    </div>
                    <div class="history-card-footer">
                        <div class="history-meta-row">
                            ${item.play_count > 1 ? `<span class="history-play-count">🔄 ${item.play_count} 次</span>` : ''}
                            ${deviceInfo}
                        </div>
                        ${lastPlayedText ? `<span class="history-time">🕐 ${lastPlayedText}</span>` : ''}
                    </div>
                </div>
            `;
        }
        
        async function refreshPlaybackData() {
            const btn = document.querySelector('.refresh-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<div class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></div> 刷新中';
            }
            
            await loadPlaybackData();
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/></svg>
                    刷新
                `;
            }
            
            showToast('数据已刷新', 'success');
        }
        
        async function changeHistoryLimit() {
            const select = document.getElementById('historyLimitSelect');
            const limit = select ? select.value : 20;
            
            try {
                const response = await fetch(`/api/emby/playback-history?limit=${limit}`);
                const data = await parseResponseData(response);
                renderPlaybackHistory(data);
            } catch (error) {
                console.error('加载播放历史失败:', error);
                showToast('加载失败，请重试', 'error');
            }
        }
        
        // 删除设备
        async function deleteDevice(deviceId, deviceName) {
            const confirmed = await showConfirm({
                title: '删除设备',
                message: `确定要删除设备 "${deviceName}" 吗？\n\n删除后该设备的播放记录也会被清除。`,
                confirmText: '删除',
                type: 'danger'
            });
            if (!confirmed) return;
            
            try {
                const response = await fetch(`/api/emby/devices/${deviceId}`, {
                    method: 'DELETE'
                });
                
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showToast('设备已删除', 'success');
                    loadPlaybackData();  // 刷新设备列表
                } else {
                    showToast(data.error || '删除失败', 'error');
                }
            } catch (error) {
                console.error('删除设备失败:', error);
                showToast('删除失败，请重试', 'error');
            }
        }
        
        // 启动自动刷新 - 每 10 秒刷新一次（实时同步）
        function startPlaybackAutoRefresh() {
            if (playbackRefreshInterval) {
                clearInterval(playbackRefreshInterval);
            }
            // 每 10 秒自动刷新（实时同步）
            playbackRefreshInterval = setInterval(() => {
                const playbackSection = document.getElementById('section-playback');
                if (playbackSection && playbackSection.classList.contains('active')) {
                    loadPlaybackData();
                }
            }, 10000);
        }
        
        function stopPlaybackAutoRefresh() {
            if (playbackRefreshInterval) {
                clearInterval(playbackRefreshInterval);
                playbackRefreshInterval = null;
            }
        }
        
        // ==================== 我的设备列表 ====================
        async function loadMyDevices() {
            const container = document.getElementById('myDevicesContainer');
            const countBadge = document.getElementById('myDeviceCount');
            if (!container) return;
            
            try {
                const response = await fetch('/api/emby/devices');
                const data = await parseResponseData(response);
                
                if (!data.success) {
                    container.innerHTML = `
                        <div class="empty-devices">
                            <div class="empty-icon">📱</div>
                            <h4>无法获取设备</h4>
                            <p>${data.error || '请稍后重试'}</p>
                        </div>
                    `;
                    return;
                }
                
                const devices = data.devices || [];
                if (countBadge) {
                    countBadge.textContent = `${devices.length} 个设备`;
                }
                
                if (devices.length === 0) {
                    container.innerHTML = `
                        <div class="empty-devices">
                            <div class="empty-icon">📱</div>
                            <h4>暂无设备记录</h4>
                            <p>播放过内容的设备会自动记录在这里</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = `
                    <div class="my-devices-grid">
                        ${devices.map(device => renderMyDeviceCard(device)).join('')}
                    </div>
                `;
                
            } catch (error) {
                console.error('加载设备列表失败:', error);
                container.innerHTML = `
                    <div class="empty-devices">
                        <div class="empty-icon">❌</div>
                        <h4>加载失败</h4>
                        <p>请稍后重试</p>
                    </div>
                `;
            }
        }
        
        function renderMyDeviceCard(device) {
            const clientLower = (device.client || '').toLowerCase();
            let deviceIcon = '📱';
            if (clientLower.includes('tv') || clientLower.includes('android tv')) deviceIcon = '📺';
            else if (clientLower.includes('web') || clientLower.includes('chrome')) deviceIcon = '🌐';
            else if (clientLower.includes('windows') || clientLower.includes('mac')) deviceIcon = '💻';
            else if (clientLower.includes('infuse') || clientLower.includes('plex') || clientLower.includes('senplayer')) deviceIcon = '🎥';
            
            const lastActive = device.last_active ? formatTimeAgo(device.last_active) : '未知';
            
            return `
                <div class="my-device-card" data-device-id="${device.id}">
                    <div class="device-main">
                        <div class="device-icon-large">${deviceIcon}</div>
                        <div class="device-details">
                            <div class="device-name">${escapeHtml(device.device_name)}</div>
                            <div class="device-client">${escapeHtml(device.client)} ${device.client_version ? 'v' + device.client_version : ''}</div>
                            <div class="device-meta">
                                <span class="last-active">最后活跃: ${lastActive}</span>
                                ${device.last_ip ? `<span class="last-ip">📍 ${device.last_ip}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="device-actions">
                        <button class="btn-delete-device" onclick="confirmDeleteDevice(${device.id}, '${escapeHtml(device.device_name)}')" title="删除此设备">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }
        
        function formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const seconds = Math.floor((now - date) / 1000);
            
            if (seconds < 60) return '刚刚';
            if (seconds < 3600) return Math.floor(seconds / 60) + ' 分钟前';
            if (seconds < 86400) return Math.floor(seconds / 3600) + ' 小时前';
            if (seconds < 604800) return Math.floor(seconds / 86400) + ' 天前';
            return date.toLocaleDateString('zh-CN');
        }
        
        async function confirmDeleteDevice(deviceId, deviceName) {
            const confirmed = await showConfirm({
                title: '删除设备',
                message: `确定要删除设备 "${deviceName}" 吗？\n\n删除后该设备的播放记录也会被清除。`,
                confirmText: '删除',
                type: 'danger'
            });
            
            if (!confirmed) return;
            
            try {
                const response = await fetch(`/api/emby/devices/${deviceId}`, {
                    method: 'DELETE'
                });
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showToast('成功', '设备已删除', 'success');
                    loadMyDevices();  // 刷新设备列表
                } else {
                    showToast('失败', data.error || '删除失败', 'error');
                }
            } catch (error) {
                console.error('删除设备失败:', error);
                showToast('错误', '删除失败', 'error');
            }
        }



        // ==================== 用户活动日志功能 ====================
        let myActivityCurrentPage = 1;

        function loadMyActivityLogs(page = 1) {
            myActivityCurrentPage = page;
            const actionType = document.getElementById('activityTypeFilter')?.value || '';
            const days = document.getElementById('activityDaysFilter')?.value || '30';
            
            const listContainer = document.getElementById('myActivityLogsList');
            if (!listContainer) return;
            
            listContainer.innerHTML = `
                <div class="activity-loading">
                    <div class="spinner"></div>
                    <p>正在加载日志...</p>
                </div>
            `;
            
            let url = `/api/user/activity-logs?page=${page}&per_page=20`;
            if (actionType) url += `&action_type=${actionType}`;
            if (days) url += `&days=${days}`;
            
            fetch(url)
                .then(response => parseResponseData(response))
                .then(data => {
                    if (data.success) {
                        renderMyActivityLogs(data.logs);
                        renderMyActivityPagination(data.pagination);
                        
                        // 更新统计
                        const totalEl = document.getElementById('activityTotalCount');
                        const pageEl = document.getElementById('activityCurrentPage');
                        if (totalEl) totalEl.textContent = data.pagination.total;
                        if (pageEl) pageEl.textContent = page;
                    } else {
                        listContainer.innerHTML = `
                            <div class="activity-empty">
                                <span class="empty-icon">📭</span>
                                <p>${data.error || '加载失败'}</p>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('加载活动日志失败:', error);
                    listContainer.innerHTML = `
                        <div class="activity-empty">
                            <span class="empty-icon">❌</span>
                            <p>加载失败，请稍后重试</p>
                        </div>
                    `;
                });
        }

        function renderMyActivityLogs(logs) {
            const listContainer = document.getElementById('myActivityLogsList');
            if (!listContainer) return;
            
            if (!logs || logs.length === 0) {
                listContainer.innerHTML = `
                    <div class="activity-empty">
                        <span class="empty-icon">📭</span>
                        <p>暂无活动记录</p>
                    </div>
                `;
                return;
            }
            
            const html = logs.map(log => {
                const actionInfo = getActionDisplayInfo(log.action_type);
                const detail = formatActivityDetail(log);
                
                return `
                    <div class="activity-log-card ${log.status === 'failed' ? 'failed' : ''}">
                        <div class="log-icon-wrapper">
                            <span class="log-icon">${actionInfo.icon}</span>
                        </div>
                        <div class="log-body">
                            <div class="log-header">
                                <span class="log-action-name">${actionInfo.name}</span>
                                <span class="log-status-badge ${log.status}">${log.status === 'success' ? '成功' : '失败'}</span>
                            </div>
                            <div class="log-detail-text">${detail}</div>
                            <div class="log-footer">
                                <span class="log-time">🕐 ${log.created_at || '--'}</span>
                                ${log.ip_address ? `<span class="log-ip">📍 ${log.ip_address}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            listContainer.innerHTML = html;
        }

        function getActionDisplayInfo(actionType) {
            const actions = {
                'login': { name: '登录', icon: '🔐' },
                'logout': { name: '登出', icon: '🚪' },
                'register': { name: '注册', icon: '📝' },
                'password_change': { name: '修改密码', icon: '🔑' },
                'emby_password_change': { name: '修改Emby密码', icon: '🔄' },
                'request_movie': { name: '求片', icon: '🎬' },
                'redeem_code': { name: '兑换码', icon: '🎁' },
                'create_order': { name: '创建订单', icon: '🛒' },
                'payment_success': { name: '支付成功', icon: '💰' },
                'account_banned': { name: '账号封禁', icon: '⛔' },
                'account_unbanned': { name: '账号解封', icon: '✅' },
                'level_change': { name: '等级变更', icon: '📊' },
                'view_lines': { name: '查看线路', icon: '🔗' },
                'invite_used': { name: '使用邀请码', icon: '🎁' },
                // 新增完整类型
                'password_reset': { name: '重置密码', icon: '🔓' },
                'cancel_request': { name: '取消求片', icon: '❌' },
                'payment_failed': { name: '支付失败', icon: '❌' },
                'submit_ticket': { name: '提交工单', icon: '🎫' },
                'reply_ticket': { name: '回复工单', icon: '💬' },
                'bind_telegram': { name: '绑定Telegram', icon: '🤖' },
                'playback_start': { name: '开始播放', icon: '▶️' },
                'device_blocked': { name: '设备封禁', icon: '🚫' },
                'subscription_change': { name: '订阅变更', icon: '💎' },
                'invite_created': { name: '创建邀请码', icon: '🎁' },
                'emby_account_create': { name: '创建Emby账号', icon: '🆕' },
                'emby_password_reset': { name: '重置Emby密码', icon: '🔄' },
                'coin_change': { name: '积分变更', icon: '💰' },
                'subscription_gift': { name: '赠送订阅', icon: '🎁' },
                'subscription_reduce': { name: '减少订阅', icon: '⏳' }
            };
            return actions[actionType] || { name: actionType, icon: '📋' };
        }

        function formatActivityDetail(log) {
            const detail = log.action_detail || {};
            
            // 如果 detail 是字符串，直接返回
            if (typeof detail === 'string') {
                return detail || '-';
            }
            
            // 如果 detail 有 raw 字段（解析失败的情况），直接返回
            if (detail.raw) {
                return detail.raw;
            }
            
            switch (log.action_type) {
                case 'login':
                    // 根据 log.status 判断成功失败，detail 中是具体信息
                    if (log.status === 'success') {
                        return detail.message || detail.detail || '登录成功';
                    } else {
                        return detail.error || detail.detail || detail.message || '登录失败';
                    }
                case 'register':
                    return detail.invite_code ? `通过邀请码 ${detail.invite_code} 注册` : '直接注册';
                case 'password_change':
                    return '密码已修改';
                case 'emby_password_change':
                    return '修改 Emby 密码';
                case 'password_reset':
                    return '通过 Telegram 验证重置密码';
                case 'request_movie':
                    const title = detail.title || detail.keyword || '';
                    const year = detail.year ? ` (${detail.year})` : '';
                    const scope = detail.scope ? ` [${detail.scope}]` : '';
                    return title ? `求片: ${title}${year}${scope}` : '提交求片';
                case 'cancel_request':
                    return detail.title ? `取消求片: ${detail.title}` : '取消求片';
                case 'redeem_code':
                    return `兑换 ${detail.days || '--'} 天 ${detail.level_name || ''} (${detail.code || '--'})`;
                case 'create_order':
                    return `创建订单: ${detail.plan_name || '--'} ¥${detail.amount || '--'}`;
                case 'payment_success':
                    return `支付成功: ${detail.plan_name || '--'} ¥${detail.amount || '--'}`;
                case 'account_banned':
                    return `账号被封禁: ${detail.reason || '管理员操作'}`;
                case 'account_unbanned':
                    return '账号已解封';
                case 'device_blocked':
                    return `设备被封禁: ${detail.device_name || detail.client || '未知设备'}`;
                case 'view_lines':
                    const userType = detail.user_type || (detail.is_whitelist ? '白名单用户' : '订阅用户');
                    const linesInfo = detail.lines && detail.lines.length > 0 
                        ? detail.lines.join('、') 
                        : `${detail.lines_count || '--'} 条线路`;
                    return `[${userType}] 查看线路: ${linesInfo}`;
                case 'invite_used':
                    return `邀请码被 ${detail.invitee_name || '--'} 使用`;
                case 'invite_created':
                    return `创建邀请码: ${detail.code || detail.invite_code || '--'}`;
                case 'logout':
                    return detail.detail || detail.message || '已登出';
                case 'level_change':
                    // 等级代码映射为中文
                    const levelNames = {
                        'a': '白名单用户',
                        'b': '订阅用户',
                        'c': '封禁用户',
                        'd': '非订阅用户'
                    };
                    const fromLevel = detail.from_level || detail.old_level || '-';
                    const toLevel = detail.to_level || detail.new_level || '-';
                    const fromName = levelNames[fromLevel] || fromLevel;
                    const toName = levelNames[toLevel] || toLevel;
                    return `等级变更: ${fromName} → ${toName}`;
                case 'subscription_change':
                    if (detail.days) {
                        const action = detail.days > 0 ? '增加' : '减少';
                        return `订阅${action} ${Math.abs(detail.days)} 天`;
                    }
                    return detail.message || detail.detail || '订阅变更';
                case 'subscription_gift':
                    return `赠送 ${detail.days || '--'} 天订阅给 ${detail.target_name || detail.to_user || '--'}`;
                case 'subscription_reduce':
                    return `订阅减少 ${detail.days || '--'} 天`;
                case 'coin_change':
                    const coinAction = detail.amount > 0 ? '+' : '';
                    return `积分${coinAction}${detail.amount || 0} (${detail.reason || '系统操作'})`;
                case 'bind_telegram':
                    return `绑定 Telegram ID: ${detail.telegram_id || '--'}`;
                case 'emby_account_create':
                    return `创建 Emby 账号: ${detail.emby_name || '--'}`;
                case 'emby_password_reset':
                    return '重置 Emby 密码';
                case 'playback_start':
                    return `播放: ${detail.item_name || detail.title || '--'}`;
                case 'submit_ticket':
                    return `提交工单: ${detail.subject || detail.title || '--'}`;
                case 'reply_ticket':
                    return `回复工单 #${detail.ticket_id || '--'}`;
                case 'payment_failed':
                    return `支付失败: ${detail.reason || detail.error || '未知原因'}`;
                default:
                    // 尝试从 detail 中提取有意义的信息
                    if (detail.message) return detail.message;
                    if (detail.detail) return detail.detail;
                    if (typeof detail === 'object' && Object.keys(detail).length > 0) {
                        // 只显示有意义的字段，过滤掉一些技术字段
                        const skipKeys = ['success', 'error_code', 'timestamp'];
                        const items = Object.entries(detail)
                            .filter(([k]) => !skipKeys.includes(k))
                            .map(([k, v]) => {
                                // 友好化键名
                                const keyMap = {
                                    'title': '影片',
                                    'year': '年份',
                                    'days': '天数',
                                    'amount': '金额',
                                    'reason': '原因'
                                };
                                const displayKey = keyMap[k] || k;
                                return `${displayKey}: ${v}`;
                            });
                        return items.length > 0 ? items.join(', ') : '-';
                    }
                    return '-';
            }
        }

        function renderMyActivityPagination(pagination) {
            const container = document.getElementById('myActivityPagination');
            if (!container || !pagination) return;
            
            const { page, pages, total } = pagination;
            
            if (pages <= 1) {
                container.innerHTML = total > 0 ? `<div class="pagination-info">共 ${total} 条记录</div>` : '';
                return;
            }
            
            let html = `<div class="pagination-info">共 ${total} 条记录</div>`;
            html += '<div class="pagination-controls">';
            
            // 上一页
            html += `<button class="page-btn" onclick="loadMyActivityLogs(${page - 1})" ${page <= 1 ? 'disabled' : ''}>上一页</button>`;
            
            // 页码信息
            html += `<span class="page-current">第 ${page} / ${pages} 页</span>`;
            
            // 下一页
            html += `<button class="page-btn" onclick="loadMyActivityLogs(${page + 1})" ${page >= pages ? 'disabled' : ''}>下一页</button>`;
            
            html += '</div>';
            container.innerHTML = html;
        }


        // ==================== 邮箱绑定功能 ====================
        let emailCountdown = 0;
        let emailCountdownTimer = null;

        async function sendEmailBindCode() {
            const emailInput = document.getElementById('bindEmailAddr');
            const btn = document.getElementById('sendEmailCodeBtn');
            const email = emailInput?.value?.trim();
            
            if (!email) {
                showMessage('请输入邮箱地址', 'warning');
                emailInput?.focus();
                return;
            }
            
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '发送中...';
            
            try {
                const response = await fetch('/api/account/bind-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage(data.message, 'success');
                    document.getElementById('emailCodeGroup').style.display = 'block';
                    document.getElementById('bindEmailCode')?.focus();
                    
                    // 60秒倒计时
                    emailCountdown = 60;
                    btn.innerHTML = emailCountdown + 's 后重试';
                    emailCountdownTimer = setInterval(() => {
                        emailCountdown--;
                        if (emailCountdown <= 0) {
                            clearInterval(emailCountdownTimer);
                            btn.disabled = false;
                            btn.innerHTML = '重新发送';
                        } else {
                            btn.innerHTML = emailCountdown + 's 后重试';
                        }
                    }, 1000);
                } else {
                    showMessage(data.error || '发送失败', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            } catch (error) {
                showMessage('发送失败，请稍后重试', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }

        async function confirmBindEmail() {
            const code = document.getElementById('bindEmailCode')?.value?.trim();
            if (!code) {
                showMessage('请输入验证码', 'warning');
                return;
            }
            
            try {
                const response = await fetch('/api/account/verify-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('🎉 邮箱绑定成功！', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showMessage(data.error || '绑定失败', 'error');
                }
            } catch (error) {
                showMessage('绑定失败，请稍后重试', 'error');
            }
        }

        async function unbindEmail() {
            const confirmed = await showConfirm({
                title: '解绑邮箱',
                message: '确定要解绑邮箱吗？解绑后将无法通过邮箱找回密码。',
                type: 'warning',
                confirmText: '确定解绑',
                cancelText: '取消'
            });
            if (!confirmed) return;
            
            try {
                const response = await fetch('/api/account/unbind-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await parseResponseData(response);
                
                if (data.success) {
                    showMessage('邮箱已解绑', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    showMessage(data.error || '操作失败', 'error');
                }
            } catch (error) {
                showMessage('操作失败', 'error');
            }
        }
