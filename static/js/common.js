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
                    <div style="text-align:center;margin:8px 0 6px;">
                        <img src="${image}" alt="验证码" class="captcha-img"
                             style="border-radius:6px;border:1px solid #ddd;cursor:pointer;height:56px;"
                             title="点击刷新验证码">
                    </div>
                    <input type="text" maxlength="4" inputmode="numeric" autocomplete="off"
                           class="global-prompt-input" placeholder="${placeholder}"
                           style="width:100%;padding:10px;margin:6px 0 10px;border:1px solid #ddd;border-radius:6px;font-size:18px;text-align:center;letter-spacing:8px;">
                    <div class="global-confirm-buttons">
                        <button class="global-confirm-btn cancel">取消</button>
                        <button class="global-confirm-btn confirm info">确定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.global-prompt-input');
            const captchaImg = modal.querySelector('.captcha-img');

            // 点击图片刷新验证码
            captchaImg.addEventListener('click', async () => {
                try {
                    captchaImg.style.opacity = '0.4';
                    const res = await fetch('/api/user/captcha');
                    const data = await res.json();
                    if (data.success && data.image) {
                        captchaImg.src = data.image;
                        input.value = '';
                        input.focus();
                    }
                } catch (e) { /* ignore */ }
                finally { captchaImg.style.opacity = '1'; }
            });

            requestAnimationFrame(() => {
                modal.classList.add('show');
                input.focus();
            });

            const confirmBtn = modal.querySelector('.global-confirm-btn.confirm');
            const cancelBtn = modal.querySelector('.global-confirm-btn.cancel');

            function close(result) {
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
})(window);
