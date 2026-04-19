(function (global) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    function showToast(title, message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 显示自定义确认弹窗（替代系统 confirm）
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.message - 消息内容
     * @param {string} options.confirmText - 确认按钮文字，默认"确定"
     * @param {string} options.cancelText - 取消按钮文字，默认"取消"
     * @param {string} options.type - 类型: 'warning', 'danger', 'info'，默认'warning'
     * @param {string} options.icon - 自定义图标
     * @returns {Promise<boolean>} - 用户点击确认返回 true，取消返回 false
     */
    function showConfirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '确认操作',
                message = '确定要执行此操作吗？',
                confirmText = '确定',
                cancelText = '取消',
                type = 'warning',
                icon = null
            } = options;

            // 移除已存在的弹窗
            const existing = document.getElementById('globalConfirmModal');
            if (existing) existing.remove();

            // 根据类型设置默认图标
            const typeIcons = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️',
                success: '✅'
            };
            const displayIcon = icon || typeIcons[type] || typeIcons.warning;

            // 创建弹窗
            const modal = document.createElement('div');
            modal.id = 'globalConfirmModal';
            modal.className = 'global-confirm-overlay';
            modal.innerHTML = `
                <div class="global-confirm-dialog ${type}">
                    <div class="global-confirm-icon">${displayIcon}</div>
                    <h3 class="global-confirm-title">${title}</h3>
                    <p class="global-confirm-message">${message.replace(/\n/g, '<br>')}</p>
                    <div class="global-confirm-buttons">
                        <button class="global-confirm-btn cancel">${cancelText}</button>
                        <button class="global-confirm-btn confirm ${type}">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 动画显示
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });

            // 绑定事件
            const confirmBtn = modal.querySelector('.global-confirm-btn.confirm');
            const cancelBtn = modal.querySelector('.global-confirm-btn.cancel');

            function close(result) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    resolve(result);
                }, 200);
            }

            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close(false);
            });

            // ESC 键关闭
            function handleEsc(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    close(false);
                }
            }
            document.addEventListener('keydown', handleEsc);
        });
    }

    global.showToast = showToast;
    global.showConfirm = showConfirm;

    /**
     * HTML 转义函数（防 XSS）
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的安全文本
     */
    function escapeHtml(text) {
        if (text === undefined || text === null) return '';
        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    global.escapeHtml = escapeHtml;
    
    /**
     * 显示输入弹窗
     * @param {object} options - 配置项
     * @param {string} options.title - 标题
     * @param {string} options.message - 消息内容
     * @param {string} options.placeholder - 输入框占位符
     * @param {string} options.defaultValue - 默认值
     * @param {string} options.type - 类型: 'warning', 'danger', 'info'
     * @returns {Promise<string|null>} - 用户输入的值，取消返回 null
     */
    function showPrompt(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '请输入',
                message = '',
                placeholder = '',
                defaultValue = '',
                type = 'info'
            } = options;

            // 移除已存在的弹窗
            const existing = document.getElementById('globalPromptModal');
            if (existing) existing.remove();

            const typeIcons = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️',
                success: '✅'
            };
            const displayIcon = typeIcons[type] || typeIcons.info;

            // 创建弹窗
            const modal = document.createElement('div');
            modal.id = 'globalPromptModal';
            modal.className = 'global-confirm-overlay';
            modal.innerHTML = `
                <div class="global-confirm-dialog ${type}">
                    <div class="global-confirm-icon">${displayIcon}</div>
                    <h3 class="global-confirm-title">${title}</h3>
                    ${message ? `<p class="global-confirm-message">${message.replace(/\n/g, '<br>')}</p>` : ''}
                    <input type="text" class="global-prompt-input" placeholder="${placeholder}" value="${defaultValue}">
                    <div class="global-confirm-buttons">
                        <button class="global-confirm-btn cancel">取消</button>
                        <button class="global-confirm-btn confirm ${type}">确定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.global-prompt-input');
            
            // 动画显示
            requestAnimationFrame(() => {
                modal.classList.add('show');
                input.focus();
                input.select();
            });

            // 绑定事件
            const confirmBtn = modal.querySelector('.global-confirm-btn.confirm');
            const cancelBtn = modal.querySelector('.global-confirm-btn.cancel');

            function close(result) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    resolve(result);
                }, 200);
            }

            confirmBtn.addEventListener('click', () => close(input.value));
            cancelBtn.addEventListener('click', () => close(null));
            
            // 回车确认
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    close(input.value);
                }
            });
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close(null);
            });

            // ESC 键关闭
            function handleEsc(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    close(null);
                }
            }
            document.addEventListener('keydown', handleEsc);
        });
    }
    
    global.showPrompt = showPrompt;

    // ==================== 图片验证码弹窗 ====================
    function showCaptchaPrompt(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '🔒 安全验证',
                message = '请输入图片中的 4 位数字',
                image = '',
                placeholder = '请输入验证码'
            } = options;

            // 移除已存在的弹窗
            const existing = document.getElementById('captchaPromptModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'captchaPromptModal';
            modal.className = 'global-confirm-overlay';
            modal.innerHTML = `
                <div class="global-confirm-dialog info" style="max-width:340px;">
                    <div class="global-confirm-icon">🔒</div>
                    <h3 class="global-confirm-title">${title}</h3>
                    ${message ? `<p class="global-confirm-message" style="margin-bottom:10px;">${message}</p>` : ''}
                    <div class="captcha-frame" style="text-align:center;margin:8px 0 6px;">
                        <div class="captcha-loading"
                             style="height:56px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:13px;background:#f9fafb;border:1px solid #ddd;border-radius:6px;">
                             正在加载验证码...
                        </div>
                        <img src="" alt="验证码" class="captcha-img"
                             style="display:none;border-radius:6px;border:1px solid #ddd;cursor:pointer;height:56px;"
                             title="点击刷新验证码">
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;margin:2px 0 8px;">
                        <button type="button" class="global-confirm-btn confirm info captcha-refresh-btn" style="padding:6px 10px;">换一张</button>
                        <button type="button" class="global-confirm-btn confirm warning captcha-retry-btn" style="padding:6px 10px;display:none;">重试加载</button>
                    </div>
                    <input type="text" maxlength="4" inputmode="numeric" autocomplete="off"
                           class="global-prompt-input" placeholder="${placeholder}"
                           style="width:100%;padding:10px;margin:6px 0 10px;border:1px solid #ddd;border-radius:6px;font-size:18px;text-align:center;letter-spacing:8px;">
                    <div class="global-confirm-buttons">
                        <button type="button" class="global-confirm-btn cancel captcha-cancel-btn">取消</button>
                        <button type="button" class="global-confirm-btn confirm info captcha-confirm-btn">确定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.global-prompt-input');
            const captchaImg = modal.querySelector('.captcha-img');
            const captchaLoading = modal.querySelector('.captcha-loading');
            const refreshBtn = modal.querySelector('.captcha-refresh-btn');
            const retryBtn = modal.querySelector('.captcha-retry-btn');
            let isRefreshing = false;
            let isCaptchaLoading = false;
            let refreshCooldown = 0;
            let refreshCooldownTimer = null;
            const CAPTCHA_REFRESH_COOLDOWN = 2;

            function updateRefreshBtnState() {
                if (!refreshBtn) return;
                refreshBtn.textContent = refreshCooldown > 0 ? `换一张 (${refreshCooldown}s)` : '换一张';
                refreshBtn.disabled = isCaptchaLoading || refreshCooldown > 0;
            }

            function stopRefreshCooldown() {
                if (refreshCooldownTimer) {
                    clearInterval(refreshCooldownTimer);
                    refreshCooldownTimer = null;
                }
                refreshCooldown = 0;
                updateRefreshBtnState();
            }

            function startRefreshCooldown(seconds = CAPTCHA_REFRESH_COOLDOWN) {
                if (!refreshBtn) return;
                if (refreshCooldownTimer) {
                    clearInterval(refreshCooldownTimer);
                    refreshCooldownTimer = null;
                }
                refreshCooldown = Math.max(0, Number(seconds) || 0);
                updateRefreshBtnState();
                if (refreshCooldown <= 0) return;
                refreshCooldownTimer = setInterval(() => {
                    refreshCooldown = Math.max(0, refreshCooldown - 1);
                    updateRefreshBtnState();
                    if (refreshCooldown <= 0 && refreshCooldownTimer) {
                        clearInterval(refreshCooldownTimer);
                        refreshCooldownTimer = null;
                    }
                }, 1000);
            }

            function setLoading(loading, text = '正在加载验证码...') {
                isCaptchaLoading = !!loading;
                if (captchaLoading) {
                    captchaLoading.style.display = loading ? 'flex' : 'none';
                    captchaLoading.textContent = text;
                }
                if (captchaImg && loading) {
                    captchaImg.style.display = 'none';
                }
                if (retryBtn && loading) retryBtn.style.display = 'none';
                updateRefreshBtnState();
            }

            function setLoadFailed(text) {
                isCaptchaLoading = false;
                if (captchaLoading) {
                    captchaLoading.style.display = 'flex';
                    captchaLoading.textContent = text || '验证码加载失败';
                }
                if (captchaImg) {
                    captchaImg.style.display = 'none';
                }
                if (retryBtn) retryBtn.style.display = '';
                updateRefreshBtnState();
            }

            function applyCaptchaImage(src) {
                if (!captchaImg) return;
                captchaImg.onload = () => {
                    setLoading(false);
                    captchaImg.style.display = 'inline-block';
                    if (retryBtn) retryBtn.style.display = 'none';
                    startRefreshCooldown(CAPTCHA_REFRESH_COOLDOWN);
                };
                captchaImg.onerror = () => {
                    setLoadFailed('验证码加载失败，请重试');
                };
                captchaImg.src = src || '';
            }

            async function refreshCaptcha() {
                if (isRefreshing) return;
                isRefreshing = true;
                setLoading(true, '正在刷新验证码...');
                try {
                    const res = await fetch('/api/user/captcha');
                    const text = await res.text();
                    let data = null;
                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch (parseErr) {
                            console.error('验证码响应解析失败:', parseErr, text);
                        }
                    }
                    if (!res.ok || !data || !data.success || !data.image) {
                        const msg = (data && (data.error || data.message)) || `验证码加载失败（HTTP ${res.status}）`;
                        setLoadFailed(msg);
                        if (res.status === 429 || /频繁|稍后|429/i.test(String(msg || ''))) {
                            startRefreshCooldown(CAPTCHA_REFRESH_COOLDOWN);
                        }
                        return;
                    }
                    applyCaptchaImage(data.image);
                    input.value = '';
                    input.focus();
                } catch (e) {
                    setLoadFailed('网络错误，请点击重试');
                } finally {
                    isRefreshing = false;
                }
            }

            // 点击图片刷新验证码
            if (captchaImg) {
                captchaImg.addEventListener('click', () => refreshCaptcha());
            }
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => refreshCaptcha());
            }
            if (retryBtn) {
                retryBtn.addEventListener('click', () => refreshCaptcha());
            }

            if (image) {
                setLoading(true);
                applyCaptchaImage(image);
            } else {
                refreshCaptcha();
            }

            requestAnimationFrame(() => {
                modal.classList.add('show');
                input.focus();
            });

            const confirmBtn = modal.querySelector('.captcha-confirm-btn');
            const cancelBtn = modal.querySelector('.captcha-cancel-btn');

            function close(result) {
                stopRefreshCooldown();
                modal.classList.remove('show');
                setTimeout(() => { modal.remove(); resolve(result); }, 200);
            }

            confirmBtn.addEventListener('click', () => {
                const v = input.value.trim();
                if (!v) { input.focus(); input.style.borderColor = '#e74c3c'; return; }
                close(v);
            });
            cancelBtn.addEventListener('click', () => close(null));

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); confirmBtn.click(); }
            });
            input.addEventListener('input', () => { input.style.borderColor = '#ddd'; });

            modal.addEventListener('click', (e) => { if (e.target === modal) close(null); });

            function handleEsc(e) {
                if (e.key === 'Escape') { document.removeEventListener('keydown', handleEsc); close(null); }
            }
            document.addEventListener('keydown', handleEsc);
        });
    }

    global.showCaptchaPrompt = showCaptchaPrompt;

    // ==================== 数据刷新总线 ====================
    const refreshChannelName = 'emby-request-refresh';
    const refreshListeners = new Set();
    let refreshChannel = null;

    function notifyRefreshListeners(payload) {
        refreshListeners.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                console.error('刷新监听器执行失败:', error);
            }
        });
    }

    function emitAppRefresh(scope = 'dashboard', detail = {}) {
        const payload = {
            scope,
            detail,
            ts: Date.now()
        };

        if (refreshChannel) {
            try {
                refreshChannel.postMessage(payload);
            } catch (error) {
                console.warn('广播刷新消息失败:', error);
            }
        }

        try {
            localStorage.setItem(refreshChannelName, JSON.stringify(payload));
            localStorage.removeItem(refreshChannelName);
        } catch (error) {
            // ignore storage quota / disabled storage issues
        }

        return payload;
    }

    function onAppRefresh(handler) {
        if (typeof handler !== 'function') return () => {};
        refreshListeners.add(handler);
        return () => refreshListeners.delete(handler);
    }

    function inferRefreshScope(url, method) {
        const upperMethod = String(method || 'GET').toUpperCase();
        if (upperMethod === 'GET' || upperMethod === 'HEAD') return null;

        const path = String(url || '');
        if (path.includes('/api/admin/') || path.includes('/admin/')) return 'admin';
        if (
            path.includes('/request-movie') ||
            path.includes('/api/emby/') ||
            path.includes('/api/user/') ||
            path.includes('/api/account/') ||
            path.includes('/api/redeem/') ||
            path.includes('/api/support/') ||
            path.includes('/api/user/checkin') ||
            path.includes('/api/user/exchange') ||
            path.includes('/api/request') ||
            path.includes('/api/orders') ||
            path.includes('/api/order') ||
            path.includes('/api/subscription') ||
            path.includes('/api/ticket') ||
            path.includes('/api/invite') ||
            path.includes('/api/payment')
        ) {
            return 'dashboard';
        }
        return null;
    }

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            refreshChannel = new BroadcastChannel(refreshChannelName);
            refreshChannel.onmessage = (event) => notifyRefreshListeners(event.data);
        } catch (error) {
            refreshChannel = null;
        }
    }

    window.addEventListener('storage', (event) => {
        if (event.key !== refreshChannelName || !event.newValue) return;
        try {
            notifyRefreshListeners(JSON.parse(event.newValue));
        } catch (error) {
            // ignore malformed payloads
        }
    });

    if (typeof global.fetch === 'function' && !global.__appFetchWrapped) {
        const originalFetch = global.fetch.bind(global);
        global.fetch = async function(input, init) {
            const response = await originalFetch(input, init);
            try {
                const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
                const method = (init && init.method) || (input && input.method) || 'GET';
                const scope = inferRefreshScope(url, method);
                if (scope && response && response.ok) {
                    emitAppRefresh(scope, { url, method, status: response.status });
                }
            } catch (error) {
                // 不中断业务请求
            }
            return response;
        };
        global.__appFetchWrapped = true;
    }

    global.emitAppRefresh = emitAppRefresh;
    global.onAppRefresh = onAppRefresh;
})(window);
