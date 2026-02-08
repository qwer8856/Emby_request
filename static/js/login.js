        const menuToggle = document.getElementById('menuToggle');
        const drawer = document.getElementById('mobileDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        const drawerLinks = document.getElementById('drawerLinks');
        const drawerClose = document.getElementById('drawerClose');
        const headerNavLinks = document.querySelector('.nav-links');

        if (headerNavLinks && drawerLinks) {
            drawerLinks.innerHTML = headerNavLinks.innerHTML + `
                <a href="https://t.me/LiuYingSheEmby" target="_blank">
                    <span class="nav-icon">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.78 18.65L10.06 14.42L17.74 7.5C18.08 7.19 17.67 7.04 17.22 7.31L7.74 13.3L3.64 12C2.76 11.75 2.75 11.14 3.84 10.7L19.81 4.54C20.54 4.21 21.24 4.72 20.96 5.84L18.24 18.65C18.05 19.56 17.5 19.78 16.74 19.36L12.6 16.3L10.61 18.23C10.38 18.46 10.19 18.65 9.78 18.65Z"/>
                        </svg>
                    </span>
                    帮助
                </a>`;
        }

        function openDrawer() {
            drawer.classList.add('show');
            drawerOverlay.classList.add('show');
            document.body.classList.add('drawer-open');
            drawer.setAttribute('aria-hidden', 'false');
        }

        function closeDrawer() {
            drawer.classList.remove('show');
            drawerOverlay.classList.remove('show');
            document.body.classList.remove('drawer-open');
            drawer.setAttribute('aria-hidden', 'true');
        }

        menuToggle?.addEventListener('click', openDrawer);
        drawerClose?.addEventListener('click', closeDrawer);
        drawerOverlay?.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && drawer.classList.contains('show')) {
                closeDrawer();
            }
        });

        let isSubmitting = false; // 请求锁定
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 防止重复提交
            if (isSubmitting) {
                return;
            }
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error');
            const submitBtn = document.querySelector('.submit-btn');
            
            // 验证输入
            if (!username) {
                showToast('输入错误', '请输入用户名', 'error');
                return;
            }
            
            // 设置锁定状态
            isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-spinner"></span>登录中';
            submitBtn.classList.add('loading');
            errorDiv.classList.remove('show');
            
            // 添加重试逻辑
            let retryCount = 0;
            const maxRetries = 2; // 最多重试2次（总共尝试3次）
            
            async function attemptLogin() {
                try {
                    // 移动端使用更长的超时时间
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                    const timeout = isMobile ? 30000 : 20000; // 移动端30秒，桌面端20秒
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);
                    
                    const response = await fetch('/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password }),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    // 使用 response.text() 避免流消耗问题
                    const responseText = await response.text();
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('JSON解析失败:', parseError, '原始文本:', responseText.substring(0, 100));
                        throw new Error('服务器返回格式错误');
                    }
                    
                    // 检查 HTTP 状态码
                    if (!response.ok) {
                        console.warn('登录失败，状态码:', response.status);
                        showToast('登录失败', data.error || '请检查用户名和密码后重试', 'error');
                        return;
                    }
                    
                    if (data.success) {
                        submitBtn.innerHTML = '✓ 登录成功';
                        submitBtn.classList.remove('loading');
                        submitBtn.classList.add('success');
                        showToast('登录成功', '正在跳转...', 'success');
                        
                        // 延迟跳转，使用 replace 替换历史记录，防止返回键回到登录页
                        setTimeout(() => {
                            window.location.replace(data.redirect);
                        }, 500);
                    } else {
                        console.warn('登录失败，服务器返回:', data);
                        showToast('登录失败', data.error || '请检查用户名和密码', 'error');
                    }
                } catch (error) {
                    console.error('登录错误 (尝试 ' + (retryCount + 1) + '/' + (maxRetries + 1) + '):', error);
                    
                    // 如果是超时或网络错误，且还有重试机会，则自动重试
                    if ((error.name === 'AbortError' || error.name === 'TypeError') && retryCount < maxRetries) {
                        retryCount++;
                        // 按钮继续显示“登录中...”，不显示重试进度
                        
                        // 等待1秒后重试
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return await attemptLogin();
                    }
                    
                    // 超过重试次数或其他错误
                    if (error.name === 'AbortError') {
                        showToast('请求超时', '网络响应过慢，请稍后重试', 'error');
                    } else if (error.name === 'TypeError') {
                        showToast('网络错误', '无法连接到服务器，请检查网络', 'error');
                    } else {
                        showToast('登录失败', error.message || '发生未知错误', 'error');
                    }
                }
            }
            
            // 执行登录尝试
            try {
                await attemptLogin();
            } finally {
                // 最终释放锁定状态（成功跳转时不会执行到这里的恢复）
                if (!submitBtn.classList.contains('success')) {
                    isSubmitting = false;
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '登录';
                    submitBtn.classList.remove('loading');
                }
            }
        });
