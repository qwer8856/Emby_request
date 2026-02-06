// admin.js v29 - 修复配置保存后重新加载时序问题
let currentRequestId = null;
    let currentStatus = null;
    let isBatchMode = false;
    let downloadPollTimer = null;
    let ptModalElement = null;
    let ptResultsElement = null;
    let ptKeywordInput = null;
    let ptSummaryElement = null;
    let ptCurrentRequestId = null;
    let ptResultsCache = [];
    let ptSortKey = 'seeders';
    let ptFreeOnly = false;

    // ==================== 移动端侧边栏控制 ====================
    function toggleSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const body = document.body;
        
        if (sidebar) {
            sidebar.classList.toggle('show');
            if (sidebar.classList.contains('show')) {
                if (overlay) overlay.classList.add('show');
                body.style.overflow = 'hidden'; // 禁止背景滚动
            } else {
                if (overlay) overlay.classList.remove('show');
                body.style.overflow = '';
            }
        }
    }
    
    function closeSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // 初始化侧边栏事件
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }
        
        // 点击侧边栏链接后自动关闭（仅移动端）
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });
    });
    
    // ==================== 管理员退出登录 ====================
    async function adminLogout() {
        const confirmed = await showConfirm({
            title: '退出确认',
            message: '确定要退出管理后台吗？',
            confirmText: '确定退出',
            cancelText: '取消',
            type: 'warning'
        });
        if (!confirmed) return;
        
        try {
            const response = await fetch('/api/admin-logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 退出成功，跳转到首页
                window.location.href = '/';
            } else {
                showToast('错误', data.error || '退出失败', 'error');
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            // 即使失败也跳转
            window.location.href = '/';
        }
    }
    
    // ==================== 可折叠设置卡片 ====================
    function toggleSettingsCard(header) {
        const card = header.closest('.settings-card');
        if (card) {
            card.classList.toggle('collapsed');
        }
    }
        
    // ==================== 图表初始化 ====================
    async function initCharts() {
            // 加载 Chart.js（CDN）
            if (!window.Chart) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            // 获取每日趋势数据
            try {
                const dailyRes = await fetch('/admin/stats/daily');
                const dailyData = await dailyRes.json();
                
                if (dailyData.success) {
                    const ctx = document.getElementById('dailyChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: dailyData.data.map(d => d.date.slice(5)),  // 只显示月-日
                            datasets: [{
                                label: '求片数',
                                data: dailyData.data.map(d => d.count),
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 3,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: { stepSize: 1 }
                                },
                                x: {
                                    ticks: {
                                        maxTicksLimit: 10,
                                        maxRotation: 0
                                    }
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('加载每日趋势失败:', e);
            }
            
            // 获取类型分布数据
            try {
                const typeRes = await fetch('/admin/stats/type');
                const typeData = await typeRes.json();
                
                if (typeData.success) {
                    const ctx = document.getElementById('typeChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['电影', '剧集'],
                            datasets: [{
                                data: [typeData.data.movie, typeData.data.tv],
                                backgroundColor: ['#667eea', '#764ba2'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom'
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('加载类型分布失败:', e);
            }
        }
        
        // 从URL hash恢复页面
        function restoreAdminSectionFromHash() {
            const hash = window.location.hash.slice(1); // 移除 # 号
            
            // 移除预加载样式（防止刷新闪屏用）
            const preloadStyle = document.getElementById('preload-style');
            if (preloadStyle) {
                preloadStyle.remove();
            }
            
            if (hash) {
                const sectionEl = document.getElementById(`section-${hash}`);
                if (sectionEl) {
                    switchAdminSection(hash, null, false);
                    return true;
                }
            }
            return false;
        }
        
        // 页面加载后初始化
        document.addEventListener('DOMContentLoaded', () => {
            // 从URL hash恢复上次访问的页面
            restoreAdminSectionFromHash();
            
            initCharts();
            initDownloadPolling();
            initPtModal();
        });
        
        // ==================== 批量操作 ====================
        function toggleSelectAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                // 只选择可见的行
                const row = cb.closest('tr');
                if (row.style.display !== 'none') {
                    cb.checked = selectAll.checked;
                }
            });
            updateSelectedCount();
        }
        
        function updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            const count = checkboxes.length;
            document.getElementById('selectedCount').textContent = count;
            
            const batchActions = document.getElementById('batchActions');
            if (count > 0) {
                batchActions.style.display = 'flex';
            } else {
                batchActions.style.display = 'none';
            }
        }
        
        function getSelectedIds() {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            return Array.from(checkboxes).map(cb => parseInt(cb.value));
        }
        
        async function batchUpdate(status) {
            const ids = getSelectedIds();
            if (ids.length === 0) {
                showToast('提示', '请先选择要操作的记录', 'info');
                return;
            }
            
            const actionName = status === 'approved' ? '批准' : status === 'completed' ? '完成' : '拒绝';
            const confirmed = await showConfirm({
                title: '批量操作确认',
                message: `确定要批量${actionName} ${ids.length} 条记录吗？`,
                confirmText: '确定',
                type: 'warning'
            });
            if (!confirmed) return;
            
            showLoading('正在批量处理...');
            
            try {
                const response = await fetch('/admin/batch-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ids: ids,
                        status: status,
                        admin_note: ''
                    })
                });
                
                const data = await response.json();
                hideLoading();
                
                // 停止下载轮询
                if (downloadPollTimer) {
                    clearInterval(downloadPollTimer);
                    downloadPollTimer = null;
                }
                
                if (data.success) {
                    showToast('批量操作成功', `已更新 ${data.success_count} 条记录`, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('操作失败', data.error || '未知错误', 'error');
                }
            } catch (error) {
                hideLoading();
                showToast('网络错误', error.message, 'error');
            }
        }
        
        // 批量删除 - 显示确认弹窗
        function batchDelete() {
            const ids = getSelectedIds();
            if (ids.length === 0) {
                showToast('提示', '请先选择要删除的记录', 'info');
                return;
            }
            
            // 更新删除数量并显示弹窗
            document.getElementById('deleteCount').textContent = ids.length;
            document.getElementById('deleteConfirmOverlay').classList.add('show');
        }
        
        // 关闭删除确认弹窗
        function closeDeleteConfirm() {
            document.getElementById('deleteConfirmOverlay').classList.remove('show');
        }
        
        // 确认批量删除
        async function confirmBatchDelete() {
            const ids = getSelectedIds();
            if (ids.length === 0) {
                closeDeleteConfirm();
                return;
            }
            
            // 关闭弹窗
            closeDeleteConfirm();
            
            // 显示加载动画
            showLoading('正在删除...');
            
            try {
                const response = await fetch('/admin/batch-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: ids })
                });
                
                const data = await response.json();
                hideLoading();
                
                // 停止下载轮询
                if (downloadPollTimer) {
                    clearInterval(downloadPollTimer);
                    downloadPollTimer = null;
                }
                
                if (data.success) {
                    showToast('删除成功', `已删除 ${data.success_count} 条记录`, 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('删除失败', data.error || '未知错误', 'error');
                }
            } catch (error) {
                hideLoading();
                showToast('网络错误', error.message, 'error');
            }
        }
        
        function showBatchNoteModal() {
            isBatchMode = true;
            document.getElementById('noteModal').classList.add('show');
        }
        
        function filterRequests(status) {
            // 跳转到带状态参数的URL（服务端过滤）
            window.location.href = `/admin?status=${status}&page=1`;
        }
        
        function showNoteModal(requestId, status) {
            console.log('showNoteModal called with:', requestId, status);
            if (!requestId) {
                console.error('showNoteModal: requestId is empty!');
                showToast('错误', '无法获取请求ID', 'error');
                return;
            }
            currentRequestId = requestId;
            currentStatus = status;
            isBatchMode = false;
            document.getElementById('noteModalTitle').textContent = '拒绝原因';
            document.getElementById('adminNote').value = '';  // 清空输入框
            document.getElementById('adminNote').placeholder = '请输入拒绝原因（可选）';
            document.getElementById('noteModal').classList.add('show');
        }
        
        // 批准弹窗（带备注）
        function showApproveModal(requestId) {
            console.log('showApproveModal called with:', requestId);
            if (!requestId) {
                console.error('showApproveModal: requestId is empty!');
                showToast('错误', '无法获取请求ID', 'error');
                return;
            }
            currentRequestId = requestId;
            currentStatus = 'processing';  // 批准后状态为"正在处理"
            isBatchMode = false;
            document.getElementById('noteModalTitle').textContent = '批准备注';
            document.getElementById('adminNote').value = '';  // 清空输入框
            document.getElementById('adminNote').placeholder = '备注（可选）';
            document.getElementById('noteModal').classList.add('show');
        }
        
        function closeModal() {
            document.getElementById('noteModal').classList.remove('show');
            document.getElementById('adminNote').value = '';
            currentRequestId = null;
            currentStatus = null;
            isBatchMode = false;
        }
        
        // 通用模态框 - 显示
        function showModal(title, content) {
            const overlay = document.getElementById('genericModalOverlay');
            const titleEl = document.getElementById('genericModalTitle');
            const bodyEl = document.getElementById('genericModalBody');
            
            if (overlay && titleEl && bodyEl) {
                titleEl.textContent = title;
                bodyEl.innerHTML = content;
                overlay.style.display = 'flex';
                // 点击背景关闭
                overlay.onclick = function(e) {
                    if (e.target === overlay) {
                        closeGenericModal();
                    }
                };
            }
        }
        
        // 通用模态框 - 关闭
        function closeGenericModal() {
            const overlay = document.getElementById('genericModalOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
        
        // 显示加载动画
        function showLoading(text = '处理中...') {
            const overlay = document.getElementById('loadingOverlay');
            const loadingText = document.getElementById('loadingText');
            if (overlay) {
                if (loadingText) loadingText.textContent = text;
                overlay.classList.add('show');
            }
        }
        
        // 隐藏加载动画
        function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
        
        async function updateStatus(requestId, status, note = '') {
            console.log('updateStatus called with:', requestId, status, note);
            if (!requestId) {
                console.error('updateStatus: requestId is empty!');
                showToast('错误', '无法获取请求ID', 'error');
                return;
            }
            
            // 立即停止下载轮询，避免并发请求
            if (downloadPollTimer) {
                clearInterval(downloadPollTimer);
                downloadPollTimer = null;
            }
            
            // 显示加载动画
            const statusText = status === 'approved' ? '正在批准...' : 
                              status === 'processing' ? '正在批准...' :
                              status === 'rejected' ? '正在拒绝...' : 
                              status === 'completed' ? '正在完成...' : '处理中...';
            showLoading(statusText);
            
            try {
                console.log('发送更新请求:', requestId, status);
                const response = await fetch(`/admin/update-request/${requestId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: status,
                        admin_note: note
                    })
                });
                
                console.log('响应状态:', response.status, 'OK:', response.ok);
                
                // 先获取响应文本
                const responseText = await response.text();
                console.log('响应内容:', responseText);
                
                // 检查 HTTP 状态码
                if (!response.ok) {
                    hideLoading();
                    let data = {};
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        console.error('JSON 解析失败:', e);
                    }
                    showToast('更新失败', data.error || `服务器错误 (${response.status})`, 'error');
                    return;
                }
                
                // 解析 JSON
                let data = {};
                try {
                    data = JSON.parse(responseText);
                    console.log('解析后的数据:', data);
                } catch (e) {
                    hideLoading();
                    console.error('成功响应的 JSON 解析失败:', e);
                    showToast('网络错误', '响应格式错误', 'error');
                    return;
                }
                
                // 隐藏加载动画
                hideLoading();
                
                // 停止下载轮询，避免页面刷新时产生额外请求
                if (downloadPollTimer) {
                    clearInterval(downloadPollTimer);
                    downloadPollTimer = null;
                }
                
                if (data.success) {
                    showToast('操作成功', '状态已更新', 'success');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showToast('更新失败', data.error || '未知错误', 'error');
                }
            } catch (error) {
                // 隐藏加载动画
                hideLoading();
                
                console.error('更新错误详情:', error);
                console.error('错误类型:', error.name);
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
                showToast('网络错误', `${error.message || '请检查连接后重试'}`, 'error');
            }
        }
        
        async function confirmUpdate() {
            const note = document.getElementById('adminNote').value;
            
            // 先保存当前值，因为 closeModal 会清空它们
            const requestId = currentRequestId;
            const status = currentStatus;
            const batchMode = isBatchMode;
            
            // 关闭备注弹窗
            closeModal();
            
            if (batchMode) {
                // 批量拒绝
                const ids = getSelectedIds();
                if (ids.length === 0) {
                    showToast('提示', '请先选择要操作的记录', 'info');
                    return;
                }
                
                // 显示加载动画
                showLoading('正在批量处理...');
                
                try {
                    const response = await fetch('/admin/batch-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ids: ids,
                            status: 'rejected',
                            admin_note: note
                        })
                    });
                    
                    const data = await response.json();
                    
                    // 隐藏加载动画
                    hideLoading();
                    
                    // 停止下载轮询
                    if (downloadPollTimer) {
                        clearInterval(downloadPollTimer);
                        downloadPollTimer = null;
                    }
                    
                    if (data.success) {
                        showToast('批量操作成功', `已拒绝 ${data.success_count} 条记录`, 'success');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        showToast('操作失败', data.error || '未知错误', 'error');
                    }
                } catch (error) {
                    hideLoading();
                    showToast('网络错误', error.message, 'error');
                }
            } else {
                // 单条更新（updateStatus 内部已有加载动画）
                updateStatus(requestId, status, note);
            }
        }

        // ==================== 同步下载状态 ====================
        async function syncDownloads() {
            // 显示加载动画
            showLoading('同步下载状态中...');
            
            try {
                const response = await fetch('/api/admin/sync-downloads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                hideLoading();
                
                if (data.success) {
                    showToast('同步成功', data.message, 'success');
                    // 刷新页面以显示最新状态
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast('同步失败', data.error || '未知错误', 'error');
                }
            } catch (error) {
                hideLoading();
                showToast('网络错误', error.message, 'error');
            }
        }

        // ==================== 下载进度轮询 ====================
        function initDownloadPolling() {
            const progressBlocks = document.querySelectorAll('.download-progress');
            if (!progressBlocks.length) {
                return;
            }
            progressBlocks.forEach(applyInitialProgress);
            fetchAllDownloadStatuses();
            if (downloadPollTimer) {
                clearInterval(downloadPollTimer);
            }
            downloadPollTimer = setInterval(fetchAllDownloadStatuses, 9000);
        }

        function fetchAllDownloadStatuses() {
            document.querySelectorAll('.download-progress').forEach(block => {
                const requestId = block.dataset.requestId;
                if (requestId) {
                    refreshDownloadStatus(requestId, block);
                }
            });
        }

        async function refreshDownloadStatus(requestId, block) {
            try {
                const response = await fetch(`/api/downloads/${requestId}?_=${Date.now()}`);
                if (!response.ok) {
                    return;
                }
                const data = await response.json();
                if (!data.success || !data.task) {
                    return;
                }
                updateProgressBlock(block, data.task);
            } catch (error) {
                console.warn('获取下载状态失败', error);
            }
        }

        function updateProgressBlock(block, task) {
            const fill = block.querySelector('.progress-fill');
            const value = block.querySelector('.progress-value');
            const speed = block.querySelector('.progress-speed');
            const eta = block.querySelector('.progress-eta');
            const progress = Math.min(100, Math.max(0, task.progress || 0));
            
            if (fill) {
                fill.style.width = `${progress}%`;
            }
            if (value) {
                value.textContent = `${progress.toFixed(1)}%`;
            }
            if (speed) {
                speed.textContent = formatSpeed(task.download_speed || 0);
            }
            if (eta) {
                eta.textContent = formatEta(task.eta);
            }
            
            // 完成状态时添加 class
            if (progress >= 100) {
                block.classList.add('completed');
            } else {
                block.classList.remove('completed');
            }
        }

        function applyInitialProgress(block) {
            const progress = parseFloat(block.dataset.progress || '0');
            const speed = parseInt(block.dataset.speed || '0', 10);
            const eta = parseInt(block.dataset.eta || '-1', 10);
            updateProgressBlock(block, {
                progress,
                download_speed: speed,
                eta,
            });
        }

        function formatSpeed(bytesPerSecond) {
            if (!bytesPerSecond || bytesPerSecond <= 0) {
                return '0 B/s';
            }
            const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
            let value = bytesPerSecond;
            let index = 0;
            while (value >= 1024 && index < units.length - 1) {
                value /= 1024;
                index += 1;
            }
            return `${value.toFixed(1)} ${units[index]}`;
        }

        function formatEta(etaSeconds) {
            if (etaSeconds === undefined || etaSeconds === null || etaSeconds < 0) {
                return 'ETA --';
            }
            const hours = Math.floor(etaSeconds / 3600);
            const minutes = Math.floor((etaSeconds % 3600) / 60);
            const seconds = Math.floor(etaSeconds % 60);
            const parts = [hours, minutes, seconds].map(num => num.toString().padStart(2, '0'));
            return `ETA ${parts.join(':')}`;
        }

        // ==================== 馒头 PT Modal ====================
        function initPtModal() {
            ptModalElement = document.getElementById('ptModal');
            ptResultsElement = document.getElementById('ptResults');
            ptKeywordInput = document.getElementById('ptKeyword');
            ptSummaryElement = document.getElementById('ptSummary');
            if (ptKeywordInput) {
                ptKeywordInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        searchPtTorrents();
                    }
                });
            }
            if (ptModalElement) {
                ptModalElement.addEventListener('click', (event) => {
                    if (event.target === ptModalElement) {
                        closePtModal();
                    }
                });
            }
        }

        function openPtModal(buttonOrId, title = '', year = '') {
            let requestId, mediaType, requestType, season, episode;
            
            // 支持传入按钮元素或直接传入参数
            if (typeof buttonOrId === 'object' && buttonOrId.dataset) {
                const btn = buttonOrId;
                requestId = btn.dataset.request;
                title = btn.dataset.title || '';
                year = btn.dataset.year || '';
                mediaType = btn.dataset.mediaType || 'movie';
                requestType = btn.dataset.requestType || 'all';
                season = btn.dataset.season || '';
                episode = btn.dataset.episode || '';
            } else {
                requestId = buttonOrId;
            }
            
            ptCurrentRequestId = requestId;
            if (!ptModalElement) return;
            
            // 构建搜索关键词
            let keyword = title;
            
            // 如果是电视剧且有指定季/集，添加到搜索关键词
            if (mediaType === 'tv') {
                if (requestType === 'season' && season) {
                    // 指定季: "剧名 S01" 或 "剧名 第一季"
                    keyword += ` S${season.toString().padStart(2, '0')}`;
                } else if (requestType === 'episode' && season && episode) {
                    // 指定集: "剧名 S01E05"
                    keyword += ` S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
                }
                // 全剧不添加季集信息
            }
            
            // 可选添加年份
            if (year && mediaType === 'movie') {
                keyword += ` ${year}`;
            }
            
            keyword = keyword.trim();
            
            if (ptKeywordInput) {
                ptKeywordInput.value = keyword;
            }
            
            // 显示搜索提示
            let searchHint = '';
            if (mediaType === 'tv') {
                if (requestType === 'season' && season) {
                    searchHint = `<p class="pt-search-hint">🎯 用户求片范围: <strong>第${season}季</strong></p>`;
                } else if (requestType === 'episode' && season && episode) {
                    searchHint = `<p class="pt-search-hint">🎯 用户求片范围: <strong>第${season}季第${episode}集</strong></p>`;
                } else {
                    searchHint = `<p class="pt-search-hint">🎯 用户求片范围: <strong>全剧</strong></p>`;
                }
            }
            
            ptResultsElement.innerHTML = searchHint + '<p class="pt-loading">搜索中</p>';
            ptModalElement.classList.add('show');
            searchPtTorrents(keyword);
        }

        function closePtModal() {
            if (!ptModalElement) return;
            ptModalElement.classList.remove('show');
            ptCurrentRequestId = null;
            if (ptResultsElement) {
                ptResultsElement.innerHTML = '<p class="pt-placeholder">输入关键字后开始搜索</p>';
            }
        }

        // 保存站点信息用于显示
        let ptSitesInfo = [];
        
        async function searchPtTorrents(keyword) {
            if (!ptCurrentRequestId) {
                showToast('提示', '请先选择求片记录', 'info');
                return;
            }
            const query = (keyword !== undefined ? keyword : (ptKeywordInput ? ptKeywordInput.value : '')).trim();
            if (!query) {
                ptResultsElement.innerHTML = '<p class="pt-placeholder">请输入搜索关键字</p>';
                if (ptSummaryElement) {
                    ptSummaryElement.textContent = '请输入关键字以展开搜索';
                }
                return;
            }
            try {
                // 显示骨架屏加载动画
                ptResultsElement.innerHTML = `
                    <div class="skeleton-loader">
                        ${Array(5).fill(0).map(() => `
                            <div class="skeleton-item">
                                <div class="skeleton-poster"></div>
                                <div class="skeleton-content">
                                    <div class="skeleton-line title"></div>
                                    <div class="skeleton-line subtitle"></div>
                                    <div class="skeleton-line text"></div>
                                    <div class="skeleton-actions">
                                        <div class="skeleton-button"></div>
                                        <div class="skeleton-button"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                if (ptSummaryElement) {
                    ptSummaryElement.textContent = `正在搜索「${query}」...`;
                }
                const response = await fetch(`/api/pt/search?request_id=${ptCurrentRequestId}&keyword=${encodeURIComponent(query)}`);
                
                // 解析响应
                const data = await response.json();
                
                // 检查响应状态
                if (!response.ok || !data.success) {
                    const errorMsg = data.error || `搜索失败 (${response.status})`;
                    ptResultsElement.innerHTML = `<p class="pt-placeholder">${escapeHtml(errorMsg)}</p>`;
                    if (ptSummaryElement) {
                        ptSummaryElement.textContent = errorMsg;
                    }
                    return;
                }
                ptResultsCache = Array.isArray(data.results) ? data.results : [];
                ptSitesInfo = data.sites || [];
                renderPtResults();
                updatePtSummary(query, ptResultsCache.length, ptSitesInfo);
            } catch (error) {
                console.error('PT搜索异常:', error);
                const errorMsg = '搜索失败，请检查网络连接或稍后重试';
                ptResultsElement.innerHTML = `<p class="pt-placeholder">${errorMsg}</p>`;
                if (ptSummaryElement) {
                    ptSummaryElement.textContent = errorMsg;
                }
            }
        }

        function renderPtResults() {
            if (!ptResultsElement) return;
            if (!ptResultsCache.length) {
                ptResultsElement.innerHTML = '<p class="pt-placeholder">没有找到匹配的种子</p>';
                if (ptSummaryElement) {
                    ptSummaryElement.textContent = '未找到合适的结果，可尝试更换关键字';
                }
                return;
            }

            const filtered = ptResultsCache.filter(item => {
                if (!ptFreeOnly) return true;
                return isFreePromotion(item.promotion);
            });

            const sorted = filtered.sort((a, b) => {
                if (ptSortKey === 'size') {
                    return (parseBytes(a.size) || Infinity) - (parseBytes(b.size) || Infinity);
                }
                if (ptSortKey === 'created') {
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
                return (b.seeders || 0) - (a.seeders || 0);
            });

            if (!sorted.length) {
                ptResultsElement.innerHTML = '<p class="pt-placeholder">筛选条件下无结果</p>';
                if (ptSummaryElement) {
                    ptSummaryElement.textContent = '筛选条件过于严格，未匹配到种子';
                }
                return;
            }

            const cards = sorted.map(item => {
                const title = escapeHtml(item.title || '未知种子');
                const downloadUrl = escapeHtml(item.download_url || '');
                const promotionText = escapeHtml(item.promotion || '');
                const size = escapeHtml(item.size_text || formatSizeText(item.size));
                const seeders = item.seeders ?? '-';
                const leechers = item.leechers ?? '-';
                const created = item.created_at ? new Date(item.created_at).toLocaleString() : '未知时间';
                const category = escapeHtml(item.category || '-');
                
                // 解析媒体信息
                const mediaInfo = parseMediaInfo(item.title || '');
                
                // 解析促销类型并转换为友好显示
                let promoBadge = '';
                if (promotionText) {
                    let promoClass = '';
                    let promoDisplay = promotionText;
                    const promoLower = promotionText.toLowerCase();
                    
                    // 转换馒头的促销代码为友好显示
                    if (promoLower === 'percent_50' || promoLower.includes('50')) {
                        promoClass = 'half';
                        promoDisplay = '50%';
                    } else if (promoLower === 'free' || promoLower.includes('free') || promoLower.includes('免费')) {
                        promoClass = 'free';
                        promoDisplay = '免费';
                    } else if (promoLower === '_2x_free' || promoLower === '2xfree') {
                        promoClass = 'free';
                        promoDisplay = '2X免费';
                    } else if (promoLower.includes('2x') || promoLower.includes('double')) {
                        promoClass = 'double';
                        promoDisplay = '2X上传';
                    } else if (promoLower === 'percent_70') {
                        promoClass = 'half';
                        promoDisplay = '70%';
                    } else if (promoLower === 'percent_30') {
                        promoClass = 'free';
                        promoDisplay = '30%';
                    }
                    
                    promoBadge = `<span class="pt-promotion ${promoClass}">${promoDisplay}</span>`;
                }
                
                // 生成媒体标签
                const mediaTags = [];
                if (mediaInfo.resolution) mediaTags.push(`<span class="pt-tag pt-tag-resolution">${mediaInfo.resolution}</span>`);
                if (mediaInfo.source) mediaTags.push(`<span class="pt-tag pt-tag-source">${mediaInfo.source}</span>`);
                if (mediaInfo.videoCodec) mediaTags.push(`<span class="pt-tag pt-tag-video">${mediaInfo.videoCodec}</span>`);
                if (mediaInfo.audioCodec) mediaTags.push(`<span class="pt-tag pt-tag-audio">${mediaInfo.audioCodec}</span>`);
                if (mediaInfo.hdr) mediaTags.push(`<span class="pt-tag pt-tag-hdr">${mediaInfo.hdr}</span>`);
                
                const mediaTagsHtml = mediaTags.length ? `<div class="pt-media-tags">${mediaTags.join('')}</div>` : '';
                
                // 来源站点标签
                const sourceName = escapeHtml(item.source || 'PT');
                const sourceBadge = `<span class="pt-source-badge">${sourceName}</span>`;
                
                return `
                    <div class="pt-card">
                        <div class="pt-card-header">
                            <div class="pt-card-title">${title}</div>
                            <div class="pt-card-badges">
                                ${sourceBadge}
                                ${promoBadge}
                            </div>
                        </div>
                        ${mediaTagsHtml}
                        <div class="pt-card-meta">
                            <span class="pt-meta-size">大小：${size}</span>
                            <span class="pt-meta-seeders">做种：${seeders}</span>
                            <span class="pt-meta-leechers">下载：${leechers}</span>
                            <span class="pt-meta-category">类别：${category}</span>
                        </div>
                        <div class="pt-card-footer">
                            <small>上传时间：${created}</small>
                            <button class="pt-push-btn" data-torrent-id="${escapeHtml(item.id || '')}" data-download-url="${downloadUrl}" data-title="${title}" data-source="${sourceName}" onclick="pushTorrentToDownloader(this)">推送</button>
                        </div>
                    </div>
                `;
            }).join('');

            ptResultsElement.innerHTML = cards;
        }

        // 从种子标题解析媒体信息
        function parseMediaInfo(title) {
            const info = {
                resolution: null,
                source: null,
                videoCodec: null,
                audioCodec: null,
                hdr: null
            };
            
            const upperTitle = title.toUpperCase();
            
            // 分辨率
            if (/2160[PI]|4K|UHD/i.test(title)) info.resolution = '4K';
            else if (/1080[PI]/i.test(title)) info.resolution = '1080p';
            else if (/720[PI]/i.test(title)) info.resolution = '720p';
            else if (/480[PI]|SD/i.test(title)) info.resolution = '480p';
            
            // 来源
            if (/BLURAY|BLU-RAY|BDREMUX|BD-REMUX/i.test(title)) info.source = 'BluRay';
            else if (/REMUX/i.test(title)) info.source = 'Remux';
            else if (/WEB-DL|WEBDL/i.test(title)) info.source = 'WEB-DL';
            else if (/WEBRIP|WEB-RIP/i.test(title)) info.source = 'WEBRip';
            else if (/HDTV/i.test(title)) info.source = 'HDTV';
            else if (/DVDRIP|DVD-RIP/i.test(title)) info.source = 'DVDRip';
            else if (/BDRIP|BD-RIP/i.test(title)) info.source = 'BDRip';
            
            // 视频编码
            if (/[HX]\.?265|HEVC/i.test(title)) info.videoCodec = 'HEVC';
            else if (/[HX]\.?264|AVC/i.test(title)) info.videoCodec = 'H.264';
            else if (/AV1/i.test(title)) info.videoCodec = 'AV1';
            else if (/VP9/i.test(title)) info.videoCodec = 'VP9';
            else if (/MPEG-?2/i.test(title)) info.videoCodec = 'MPEG2';
            
            // 音频编码
            if (/TRUEHD|TRUE-HD/i.test(title)) info.audioCodec = 'TrueHD';
            else if (/DTS-HD[\s\.]?MA|DTS-HDMA/i.test(title)) info.audioCodec = 'DTS-HD MA';
            else if (/DTS-HD/i.test(title)) info.audioCodec = 'DTS-HD';
            else if (/ATMOS/i.test(title)) info.audioCodec = 'Atmos';
            else if (/DTS-X/i.test(title)) info.audioCodec = 'DTS:X';
            else if (/DTS/i.test(title)) info.audioCodec = 'DTS';
            else if (/FLAC/i.test(title)) info.audioCodec = 'FLAC';
            else if (/DD\+|DDP|E-?AC-?3/i.test(title)) info.audioCodec = 'DD+';
            else if (/DD|AC-?3/i.test(title)) info.audioCodec = 'DD';
            else if (/AAC/i.test(title)) info.audioCodec = 'AAC';
            
            // HDR
            if (/DOLBY[\s\.]?VISION|DV\b|DoVi/i.test(title)) info.hdr = 'DV';
            else if (/HDR10\+/i.test(title)) info.hdr = 'HDR10+';
            else if (/HDR10/i.test(title)) info.hdr = 'HDR10';
            else if (/HDR/i.test(title)) info.hdr = 'HDR';
            
            return info;
        }

        function formatSizeText(sizeBytes) {
            if (!sizeBytes) return '未知';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let value = sizeBytes;
            let index = 0;
            while (value >= 1024 && index < units.length - 1) {
                value /= 1024;
                index += 1;
            }
            return `${value.toFixed(2)} ${units[index]}`;
        }

        async function pushTorrentToDownloader(button) {
            if (!ptCurrentRequestId) {
                showToast('提示', '请先选择求片记录', 'info');
                return;
            }
            
            // 保存原始内容并显示加载动画
            const originalText = button.innerHTML;
            const originalWidth = button.offsetWidth;
            button.disabled = true;
            button.style.minWidth = originalWidth + 'px';
            button.innerHTML = '<span class="btn-spinner"></span>推送中';
            button.classList.add('loading');
            
            const payload = {
                request_id: ptCurrentRequestId,
                torrent_id: button.dataset.torrentId,
                download_url: button.dataset.downloadUrl,
                title: button.dataset.title,
                source: button.dataset.source || 'M-Team'  // 来源站点
            };
            try {
                const response = await fetch('/api/pt/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '推送失败');
                }
                button.innerHTML = '✓ 已推送';
                button.classList.remove('loading');
                button.classList.add('success');
                showToast('推送成功', '已提交至下载器', 'success');
                closePtModal();
                setTimeout(() => window.location.reload(), 1200);
            } catch (error) {
                // 恢复按钮状态
                button.innerHTML = originalText;
                button.disabled = false;
                button.classList.remove('loading');
                button.style.minWidth = '';
                showToast('推送失败', error.message || '未知错误', 'error');
            }
        }

        function setPtSort(sortKey, button) {
            ptSortKey = sortKey;
            document.querySelectorAll('.pt-chip[data-sort]').forEach(el => el.classList.remove('active'));
            if (button) {
                button.classList.add('active');
            }
            renderPtResults();
        }

        function togglePtFreeFilter(button) {
            ptFreeOnly = !ptFreeOnly;
            if (button) {
                button.classList.toggle('active', ptFreeOnly);
            }
            renderPtResults();
        }

        function updatePtSummary(keyword, count, sites = []) {
            if (!ptSummaryElement) return;
            const filterText = ptFreeOnly ? '（仅显示促销种）' : '';
            const sortText = ptSortKey === 'seeders' ? '做种最多' : ptSortKey === 'size' ? '体积最小' : '最新发布';
            const sitesText = sites.length > 0 ? `[${sites.join(', ')}] ` : '';
            ptSummaryElement.textContent = `${sitesText}「${keyword}」共 ${count} 条，按 ${sortText} 排序 ${filterText}`;
        }

        function isFreePromotion(promotion) {
            if (!promotion) return false;
            const text = promotion.toString().toLowerCase();
            return text.includes('free') || text.includes('免费') || text.includes('促销');
        }

        function parseBytes(value) {
            if (!value) return null;
            if (typeof value === 'number') return value;
            const match = String(value).match(/(\d+[\.,]?\d*)\s*(tb|gb|mb|kb|b)/i);
            if (!match) return null;
            const num = parseFloat(match[1].replace(',', ''));
            const unit = match[2].toUpperCase();
            const map = { TB: 1024 ** 4, GB: 1024 ** 3, MB: 1024 ** 2, KB: 1024, B: 1 };
            return Math.round(num * (map[unit] || 1));
        }

        function escapeHtml(text) {
            if (text === undefined || text === null) {
                return '';
            }
            return text
                .toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // ==================== 搜索功能 ====================
        function searchRequests() {
            const searchInput = document.getElementById('searchInput');
            const filter = searchInput.value.toLowerCase().trim();
            const table = document.getElementById('requestTableBody');
            const rows = table.getElementsByTagName('tr');
            
            let visibleCount = 0;
            
            for (let row of rows) {
                const movieInfo = row.querySelector('.movie-info');
                const username = row.cells[2]?.textContent || '';
                
                if (!movieInfo) continue;
                
                const title = movieInfo.querySelector('h4')?.textContent || '';
                const details = movieInfo.querySelector('p')?.textContent || '';
                
                const searchText = `${title} ${details} ${username}`.toLowerCase();
                
                if (searchText.includes(filter)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            }
            
            // 显示搜索结果统计
            if (filter) {
                console.log(`搜索 "${filter}" 找到 ${visibleCount} 条结果`);
            }
        }

        // ==================== 导出功能 ====================
        function exportRequests() {
            const table = document.getElementById('requestTableBody');
            const rows = table.getElementsByTagName('tr');
            
            // CSV 表头
            let csv = '\uFEFF'; // UTF-8 BOM
            csv += '影片名称,年份,TMDB ID,用户,类型,状态,求片时间,备注\n';
            
            // 遍历所有可见的行
            for (let row of rows) {
                if (row.style.display === 'none') continue; // 跳过被搜索隐藏的行
                
                const movieInfo = row.querySelector('.movie-info');
                if (!movieInfo) continue;
                
                const title = movieInfo.querySelector('h4')?.textContent || '';
                const details = movieInfo.querySelector('p')?.textContent || '';
                const username = row.cells[2]?.textContent || '';
                const mediaType = row.cells[3]?.textContent?.trim() || '';
                const status = row.cells[4]?.textContent?.trim() || '';
                const createdAt = row.cells[5]?.textContent || '';
                const adminNote = movieInfo.querySelector('[style*="color: #e74c3c"]')?.textContent.replace('备注: ', '') || '';
                
                // 从 details 中提取年份和 TMDB ID
                const yearMatch = details.match(/(\d{4})/);
                const tmdbMatch = details.match(/TMDB ID:\s*(\d+)/);
                const year = yearMatch ? yearMatch[1] : '';
                const tmdbId = tmdbMatch ? tmdbMatch[1] : '';
                
                // 清理换行和特殊字符
                const cleanTitle = title.replace(/[\n\r]/g, ' ').trim();
                const cleanMediaType = mediaType.replace(/[\n\r🎬📺]/g, ' ').trim();
                const cleanNote = adminNote.replace(/[\n\r]/g, ' ').trim();
                
                csv += `"${cleanTitle}","${year}","${tmdbId}","${username}","${cleanMediaType}","${status}","${createdAt}","${cleanNote}"\n`;
            }
            
            // 创建下载链接
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const now = new Date();
            const filename = `求片记录_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showMessage('导出成功！文件已下载', 'success');
        }

        // 显示提示消息
        function showMessage(message, type = 'info') {
            // 创建提示元素
            const messageDiv = document.createElement('div');
            messageDiv.className = `toast-message toast-${type}`;
            messageDiv.textContent = message;
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                font-size: 14px;
                font-weight: 500;
            `;
            
            document.body.appendChild(messageDiv);
            
            // 3秒后移除
            setTimeout(() => {
                messageDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(messageDiv);
                }, 300);
            }, 3000);
        }

        // 手动刷新功能
        async function refreshDashboard() {
            const refreshIcon = document.querySelector('.action-icon.refresh');
            if (refreshIcon && refreshIcon.classList.contains('spinning')) {
                return; // 已经在刷新中
            }
            
            if (refreshIcon) {
                refreshIcon.classList.add('spinning');
            }
            
            try {
                // 刷新统计数据
                const statsResponse = await fetch('/admin/stats/summary');
                const statsData = await statsResponse.json();
                
                if (statsData.success) {
                    // 更新统计卡片
                    updateStatCards(statsData.data);
                    // 更新快速操作区
                    updateQuickActions(statsData.data);
                    showMessage('✅ 数据已更新', 'success');
                } else {
                    showMessage('❌ ' + (statsData.error || '无法获取数据'), 'error');
                }
                
                // 重新加载图表
                await initCharts();
                
            } catch (error) {
                console.error('刷新失败:', error);
                showMessage('❌ 刷新失败，请检查网络连接', 'error');
            } finally {
                if (refreshIcon) {
                    setTimeout(() => {
                        refreshIcon.classList.remove('spinning');
                    }, 500);
                }
            }
        }

        // 更新统计卡片
        function updateStatCards(stats) {
            const statCards = document.querySelectorAll('.stats .stat-card');
            const mapping = [
                { key: 'total', selector: '.stat-card.total h3' },
                { key: 'pending', selector: '.stat-card.pending h3' },
                { key: 'approved', selector: '.stat-card.approved h3' },
                { key: 'completed', selector: '.stat-card.completed h3' },
                { key: 'rejected', selector: '.stat-card.rejected h3' },
                { key: 'downloading', selector: '.stat-card.downloading h3' },
                { key: 'downloaded', selector: '.stat-card.downloaded h3' },
                { key: 'failed', selector: '.stat-card.failed h3' }
            ];
            
            mapping.forEach(item => {
                const element = document.querySelector(item.selector);
                if (element && stats[item.key] !== undefined) {
                    element.textContent = stats[item.key];
                }
            });
        }

        // 更新快速操作区
        function updateQuickActions(stats) {
            const actionItems = document.querySelectorAll('.quick-actions .action-item h4');
            if (actionItems[0] && stats.pending !== undefined) {
                actionItems[0].textContent = stats.pending;
            }
            if (actionItems[1] && stats.downloading !== undefined) {
                actionItems[1].textContent = stats.downloading;
            }
            if (actionItems[2] && stats.downloaded !== undefined) {
                actionItems[2].textContent = stats.downloaded;
            }
        }

        // 添加动画样式
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

// ==================== 管理模块切换 ====================
let currentAdminSection = 'requests';

function switchAdminSection(section, event, updateHash = true) {
    if (event) event.preventDefault();
    
    // 移动端切换菜单时关闭侧边栏
    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
    
    // 更新导航高亮
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`.sidebar-nav .nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');
    
    // 切换内容区
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) sectionEl.classList.add('active');
    
    // 更新页面标题
    const titles = {
        'requests': '求片管理',
        'subscriptions': '订阅管理',
        'orders': '订单管理',
        'redeem': '兑换码管理',
        'tickets': '工单管理',
        'blacklist': '设备黑名单',
        'invites': '邀请统计',
        'users': '用户管理',
        'plans': '套餐配置',
        'redeem-codes': '兑换码管理',
        'playback': '播放监控',
        'activity-logs': '操作日志',
        'knowledge': '知识库管理',
        'settings': '系统设置'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
    
    currentAdminSection = section;
    
    // 更新URL hash（记住当前页面）
    if (updateHash) {
        history.replaceState(null, '', `#${section}`);
    }
    
    // 加载对应模块数据
    switch(section) {
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'tickets':
            loadTickets();
            break;
        case 'blacklist':
            loadBlacklist();
            break;
        case 'invites':
            loadInviteStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'plans':
            loadPlansConfig();
            break;
        case 'redeem':
        case 'redeem-codes':
            loadRedeemCodes();
            break;
        case 'playback':
            loadAdminPlayback();
            break;
        case 'knowledge':
            loadKnowledge();
            break;
        case 'settings':
            loadSiteConfig();
            loadPaymentConfig();
            loadDownloadConfig();
            loadSystemConfig();
            loadCategoryConfig();  // 加载分类策略配置
            loadLines();
            loadAnnouncements();
            loadAllActivityLogs();  // 加载操作日志
            break;
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

// ==================== 订阅管理 ====================
let allSubscriptions = [];

// 同步订阅记录 - 为有订阅但没有订阅记录的用户补充创建
async function syncSubscriptionRecords() {
    const confirmed = await showConfirm({
        title: '同步订阅记录',
        message: '此操作将为有有效订阅但没有订阅记录的用户补充创建记录，是否继续？',
        confirmText: '确定同步',
        cancelText: '取消',
        type: 'info'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/subscriptions/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('同步成功', data.message, 'success');
            // 刷新订阅列表
            loadSubscriptions();
        } else {
            showToast('同步失败', data.error || '未知错误', 'error');
        }
    } catch (error) {
        console.error('同步订阅记录失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

async function loadSubscriptions() {
    const status = document.getElementById('subscriptionStatusFilter')?.value || '';
    try {
        const response = await fetch(`/api/admin/subscriptions?status=${status}`);
        const data = await response.json();
        
        if (data.success) {
            allSubscriptions = data.subscriptions || [];
            renderSubscriptions(allSubscriptions);
            updateSubscriptionStats(data.stats || {});
        } else {
            showToast('加载失败', data.error || '无法加载订阅数据', 'error');
        }
    } catch (error) {
        console.error('加载订阅失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function renderSubscriptions(subscriptions) {
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;
    
    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">暂无订阅数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = subscriptions.map(sub => {
        // 处理到期时间显示
        let endDateText = '-';
        if (sub.plan_type === 'whitelist') {
            endDateText = '永不过期';
        } else if (sub.end_date) {
            endDateText = new Date(sub.end_date).toLocaleDateString();
        }
        
        return `
            <tr>
                <td>${sub.user_name || '未知用户'}</td>
                <td><code>${sub.user_tg_id || '-'}</code></td>
                <td><span class="plan-badge ${sub.plan_type}">${sub.plan_name || '-'}</span></td>
                <td>${sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '-'}</td>
                <td>${endDateText}</td>
                <td><span class="status-badge ${sub.status}">${getSubscriptionStatusText(sub.status)}</span></td>
                <td>
                    <button class="btn-action view" onclick="viewSubscription(${sub.user_tg_id})">查看</button>
                    ${sub.status === 'active' && sub.plan_type !== 'whitelist' ? `<button class="btn-action edit" onclick="extendSubscription(${sub.user_tg_id})">延期</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function getSubscriptionStatusText(status) {
    const texts = {
        'active': '生效中',
        'expired': '已过期',
        'cancelled': '已取消'
    };
    return texts[status] || status;
}

function updateSubscriptionStats(stats) {
    document.getElementById('totalSubscriptions').textContent = stats.total || 0;
    document.getElementById('activeSubscriptions').textContent = stats.active || 0;
    document.getElementById('expiredSubscriptions').textContent = stats.expired || 0;
}

function searchSubscriptions() {
    const keyword = document.getElementById('subscriptionSearch')?.value.toLowerCase() || '';
    const filtered = allSubscriptions.filter(sub => 
        (sub.user_name || '').toLowerCase().includes(keyword) ||
        (sub.user_tg_id || '').toString().includes(keyword)
    );
    renderSubscriptions(filtered);
}

function viewSubscription(id) {
    showToast('提示', '订阅详情功能开发中', 'info');
}

function extendSubscription(id) {
    showToast('提示', '延期功能开发中', 'info');
}

// ==================== 订单管理 ====================
let allOrders = [];

async function loadOrders() {
    const status = document.getElementById('orderStatusFilter')?.value || '';
    try {
        const response = await fetch(`/api/admin/orders?status=${status}`);
        const data = await response.json();
        
        if (data.success) {
            allOrders = data.orders || [];
            renderOrders(allOrders);
            updateOrderStats(data.stats || {});
        } else {
            showToast('加载失败', data.error || '无法加载订单数据', 'error');
        }
    } catch (error) {
        console.error('加载订单失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">暂无订单数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><code>${order.order_no}</code></td>
            <td>${order.user_name || order.user_tg_id || '未知用户'}</td>
            <td>${order.plan_name || order.plan_type || '-'}</td>
            <td>¥${(order.final_price || order.original_price || 0).toFixed(2)}</td>
            <td>${getPaymentMethodText(order.payment_method)}</td>
            <td><span class="status-badge ${order.payment_status}">${getOrderStatusText(order.payment_status)}</span></td>
            <td>${order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
            <td>
                <button class="btn-action view" onclick="viewOrder('${order.order_no}')">查看</button>
                ${order.payment_status === 'pending' ? `<button class="btn-action edit" onclick="markOrderPaid('${order.order_no}')">标记已付</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function getPaymentMethodText(method) {
    const texts = {
        'alipay': '支付宝',
        'wechat': '微信支付',
        'manual': '人工处理'
    };
    return texts[method] || method || '-';
}

function getOrderStatusText(status) {
    const texts = {
        'pending': '待支付',
        'paid': '已支付',
        'cancelled': '已取消',
        'refunded': '已退款'
    };
    return texts[status] || status;
}

function updateOrderStats(stats) {
    document.getElementById('totalOrders').textContent = stats.total || 0;
    document.getElementById('pendingOrders').textContent = stats.pending || 0;
    document.getElementById('paidOrders').textContent = stats.paid || 0;
    document.getElementById('totalRevenue').textContent = '¥' + (stats.revenue || 0).toFixed(2);
}

function searchOrders() {
    const keyword = document.getElementById('orderSearch')?.value.toLowerCase() || '';
    const filtered = allOrders.filter(order => 
        (order.order_no || '').toLowerCase().includes(keyword) ||
        (order.user_name || '').toLowerCase().includes(keyword)
    );
    renderOrders(filtered);
}

function viewOrder(orderNo) {
    // 从已加载的订单列表中找到该订单
    const order = allOrders.find(o => o.order_no === orderNo);
    if (!order) {
        showToast('错误', '订单不存在', 'error');
        return;
    }
    
    const statusColors = {
        'pending': '#f59e0b',
        'paid': '#10b981',
        'cancelled': '#6b7280',
        'refunded': '#ef4444'
    };
    
    const statusTexts = {
        'pending': '待支付',
        'paid': '已支付',
        'cancelled': '已取消',
        'refunded': '已退款'
    };
    
    const paymentTexts = {
        'alipay': '支付宝',
        'wechat': '微信支付',
        'manual': '人工处理'
    };
    
    const modalContent = `
        <div class="order-detail-modal">
            <div class="order-detail-header">
                <div class="order-no-badge">
                    <span class="label">订单号</span>
                    <code>${order.order_no}</code>
                </div>
                <span class="order-status-lg" style="background: ${statusColors[order.payment_status] || '#6b7280'}">
                    ${statusTexts[order.payment_status] || order.payment_status}
                </span>
            </div>
            
            <div class="order-detail-section">
                <h4>👤 用户信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">用户名</span>
                        <span class="detail-value">${order.user_name || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">用户ID</span>
                        <span class="detail-value">${order.user_tg || order.user_tg_id || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h4>📦 套餐信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">套餐名称</span>
                        <span class="detail-value">${order.plan_name || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">套餐类型</span>
                        <span class="detail-value">${order.plan_type || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">订阅时长</span>
                        <span class="detail-value">${order.duration_months || 1} 个月</span>
                    </div>
                </div>
            </div>
            
            <div class="order-detail-section">
                <h4>💰 支付信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">原价</span>
                        <span class="detail-value">¥${(order.original_price || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">折扣</span>
                        <span class="detail-value ${order.discount > 0 ? 'text-success' : ''}">
                            ${order.discount > 0 ? '-¥' + order.discount.toFixed(2) : '无'}
                        </span>
                    </div>
                    <div class="detail-item highlight">
                        <span class="detail-label">实付金额</span>
                        <span class="detail-value price">¥${(order.final_price || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">支付方式</span>
                        <span class="detail-value">${paymentTexts[order.payment_method] || order.payment_method || '-'}</span>
                    </div>
                    ${order.trade_no ? `
                    <div class="detail-item full-width">
                        <span class="detail-label">交易流水号</span>
                        <span class="detail-value mono">${order.trade_no}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="order-detail-section">
                <h4>🕐 时间信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">创建时间</span>
                        <span class="detail-value">${order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">支付时间</span>
                        <span class="detail-value">${order.payment_time ? new Date(order.payment_time).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                </div>
            </div>
            
            ${order.payment_status === 'pending' ? `
            <div class="order-detail-actions">
                <button class="btn-action edit" onclick="markOrderPaid('${order.order_no}'); closeGenericModal();">标记为已支付</button>
                <button class="btn-action danger" onclick="cancelOrder('${order.order_no}'); closeGenericModal();">取消订单</button>
            </div>
            ` : ''}
        </div>
    `;
    
    showModal('订单详情', modalContent);
}

// 取消订单
async function cancelOrder(orderNo) {
    const confirmed = await showConfirm({
        title: '确认取消',
        message: '确定要取消此订单吗？此操作不可撤销。',
        confirmText: '确定取消',
        type: 'warning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/orders/${orderNo}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '订单已取消', 'success');
            loadOrders();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

async function markOrderPaid(orderNo) {
    const confirmed = await showConfirm({
        title: '确认标记',
        message: '确定要将此订单标记为已支付吗？',
        confirmText: '确定',
        type: 'warning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/orders/${orderNo}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '订单已标记为已支付', 'success');
            loadOrders();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

// ==================== 工单管理 ====================
let allTickets = [];
let currentTicketId = null;

async function loadTickets() {
    const status = document.getElementById('ticketStatusFilter')?.value || '';
    try {
        const response = await fetch(`/api/admin/tickets?status=${status}`);
        const data = await response.json();
        
        if (data.success) {
            allTickets = data.tickets || [];
            renderTickets(allTickets);
            updateTicketStats(data.stats || {});
        } else {
            showToast('加载失败', data.error || '无法加载工单数据', 'error');
        }
    } catch (error) {
        console.error('加载工单失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function renderTickets(tickets) {
    const tbody = document.getElementById('ticketsTableBody');
    if (!tbody) return;
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">暂无工单数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = tickets.map(ticket => `
        <tr>
            <td><code>${ticket.ticket_no}</code></td>
            <td>${ticket.user_name || ticket.user_tg_id || '未知用户'}</td>
            <td>${getCategoryText(ticket.category)}</td>
            <td>${ticket.subject || '-'}</td>
            <td><span class="priority-badge ${ticket.priority}">${getPriorityText(ticket.priority)}</span></td>
            <td><span class="status-badge ${ticket.status}">${getTicketStatusText(ticket.status)}</span></td>
            <td>${ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</td>
            <td>
                <button class="btn-action view" onclick="openTicketDetail(${ticket.id})">处理</button>
            </td>
        </tr>
    `).join('');
}

function getCategoryText(category) {
    const texts = {
        'account': '账户问题',
        'playback': '播放问题',
        'request': '求片问题',
        'subscription': '订阅问题',
        'other': '其他问题'
    };
    return texts[category] || category;
}

function getPriorityText(priority) {
    const texts = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return texts[priority] || priority;
}

function getTicketStatusText(status) {
    const texts = {
        'open': '待处理',
        'in_progress': '处理中',
        'closed': '已关闭'
    };
    return texts[status] || status;
}

function updateTicketStats(stats) {
    document.getElementById('totalTickets').textContent = stats.total || 0;
    document.getElementById('openTickets').textContent = stats.open || 0;
    document.getElementById('inProgressTickets').textContent = stats.in_progress || 0;
    document.getElementById('closedTickets').textContent = stats.closed || 0;
}

function searchTickets() {
    const keyword = document.getElementById('ticketSearch')?.value.toLowerCase() || '';
    const filtered = allTickets.filter(ticket => 
        (ticket.ticket_no || '').toLowerCase().includes(keyword) ||
        (ticket.subject || '').toLowerCase().includes(keyword) ||
        (ticket.user_name || '').toLowerCase().includes(keyword)
    );
    renderTickets(filtered);
}

async function openTicketDetail(ticketId) {
    try {
        // 获取工单详情（包含对话记录）
        const response = await fetch(`/api/admin/tickets/${ticketId}`);
        const data = await response.json();
        
        if (!data.success) {
            showToast('错误', data.error || '找不到工单信息', 'error');
            return;
        }
        
        const ticket = data.ticket;
        currentTicketId = ticketId;
        
        document.getElementById('ticketDetailNo').textContent = ticket.ticket_no;
        document.getElementById('ticketDetailUser').textContent = ticket.user_name || ticket.user_tg || '未知用户';
        document.getElementById('ticketDetailCategory').textContent = getCategoryText(ticket.category);
        document.getElementById('ticketDetailPriority').innerHTML = `<span class="priority-badge ${ticket.priority}">${getPriorityText(ticket.priority)}</span>`;
        document.getElementById('ticketDetailStatus').innerHTML = `<span class="status-badge ${ticket.status}">${getTicketStatusText(ticket.status)}</span>`;
        document.getElementById('ticketDetailSubject').textContent = ticket.subject || '-';
        document.getElementById('ticketDetailDescription').innerHTML = (ticket.description || '-').replace(/\n/g, '<br>');
        
        // 显示对话记录
        const messagesContainer = document.getElementById('ticketMessages');
        if (messagesContainer) {
            if (ticket.messages && ticket.messages.length > 0) {
                messagesContainer.innerHTML = ticket.messages.map(msg => `
                    <div class="chat-message ${msg.sender_type}">
                        <div class="message-header">
                            <span class="sender-name">${msg.sender_type === 'admin' ? '👨‍💼 ' + msg.sender_name : '👤 ' + msg.sender_name}</span>
                            <span class="message-time">${new Date(msg.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                        <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
                    </div>
                `).join('');
                messagesContainer.style.display = 'block';
            } else {
                messagesContainer.innerHTML = '<div class="no-messages">暂无对话记录</div>';
                messagesContainer.style.display = 'block';
            }
        }
        
        document.getElementById('ticketReplyInput').value = '';
        
        document.getElementById('ticketDetailModal').style.display = 'flex';
        
    } catch (error) {
        console.error('加载工单详情失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function closeTicketDetailModal() {
    document.getElementById('ticketDetailModal').style.display = 'none';
    currentTicketId = null;
}

async function submitTicketReply() {
    if (!currentTicketId) return;
    
    const reply = document.getElementById('ticketReplyInput').value.trim();
    
    if (!reply) {
        showToast('提示', '请输入回复内容', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicketId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reply: reply
                // 状态由后端自动管理，不再手动传递
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '回复已提交，工单状态已自动更新为"处理中"', 'success');
            closeTicketDetailModal();
            loadTickets();
        } else {
            showToast('失败', data.error || '提交失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

// 手动关闭当前工单
async function closeCurrentTicket() {
    if (!currentTicketId) return;
    
    const confirmed = await showConfirm({
        title: '关闭工单',
        message: '确定要关闭这个工单吗？关闭后用户将无法继续回复。',
        confirmText: '确定关闭',
        cancelText: '取消',
        type: 'warning'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicketId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '工单已关闭', 'success');
            closeTicketDetailModal();
            loadTickets();
        } else {
            showToast('失败', data.error || '关闭失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

// ==================== 邀请统计 ====================
async function loadInviteStats() {
    try {
        const response = await fetch('/api/admin/invite-stats');
        const data = await response.json();
        
        if (data.success) {
            updateInviteStatsDisplay(data.stats || {});
            renderInviteRecords(data.records || []);
            renderInviteRankList(data.rankings || []);
            if (data.trend) {
                renderInviteTrendChart(data.trend);
            }
        } else {
            showToast('加载失败', data.error || '无法加载邀请数据', 'error');
        }
    } catch (error) {
        console.error('加载邀请统计失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function updateInviteStatsDisplay(stats) {
    document.getElementById('totalInvites').textContent = stats.total || 0;
    document.getElementById('successfulInvites').textContent = stats.successful || 0;
    document.getElementById('totalRewards').textContent = '¥' + (stats.total_rewards || 0).toFixed(2);
}

function renderInviteRecords(records) {
    const tbody = document.getElementById('invitesTableBody');
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">暂无邀请记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.inviter_name || record.inviter_tg || '-'}</td>
            <td>${record.invitee_name || record.invitee_tg || '-'}</td>
            <td><code>${record.invite_code || '-'}</code></td>
            <td>${record.reward_type || '-'}</td>
            <td>¥${(record.reward_value || 0).toFixed(2)}</td>
            <td><span class="status-badge ${record.reward_claimed ? 'paid' : 'pending'}">${record.reward_claimed ? '已领取' : '待领取'}</span></td>
            <td>${record.created_at ? new Date(record.created_at).toLocaleString() : '-'}</td>
        </tr>
    `).join('');
}

function renderInviteRankList(rankings) {
    const container = document.getElementById('inviteRankList');
    if (!container) return;
    
    if (rankings.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">暂无排行数据</div>';
        return;
    }
    
    container.innerHTML = rankings.slice(0, 10).map((item, index) => `
        <div class="rank-item">
            <span class="rank-number">${index + 1}</span>
            <span class="rank-name">${item.name || item.tg_id || '用户' + (index + 1)}</span>
            <span class="rank-count">${item.count || 0} 人</span>
        </div>
    `).join('');
}

function renderInviteTrendChart(trendData) {
    const canvas = document.getElementById('inviteTrendChart');
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(d => d.date?.slice(5) || ''),
            datasets: [{
                label: '邀请数',
                data: trendData.map(d => d.count || 0),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function exportInviteStats() {
    showToast('提示', '导出功能开发中', 'info');
}

// ==================== 用户管理 ====================
let allUsers = [];
let userCurrentPage = 1;
let userTotalPages = 1;
let userSearchTimeout = null;

async function loadUsers(page = 1) {
    const role = document.getElementById('userRoleFilter')?.value || '';
    const search = document.getElementById('userSearch')?.value || '';
    userCurrentPage = page;
    
    try {
        const response = await fetch(`/api/admin/users?role=${role}&search=${encodeURIComponent(search)}&page=${page}&per_page=20`);
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users || [];
            renderUsers(allUsers);
            updateUserStats(data.stats || {});
            renderUserPagination(data.pagination || {});
        } else {
            showToast('加载失败', data.error || '无法加载用户数据', 'error');
        }
    } catch (error) {
        console.error('加载用户失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">暂无用户数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        // 判断用户实际状态：白名单 / 订阅用户 / 非订阅用户
        const isWhitelist = user.level === 'a';
        const isBanned = user.level === 'c';
        const hasSubscription = user.subscription_status === 'active';
        const currentType = isWhitelist ? 'whitelist' : (hasSubscription ? 'subscribed' : 'normal');
        
        // 角色显示：白名单 > 订阅用户 > 普通用户 > 已禁用
        let roleDisplay, roleClass;
        if (isBanned) {
            roleDisplay = '已禁用';
            roleClass = 'expired';
        } else if (isWhitelist) {
            roleDisplay = '白名单';
            roleClass = 'active';
        } else if (hasSubscription) {
            roleDisplay = '订阅用户';
            roleClass = 'active';
        } else {
            roleDisplay = '普通用户';
            roleClass = '';
        }
        
        // 订阅状态显示（包含到期时间）
        let subscriptionDisplay;
        if (isWhitelist) {
            subscriptionDisplay = '<span class="status-badge active">永久有效</span>';
        } else if (hasSubscription && user.subscription_end) {
            const endDate = new Date(user.subscription_end).toLocaleDateString('zh-CN');
            subscriptionDisplay = `<span class="status-badge active">已订阅</span><br><small style="color:#666;">${endDate}到期</small>`;
        } else {
            subscriptionDisplay = '<span class="status-badge expired">未订阅</span>';
        }
        
        return `
        <tr>
            <td class="hide-mobile">${user.id}</td>
            <td>${user.name || '-'}</td>
            <td class="hide-mobile">${user.telegram_id ? user.telegram_id : '<span style="color:#999;">未绑定</span>'}</td>
            <td>
                <span class="status-badge ${roleClass}">${roleDisplay}</span>
            </td>
            <td>${subscriptionDisplay}</td>
            <td class="hide-mobile">${user.request_count || 0}</td>
            <td class="hide-mobile">${user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}</td>
            <td>
                <button class="btn-action view" onclick="showUserDetail(${user.id})">详情</button>
                <select class="level-select" onchange="setUserType(${user.id}, this.value, '${currentType}')">
                    <option value="" disabled selected>设置类型</option>
                    <option value="whitelist" ${currentType === 'whitelist' ? 'disabled style="color:#999;"' : ''}>👑 白名单用户${currentType === 'whitelist' ? ' ✓' : ''}</option>
                    <option value="subscribed" ${currentType === 'subscribed' ? 'disabled style="color:#999;"' : ''}>⭐ 订阅用户${currentType === 'subscribed' ? ' ✓' : ''}</option>
                    <option value="normal" ${currentType === 'normal' ? 'disabled style="color:#999;"' : ''}>👤 非订阅用户${currentType === 'normal' ? ' ✓' : ''}</option>
                </select>
                ${user.level !== 'c' ? `<button class="btn-action danger" onclick="banUser(${user.id}, '${escapeHtml(user.name || '')}')">禁用</button>` : `<button class="btn-action success" onclick="unbanUser(${user.id}, '${escapeHtml(user.name || '')}')">解除禁用</button>`}
            </td>
        </tr>
    `}).join('');
}

function renderUserPagination(pagination) {
    userTotalPages = pagination.total_pages || 1;
    
    // 查找或创建分页容器
    let paginationContainer = document.getElementById('userPagination');
    if (!paginationContainer) {
        const table = document.getElementById('usersTable');
        if (table) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'userPagination';
            paginationContainer.className = 'pagination';
            table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        } else {
            return;
        }
    }
    
    if (userTotalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 上一页
    if (pagination.has_prev) {
        html += `<button class="page-btn" onclick="loadUsers(${userCurrentPage - 1})">上一页</button>`;
    }
    
    // 页码
    const startPage = Math.max(1, userCurrentPage - 2);
    const endPage = Math.min(userTotalPages, userCurrentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="loadUsers(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === userCurrentPage ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
    }
    
    if (endPage < userTotalPages) {
        if (endPage < userTotalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" onclick="loadUsers(${userTotalPages})">${userTotalPages}</button>`;
    }
    
    // 下一页
    if (pagination.has_next) {
        html += `<button class="page-btn" onclick="loadUsers(${userCurrentPage + 1})">下一页</button>`;
    }
    
    // 显示总数信息
    html += `<span class="page-info" style="margin-left: 15px; color: #666;">共 ${pagination.total} 条</span>`;
    
    paginationContainer.innerHTML = html;
}

function updateUserStats(stats) {
    document.getElementById('totalUsers').textContent = stats.total || 0;
    document.getElementById('adminUsers').textContent = stats.admins || 0;
    document.getElementById('subscribedUsers').textContent = stats.subscribed || 0;
}

function searchUsers() {
    // 使用防抖，避免频繁请求
    if (userSearchTimeout) {
        clearTimeout(userSearchTimeout);
    }
    userSearchTimeout = setTimeout(() => {
        loadUsers(1);  // 搜索时重置到第一页
    }, 300);
}

let currentUserId = null;

function openUserDetail(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('错误', '找不到用户信息', 'error');
        return;
    }
    
    currentUserId = userId;
    
    const levelNames = {'a': '白名单', 'b': '普通用户', 'c': '已禁用', 'd': '无账号'};
    
    document.getElementById('userDetailAvatar').textContent = (user.name || '?')[0].toUpperCase();
    document.getElementById('userDetailName').textContent = user.name || '-';
    document.getElementById('userDetailTgId').textContent = user.telegram_id ? user.telegram_id : '未绑定';
    document.getElementById('userDetailRole').textContent = (user.is_admin ? '管理员 / ' : '') + (levelNames[user.level] || user.level);
    
    // 订阅状态：白名单用户永远已订阅
    if (user.level === 'a') {
        document.getElementById('userDetailSubscription').textContent = '已订阅';
    } else {
        document.getElementById('userDetailSubscription').textContent = user.subscription_status === 'active' ? '已订阅' : '未订阅';
    }
    
    document.getElementById('userDetailModal').style.display = 'flex';
}

function closeUserDetailModal() {
    document.getElementById('userDetailModal').style.display = 'none';
    currentUserId = null;
}

async function toggleUserRole() {
    if (!currentUserId) return;
    
    const confirmed = await showConfirm({
        title: '切换用户等级',
        message: '确定要切换此用户的等级吗？\n(白名单 → 普通 → 禁用 → 白名单)',
        confirmText: '确定切换',
        type: 'warning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/users/${currentUserId}/toggle-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message || '用户等级已更新', 'success');
            closeUserDetailModal();
            loadUsers();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

async function setUserLevel(userId, level) {
    if (!level) return;
    
    const levelNames = {'a': '白名单', 'b': '普通用户'};
    const confirmed = await showConfirm({
        title: '设置用户等级',
        message: `确定要将此用户设置为「${levelNames[level]}」吗？`,
        confirmText: '确定',
        type: 'info'
    });
    if (!confirmed) {
        // 重置下拉框
        loadUsers();
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: level })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message || '用户等级已更新', 'success');
            loadUsers();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
            loadUsers();  // 重置下拉框
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
        loadUsers();
    }
}

// 设置用户类型：白名单 / 订阅用户 / 非订阅用户
async function setUserType(userId, userType, currentType) {
    if (!userType || userType === currentType) {
        loadUsers();  // 重置下拉框
        return;
    }
    
    const typeNames = {
        'whitelist': '白名单用户',
        'subscribed': '订阅用户',
        'normal': '非订阅用户'
    };
    
    let confirmMessage = `确定要将此用户设置为「${typeNames[userType]}」吗？`;
    if (userType === 'subscribed') {
        confirmMessage += '\n\n注意：设置为订阅用户后，请在详情页赠送订阅天数。';
    } else if (userType === 'normal') {
        confirmMessage += '\n\n将清除订阅时间并取消白名单。';
    } else if (userType === 'whitelist') {
        confirmMessage += '\n\n白名单用户永久有效，无需订阅。';
    }
    
    const confirmed = await showConfirm({
        title: '设置用户类型',
        message: confirmMessage,
        confirmText: '确定',
        type: 'info'
    });
    if (!confirmed) {
        loadUsers();
        return;
    }
    
    try {
        const requestBody = { user_type: userType };
        
        const response = await fetch(`/api/admin/users/${userId}/set-type`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message || '用户类型已更新', 'success');
            loadUsers();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
            loadUsers();
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
        loadUsers();
    }
}

async function banUser(userId, userName) {
    const confirmed = await showConfirm({
        title: '禁用用户',
        message: `确定要禁用用户「${userName}」吗？\n\n禁用后：\n• 用户无法使用 Emby 播放\n• Emby 账号将被停用`,
        confirmText: '确定禁用',
        type: 'danger'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: 'c' })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '用户已禁用', 'success');
            loadUsers();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

async function unbanUser(userId, userName) {
    const confirmed = await showConfirm({
        title: '解除用户禁用',
        message: `确定要解除用户 "${userName}" 的禁用状态吗？\n\n将执行以下操作：\n• 恢复封禁前的等级和到期时间\n• 恢复 Emby 账号\n• 解除该用户所有设备的黑名单`,
        confirmText: '确定解除',
        type: 'warning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/unban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restore_original: true })  // 恢复原先状态
        });
        const data = await response.json();
        
        if (data.success) {
            let message = data.message || '用户已解除禁用';
            if (data.emby_restored) {
                message += '\n✅ Emby 账号已恢复';
            } else if (data.emby_error) {
                message += `\n⚠️ ${data.emby_error}`;
            }
            if (data.devices_unblocked > 0) {
                message += `\n已解除 ${data.devices_unblocked} 个设备的黑名单`;
            }
            showToast('成功', message, data.emby_error ? 'warning' : 'success');
            loadUsers();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        showToast('网络错误', error.message, 'error');
    }
}

function giftSubscription() {
    showToast('提示', '赠送订阅功能开发中', 'info');
}

// ==================== 系统设置 - 支付配置 ====================
async function loadPaymentConfig() {
    try {
        const response = await fetch('/api/admin/payment-config');
        const data = await response.json();
        
        if (data.success && data.config) {
            const config = data.config;
            
            // 填充表单
            document.getElementById('epayUrl').value = config.epay_url || '';
            document.getElementById('epayPid').value = config.epay_pid || '';
            document.getElementById('epayKey').value = config.epay_key || '';
            document.getElementById('epayNotifyUrl').value = config.epay_notify_url || '';
            document.getElementById('epayReturnUrl').value = config.epay_return_url || '';
            
            // 更新状态徽章
            const statusBadge = document.getElementById('paymentStatus');
            if (config.configured) {
                statusBadge.textContent = '已配置';
                statusBadge.classList.add('configured');
            } else {
                statusBadge.textContent = '未配置';
                statusBadge.classList.remove('configured');
            }
        }
    } catch (error) {
        console.error('加载支付配置失败:', error);
        showToast('错误', '加载配置失败', 'error');
    }
}

async function savePaymentConfig() {
    const epayUrl = document.getElementById('epayUrl').value.trim();
    const epayPid = document.getElementById('epayPid').value.trim();
    const epayKey = document.getElementById('epayKey').value.trim();
    const epayNotifyUrl = document.getElementById('epayNotifyUrl').value.trim();
    const epayReturnUrl = document.getElementById('epayReturnUrl').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    // 如果所有字段都为空，则清空配置
    
    try {
        const response = await fetch('/api/admin/payment-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                epay_url: epayUrl,
                epay_pid: epayPid,
                epay_key: epayKey,
                epay_notify_url: epayNotifyUrl,
                epay_return_url: epayReturnUrl
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '易支付配置已保存', 'success');
            // 刷新配置显示
            loadPaymentConfig();
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function testPaymentConfig() {
    const epayUrl = document.getElementById('epayUrl').value.trim();
    const epayPid = document.getElementById('epayPid').value.trim();
    
    if (!epayUrl || !epayPid) {
        showToast('提示', '请先填写易支付接口地址和商户ID', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试易支付连接...', 'info');
    
    try {
        // 检查当前配置状态
        const response = await fetch('/api/admin/payment-config');
        const data = await response.json();
        
        if (data.success && data.config.configured) {
            showToast('成功', '易支付已配置，配置有效', 'success');
        } else {
            showToast('警告', '配置尚未保存，请先保存配置', 'warning');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

// ==================== 系统设置 - 下载配置 (MoviePilot & qBittorrent) ====================
async function loadDownloadConfig() {
    try {
        const response = await fetch('/api/admin/download-config');
        const data = await response.json();
        
        if (data.success && data.config) {
            const config = data.config;
            
            // 填充 MoviePilot 表单
            document.getElementById('mpUrl').value = config.moviepilot.url || '';
            document.getElementById('mpUsername').value = config.moviepilot.username || '';
            document.getElementById('mpPassword').value = config.moviepilot.password || '';
            document.getElementById('mpToken').value = config.moviepilot.token || '';
            
            // 更新 MoviePilot 状态徽章
            const mpStatusBadge = document.getElementById('mpStatus');
            if (config.moviepilot.enabled) {
                mpStatusBadge.textContent = '已配置';
                mpStatusBadge.classList.add('configured');
            } else {
                mpStatusBadge.textContent = '未配置';
                mpStatusBadge.classList.remove('configured');
            }
            
            // 填充 qBittorrent 表单
            document.getElementById('qbUrl').value = config.qbittorrent.url || '';
            document.getElementById('qbUsername').value = config.qbittorrent.username || '';
            document.getElementById('qbPassword').value = config.qbittorrent.password || '';
            document.getElementById('qbCategory').value = config.qbittorrent.category || 'emby-request';
            document.getElementById('qbSavePath').value = config.qbittorrent.save_path || '';
            
            // 更新 qBittorrent 状态徽章
            const qbStatusBadge = document.getElementById('qbStatus');
            if (config.qbittorrent.enabled) {
                qbStatusBadge.textContent = '已配置';
                qbStatusBadge.classList.add('configured');
            } else {
                qbStatusBadge.textContent = '未配置';
                qbStatusBadge.classList.remove('configured');
            }
        }
    } catch (error) {
        console.error('加载下载配置失败:', error);
        showToast('错误', '加载下载配置失败', 'error');
    }
}

async function saveMoviePilotConfig() {
    const mpUrl = document.getElementById('mpUrl').value.trim();
    const mpUsername = document.getElementById('mpUsername').value.trim();
    const mpPassword = document.getElementById('mpPassword').value.trim();
    const mpToken = document.getElementById('mpToken').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    
    try {
        const response = await fetch('/api/admin/download-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                moviepilot: {
                    url: mpUrl,
                    username: mpUsername,
                    password: mpPassword,
                    token: mpToken
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', 'MoviePilot 配置已保存', 'success');
            loadDownloadConfig();
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function testMoviePilotConfig() {
    const mpUrl = document.getElementById('mpUrl').value.trim();
    const mpUsername = document.getElementById('mpUsername').value.trim();
    const mpPassword = document.getElementById('mpPassword').value.trim();
    const mpToken = document.getElementById('mpToken').value.trim();
    
    if (!mpUrl) {
        showToast('提示', '请先填写 MoviePilot 地址', 'warning');
        return;
    }
    
    if (!mpToken && (!mpUsername || !mpPassword)) {
        showToast('提示', '请填写用户名密码或 Token', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试 MoviePilot 连接...', 'info');
    
    try {
        const response = await fetch('/api/admin/test-moviepilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: mpUrl,
                username: mpUsername,
                password: mpPassword,
                token: mpToken
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
        } else {
            showToast('失败', data.error || '测试失败', 'error');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

async function saveQbittorrentConfig() {
    const qbUrl = document.getElementById('qbUrl').value.trim();
    const qbUsername = document.getElementById('qbUsername').value.trim();
    const qbPassword = document.getElementById('qbPassword').value.trim();
    const qbCategory = document.getElementById('qbCategory').value.trim() || 'emby-request';
    const qbSavePath = document.getElementById('qbSavePath').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    
    try {
        const response = await fetch('/api/admin/download-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qbittorrent: {
                    url: qbUrl,
                    username: qbUsername,
                    password: qbPassword,
                    category: qbCategory,
                    save_path: qbSavePath
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', 'qBittorrent 配置已保存', 'success');
            loadDownloadConfig();
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function testQbittorrentConfig() {
    const qbUrl = document.getElementById('qbUrl').value.trim();
    const qbUsername = document.getElementById('qbUsername').value.trim();
    const qbPassword = document.getElementById('qbPassword').value.trim();
    
    if (!qbUrl) {
        showToast('提示', '请先填写 qBittorrent 地址', 'warning');
        return;
    }
    
    if (!qbUsername || !qbPassword) {
        showToast('提示', '请填写用户名和密码', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试 qBittorrent 连接...', 'info');
    
    try {
        const response = await fetch('/api/admin/test-qbittorrent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: qbUrl,
                username: qbUsername,
                password: qbPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
        } else {
            showToast('失败', data.error || '测试失败', 'error');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

// ==================== 系统设置 - 系统配置 (Emby、Telegram等) ====================
async function loadSystemConfig() {
    try {
        const response = await fetch('/api/admin/system-config');
        const data = await response.json();
        
        if (data.success && data.config) {
            const config = data.config;
            
            // 填充 Emby 配置
            document.getElementById('embyUrl').value = config.emby.url || '';
            document.getElementById('embyApiKey').value = config.emby.api_key || '';
            document.getElementById('embyWebhookSecret').value = config.emby.webhook_secret || '';
            
            // 更新 Emby 状态徽章
            const embyStatusBadge = document.getElementById('embyStatus');
            if (config.emby.configured) {
                embyStatusBadge.textContent = '已配置';
                embyStatusBadge.classList.add('configured');
            } else {
                embyStatusBadge.textContent = '未配置';
                embyStatusBadge.classList.remove('configured');
            }
            
            // 填充 Telegram 配置
            document.getElementById('tgBotToken').value = config.telegram.bot_token || '';
            document.getElementById('tgChatId').value = config.telegram.chat_id || '';
            document.getElementById('tgGroupId').value = config.telegram.group_id || '';
            document.getElementById('tgGiftDays').value = config.telegram.gift_days || 30;
            document.getElementById('tgBotAdmins').value = config.telegram.bot_admins || '';
            document.getElementById('tgBotPhoto').value = config.telegram.bot_photo || '';
            
            // 填充 Telegram 通知模板配置
            if (config.telegram.templates) {
                document.getElementById('tgRequestTemplate').value = config.telegram.templates.request || '';
                document.getElementById('tgCompletionTemplate').value = config.telegram.templates.completion || '';
            }
            
            // 填充求片通知配置（入库通知 - 求片Tab）
            if (config.telegram.request_notification) {
                const notifConfig = config.telegram.request_notification;
                const sendTo = notifConfig.send_to || 'group';
                const sendToRadio = document.querySelector(`input[name="requestSendTo"][value="${sendTo}"]`);
                if (sendToRadio) sendToRadio.checked = true;
                
                // 注意：已移除 requestMentionAdmin，因为求片入库通知不需要@管理员
                const showOverview = document.getElementById('requestShowOverview');
                const showPoster = document.getElementById('requestShowPoster');
                if (showOverview) showOverview.checked = notifConfig.show_overview !== false;
                if (showPoster) showPoster.checked = notifConfig.show_poster !== false;
                
                // 兼容旧版 custom_message 字段
                const customMessage = document.getElementById('requestCustomMessage');
                if (customMessage) customMessage.value = notifConfig.custom_message || '';
            }
            
            // 填充通用入库通知配置
            const enabledCheckbox = document.getElementById('generalLibraryEnabled');
            const chatIdInput = document.getElementById('generalLibraryChatId');
            const botTokenInput = document.getElementById('generalLibraryBotToken');
            const showPosterCheckbox = document.getElementById('generalShowPoster');
            
            if (config.telegram.library_notification) {
                const libConfig = config.telegram.library_notification;
                console.log('[入库通知] 加载配置:', libConfig);
                
                if (enabledCheckbox) {
                    enabledCheckbox.checked = libConfig.enabled === true;
                    console.log('[入库通知] 设置 enabled 为:', libConfig.enabled);
                }
                if (chatIdInput) chatIdInput.value = libConfig.chat_id || '';
                if (botTokenInput) botTokenInput.value = libConfig.bot_token || '';
                if (showPosterCheckbox) showPosterCheckbox.checked = libConfig.show_poster !== false;
            } else {
                // 完全没有配置时，设置默认值
                if (enabledCheckbox) enabledCheckbox.checked = false;
                if (chatIdInput) chatIdInput.value = '';
                if (botTokenInput) botTokenInput.value = '';
                if (showPosterCheckbox) showPosterCheckbox.checked = true;
            }
            
            // 更新 Telegram 状态徽章
            const tgStatusBadge = document.getElementById('telegramStatus');
            if (config.telegram.configured) {
                tgStatusBadge.textContent = '已配置';
                tgStatusBadge.classList.add('configured');
            } else {
                tgStatusBadge.textContent = '未配置';
                tgStatusBadge.classList.remove('configured');
            }
            
            // 检查 Telegram 模式
            checkTelegramMode();
            
            // 填充搜索配置
            document.getElementById('searchStrategy').value = config.search.strategy || 'all';
            document.getElementById('pollInterval').value = config.search.poll_interval || 10;
            
            // 填充 TMDB 配置
            document.getElementById('tmdbApiKey').value = config.tmdb.api_key || '';
            
            // 更新 TMDB 状态徽章
            const tmdbStatusBadge = document.getElementById('tmdbStatus');
            if (config.tmdb.configured) {
                tmdbStatusBadge.textContent = '已配置';
                tmdbStatusBadge.classList.add('configured');
            } else {
                tmdbStatusBadge.textContent = '未配置';
                tmdbStatusBadge.classList.remove('configured');
            }
            
            // 填充求片限制配置
            document.getElementById('limitLevelA').value = config.request_limit.level_a || 3;
            document.getElementById('limitLevelB').value = config.request_limit.level_b || 1;
            document.getElementById('limitLevelC').value = config.request_limit.level_c || 0;
            document.getElementById('limitLevelD').value = config.request_limit.level_d || 0;
            
            // 填充订阅过期配置
            const expireAutoDisable = document.getElementById('expireAutoDisable');
            const expireDeleteDays = document.getElementById('expireDeleteDays');
            const expireDeleteWebAccount = document.getElementById('expireDeleteWebAccount');
            
            if (config.subscription_expire) {
                if (expireAutoDisable) expireAutoDisable.checked = config.subscription_expire.auto_disable !== false;
                if (expireDeleteDays) expireDeleteDays.value = config.subscription_expire.delete_days || 0;
                if (expireDeleteWebAccount) expireDeleteWebAccount.checked = config.subscription_expire.delete_web_account === true;
                console.log('[订阅过期] 加载配置:', config.subscription_expire);
            } else {
                // 设置默认值
                if (expireAutoDisable) expireAutoDisable.checked = true;
                if (expireDeleteDays) expireDeleteDays.value = 0;
                if (expireDeleteWebAccount) expireDeleteWebAccount.checked = false;
                console.log('[订阅过期] 使用默认配置');
            }
        }
    } catch (error) {
        console.error('加载系统配置失败:', error);
        showToast('错误', '加载系统配置失败', 'error');
    }
}

// Emby 配置
async function saveEmbyConfig() {
    const embyUrl = document.getElementById('embyUrl').value.trim();
    const embyApiKey = document.getElementById('embyApiKey').value.trim();
    const embyWebhookSecret = document.getElementById('embyWebhookSecret').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emby: {
                    url: embyUrl,
                    api_key: embyApiKey,
                    webhook_secret: embyWebhookSecret
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', 'Emby 配置已保存', 'success');
            setTimeout(() => loadSystemConfig(), 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// 订阅过期配置
async function saveSubscriptionExpireConfig() {
    const autoDisable = document.getElementById('expireAutoDisable').checked;
    const deleteDays = parseInt(document.getElementById('expireDeleteDays').value) || 0;
    const deleteWebAccount = document.getElementById('expireDeleteWebAccount').checked;
    
    console.log('[订阅过期] 准备保存配置:', { autoDisable, deleteDays, deleteWebAccount });
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription_expire: {
                    auto_disable: autoDisable,
                    delete_days: deleteDays,
                    delete_web_account: deleteWebAccount
                }
            })
        });
        
        const data = await response.json();
        console.log('[订阅过期] 服务器响应:', data);
        
        if (data.success) {
            showToast('成功', '订阅过期配置已保存', 'success');
            setTimeout(() => {
                loadSystemConfig();
            }, 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

function loadSubscriptionExpireConfig() {
    loadSystemConfig();
    showToast('成功', '已重新加载配置', 'success');
}

async function testEmbyConfig() {
    const embyUrl = document.getElementById('embyUrl').value.trim();
    const embyApiKey = document.getElementById('embyApiKey').value.trim();
    
    if (!embyUrl || !embyApiKey) {
        showToast('提示', '请先填写 Emby 地址和 API Key', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试 Emby 连接...', 'info');
    
    try {
        const response = await fetch('/api/admin/test-emby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: embyUrl,
                api_key: embyApiKey
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
        } else {
            showToast('失败', data.error || '测试失败', 'error');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

// Telegram 配置
async function saveTelegramConfig() {
    const tgBotToken = document.getElementById('tgBotToken').value.trim();
    const tgChatId = document.getElementById('tgChatId').value.trim();
    const tgGroupId = document.getElementById('tgGroupId').value.trim();
    const tgGiftDays = parseInt(document.getElementById('tgGiftDays').value) || 30;
    const tgBotAdmins = document.getElementById('tgBotAdmins').value.trim();
    const tgBotPhoto = document.getElementById('tgBotPhoto').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram: {
                    bot_token: tgBotToken,
                    chat_id: tgChatId,
                    group_id: tgGroupId,
                    gift_days: tgGiftDays,
                    bot_admins: tgBotAdmins,
                    bot_photo: tgBotPhoto
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', 'Telegram 配置已保存', 'success');
            setTimeout(() => loadSystemConfig(), 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function testTelegramConfig() {
    const tgBotToken = document.getElementById('tgBotToken').value.trim();
    const tgChatId = document.getElementById('tgChatId').value.trim();
    
    if (!tgBotToken) {
        showToast('提示', '请先填写 Bot Token', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试 Telegram 连接...', 'info');
    
    try {
        const response = await fetch('/api/admin/test-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bot_token: tgBotToken,
                chat_id: tgChatId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
            
            // 成功后检查 Telegram 模式状态
            await checkTelegramMode();
            
            // 检查 Webhook 状态
            checkWebhookStatus(tgBotToken);
        } else {
            showToast('失败', data.error || '测试失败', 'error');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

// 注册 Telegram 命令菜单
async function registerTelegramCommands() {
    const tgBotToken = document.getElementById('tgBotToken').value.trim();
    
    if (!tgBotToken) {
        showToast('提示', '请先填写 Bot Token', 'warning');
        return;
    }
    
    showToast('注册中', '正在注册命令菜单...', 'info');
    
    try {
        const response = await fetch('/api/admin/register-telegram-commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bot_token: tgBotToken
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            let message = data.message || '命令菜单注册成功';
            if (data.commands && data.commands.length > 0) {
                message += '\n\n已注册命令：\n' + data.commands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');
            }
            showToast('成功', message, 'success');
        } else {
            showToast('失败', data.error || '注册失败', 'error');
        }
    } catch (error) {
        showToast('错误', '注册失败: ' + error.message, 'error');
    }
}

// 检查 Webhook 状态
async function checkWebhookStatus(botToken) {
    try {
        // 检查是否已设置 Webhook
        const modeResponse = await fetch('/api/webhook/telegram/mode');
        const modeData = await modeResponse.json();
        
        // 如果从未设置过 Webhook，提示设置
        if (modeData.success && (!modeData.configured_url || modeData.configured_url === '')) {
            const shouldSetup = await showConfirm({
                title: '⚠️ 未设置 Webhook',
                message: 'Bot 命令功能需要设置 Webhook 才能使用。\n\n请点击"设置 Webhook"按钮进行配置。',
                confirmText: '立即设置',
                cancelText: '稍后设置',
                type: 'warning'
            });
            
            if (shouldSetup) {
                setTelegramWebhook();
            }
            return;
        }
        
        // 检查 Webhook 是否已设置
        const response = await fetch('/api/webhook/telegram/setup');
        const data = await response.json();
        
        if (data.success && data.webhook_info) {
            const info = data.webhook_info;
            
            if (!info.url || info.url === '') {
                // Webhook 未设置
                const shouldSetup = await showConfirm({
                    title: '⚠️ Webhook 未设置',
                    message: 'Bot 命令功能需要设置 Webhook 才能使用。\n\n当前状态：未设置 Webhook\n\n是否现在设置 Webhook？',
                    confirmText: '立即设置',
                    cancelText: '稍后设置',
                    type: 'warning'
                });
                
                if (shouldSetup) {
                    setTelegramWebhook();
                }
            } else {
                // Webhook 已设置，显示详情
                showToast('提示', `Webhook 已设置到: ${info.url}\n等待更新数: ${info.pending_update_count || 0}`, 'info');
            }
        }
    } catch (error) {
        console.error('检查 Webhook 状态失败:', error);
    }
}


// 设置 Telegram Webhook
async function setTelegramWebhook() {
    // 获取当前配置的地址（如果有）
    let currentConfiguredUrl = window.location.origin;
    let currentModeInfo = '';
    
    try {
        const modeResp = await fetch('/api/webhook/telegram/mode');
        const modeData = await modeResp.json();
        
        if (modeData.success && modeData.configured_url) {
            currentConfiguredUrl = modeData.configured_url;
            currentModeInfo = '\n\n📍 当前配置：' + modeData.configured_url;
        }
    } catch (e) {
        console.error('获取当前配置失败:', e);
    }
    
    const baseUrl = await showPrompt({
        title: '设置 Telegram Bot Webhook',
        message: '请输入您的服务器 HTTPS 地址：\n\n' +
                 '📡 Webhook 模式需要 HTTPS 域名\n' +
                 '   例如：https://example.com\n\n' +
                 '⚠️ 注意：必须使用 HTTPS 协议' +
                 currentModeInfo,
        placeholder: currentConfiguredUrl,
        defaultValue: currentConfiguredUrl,
        confirmText: '确认设置',
        cancelText: '取消'
    });
    
    if (!baseUrl) {
        return; // 用户取消
    }
    
    // 验证 URL 格式
    if (!baseUrl.startsWith('https://')) {
        showToast('错误', 'Webhook 需要 HTTPS 域名，请使用 https:// 开头的地址', 'error');
        return;
    }
    
    showToast('设置中', '正在配置 Telegram Bot Webhook...', 'info');
    
    try {
        const response = await fetch('/api/webhook/telegram/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: baseUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', `✅ Webhook 设置成功\n\n${data.webhook_url}\n\n💡 ${data.tip}`, 'success', 6000);
            
            // 刷新状态显示
            await checkTelegramMode();
        } else {
            // 显示详细错误信息
            let errorMsg = data.error || '设置失败';
            if (data.tip) {
                errorMsg += '\n\n提示: ' + data.tip;
            }
            showToast('失败', errorMsg, 'error', 8000);
        }
    } catch (error) {
        showToast('错误', '设置失败: ' + error.message, 'error');
    }
}

// 检查 Telegram Webhook 状态
async function checkTelegramMode() {
    try {
        const response = await fetch('/api/webhook/telegram/mode');
        const data = await response.json();
        
        if (data.success) {
            const modeDisplay = document.getElementById('telegramModeDisplay');
            if (!modeDisplay) return;
            
            // 检查是否从未设置过 Webhook（configured_url 为空表示从未设置）
            const neverConfigured = !data.configured_url || data.configured_url === '';
            
            if (neverConfigured) {
                // 从未设置过 Webhook
                modeDisplay.innerHTML = `⚠️ 未配置 Webhook`;
                modeDisplay.className = 'badge badge-warning';
                return;
            }
            
            // 检查 Webhook 是否已设置
            try {
                const webhookResponse = await fetch('/api/webhook/telegram/setup');
                const webhookData = await webhookResponse.json();
                
                if (webhookData.success && webhookData.webhook_info) {
                    const hasWebhook = webhookData.webhook_info.url && webhookData.webhook_info.url !== '';
                    const statusText = hasWebhook ? '运行中' : '未设置';
                    const badgeClass = hasWebhook ? 'badge badge-success' : 'badge badge-warning';
                    modeDisplay.innerHTML = `📡 Webhook - ${statusText}`;
                    modeDisplay.className = badgeClass;
                } else {
                    modeDisplay.innerHTML = `📡 Webhook - 未设置`;
                    modeDisplay.className = 'badge badge-warning';
                }
            } catch (error) {
                console.error('获取 Webhook 状态失败:', error);
                modeDisplay.innerHTML = `📡 Webhook`;
                modeDisplay.className = 'badge badge-secondary';
            }
        }
    } catch (error) {
        console.error('获取 Telegram 状态失败:', error);
    }
}

// Telegram 通知模板配置
async function saveTelegramTemplates() {
    const requestTemplate = document.getElementById('tgRequestTemplate').value;
    const completionTemplate = document.getElementById('tgCompletionTemplate').value;
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram: {
                    templates: {
                        request: requestTemplate,
                        completion: completionTemplate
                    }
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '通知模板已保存', 'success');
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存模板失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function resetTelegramTemplates() {
    const confirmed = await showConfirm({
        title: '恢复默认模板',
        message: '确定要恢复默认模板吗？这将清空您自定义的模板内容。',
        confirmText: '确定恢复',
        cancelText: '取消',
        type: 'warning'
    });
    if (!confirmed) return;
    
    document.getElementById('tgRequestTemplate').value = '';
    document.getElementById('tgCompletionTemplate').value = '';
    
    // 自动保存
    saveTelegramTemplates();
}

// ==================== 入库通知配置 ====================
// Tab 切换
function switchNotificationTab(tabName) {
    // 切换按钮状态
    const buttons = document.querySelectorAll('.notification-tabs .tab-button');
    buttons.forEach(btn => {
        if (btn.onclick.toString().includes(tabName)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 切换内容显示
    document.getElementById('requestNotificationTab').style.display = tabName === 'request' ? 'block' : 'none';
    document.getElementById('generalNotificationTab').style.display = tabName === 'general' ? 'block' : 'none';
}

// 保存入库通知配置（包含求片通知和通用入库通知）
async function saveLibraryNotificationConfig() {
    // 求片通知配置
    const requestSendTo = document.querySelector('input[name="requestSendTo"]:checked').value;
    const requestShowOverview = document.getElementById('requestShowOverview').checked;
    const requestShowPoster = document.getElementById('requestShowPoster').checked;
    
    // 通用入库通知配置
    const generalEnabled = document.getElementById('generalLibraryEnabled').checked;
    const generalChatId = document.getElementById('generalLibraryChatId').value.trim();
    const generalBotToken = document.getElementById('generalLibraryBotToken').value.trim();
    const generalShowPoster = document.getElementById('generalShowPoster').checked;
    
    console.log('[入库通知] 准备保存配置:', {
        requestSendTo,
        requestShowOverview,
        requestShowPoster,
        generalEnabled,
        generalChatId,
        generalBotToken: generalBotToken ? '***已设置***' : '空',
        generalShowPoster
    });
    
    try {
        const requestBody = {
            telegram: {
                request_notification: {
                    enabled: true,
                    send_to: requestSendTo,
                    show_overview: requestShowOverview,
                    show_poster: requestShowPoster
                },
                library_notification: {
                    enabled: generalEnabled,
                    chat_id: generalChatId,
                    bot_token: generalBotToken,
                    show_poster: generalShowPoster
                }
            }
        };
        
        console.log('[入库通知] 发送请求:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        console.log('[入库通知] 服务器响应:', data);
        
        if (data.success) {
            showToast('成功', '入库通知配置已保存', 'success');
            // 延迟一下再重新加载配置，确保服务器已保存
            setTimeout(() => {
                loadSystemConfig();
            }, 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存入库通知配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// 兼容旧函数名
async function saveRequestNotificationConfig() {
    return saveLibraryNotificationConfig();
}

// 搜索配置
async function saveSearchConfig() {
    const searchStrategy = document.getElementById('searchStrategy').value;
    const pollInterval = parseInt(document.getElementById('pollInterval').value) || 10;
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                search: {
                    strategy: searchStrategy,
                    poll_interval: pollInterval
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '搜索配置已保存', 'success');
            setTimeout(() => loadSystemConfig(), 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// TMDB 配置
async function saveTmdbConfig() {
    const tmdbApiKey = document.getElementById('tmdbApiKey').value.trim();
    
    // 允许保存空白配置（空白表示未配置该功能）
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tmdb: {
                    api_key: tmdbApiKey
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', 'TMDB 配置已保存', 'success');
            setTimeout(() => loadSystemConfig(), 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function testTmdbConfig() {
    const tmdbApiKey = document.getElementById('tmdbApiKey').value.trim();
    
    if (!tmdbApiKey) {
        showToast('提示', '请先填写 TMDB API Key', 'warning');
        return;
    }
    
    showToast('测试中', '正在测试 TMDB API...', 'info');
    
    try {
        // 直接调用 TMDB API 测试
        const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbApiKey}`);
        
        if (response.ok) {
            showToast('成功', 'TMDB API Key 有效！', 'success');
        } else if (response.status === 401) {
            showToast('失败', 'API Key 无效或已过期', 'error');
        } else {
            showToast('失败', `测试失败 (状态码: ${response.status})`, 'error');
        }
    } catch (error) {
        showToast('错误', '测试失败: ' + error.message, 'error');
    }
}

// ==================== 二级分类策略配置 ====================
let categoryConfig = { movie: {}, tv: {} };
let categoryDictionaries = {};

async function loadCategoryConfig() {
    try {
        const response = await fetch('/api/admin/category-config');
        const data = await response.json();
        
        if (data.success) {
            categoryConfig = data.category;
            categoryDictionaries = data.dictionaries;
            renderCategoryList('movie');
            renderCategoryList('tv');
        }
    } catch (error) {
        console.error('加载分类配置失败:', error);
    }
}

function renderCategoryList(mediaType) {
    const container = document.getElementById(mediaType === 'movie' ? 'movieCategoryList' : 'tvCategoryList');
    if (!container) return;
    
    const categories = categoryConfig[mediaType] || {};
    const categoryNames = Object.keys(categories);
    
    container.innerHTML = '';
    
    categoryNames.forEach((name, index) => {
        const conditions = categories[name] || {};
        const isDefault = Object.keys(conditions).length === 0;
        
        const item = document.createElement('div');
        item.className = `category-item${isDefault ? ' default-category' : ''}`;
        item.draggable = true;
        item.dataset.name = name;
        item.dataset.index = index;
        
        // 拖拽事件
        item.addEventListener('dragstart', (e) => handleDragStart(e, mediaType));
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', (e) => handleDrop(e, mediaType));
        item.addEventListener('dragend', handleDragEnd);
        
        item.innerHTML = `
            <div class="category-item-header">
                <span class="drag-handle">☰</span>
                <input type="text" value="${name}" onchange="updateCategoryName('${mediaType}', '${name}', this.value)" placeholder="分类名称">
                <button class="btn-delete" onclick="deleteCategory('${mediaType}', '${name}')" title="删除">🗑️</button>
            </div>
            <div class="category-conditions">
                ${mediaType === 'movie' ? `
                    <div class="condition-row">
                        <label>内容类型:</label>
                        <input type="text" value="${(conditions.genre_ids || []).join(',')}" 
                               onchange="updateCondition('${mediaType}', '${name}', 'genre_ids', this.value)"
                               placeholder="如: 16 (动画)">
                        <span class="hint">多个用逗号分隔</span>
                    </div>
                    <div class="condition-row">
                        <label>原始语言:</label>
                        <input type="text" value="${(conditions.original_language || []).join(',')}" 
                               onchange="updateCondition('${mediaType}', '${name}', 'original_language', this.value)"
                               placeholder="如: zh,cn (中文)">
                        <span class="hint">多个用逗号分隔</span>
                    </div>
                ` : `
                    <div class="condition-row">
                        <label>内容类型:</label>
                        <input type="text" value="${(conditions.genre_ids || []).join(',')}" 
                               onchange="updateCondition('${mediaType}', '${name}', 'genre_ids', this.value)"
                               placeholder="如: 16 (动画), 99 (纪录片)">
                        <span class="hint">多个用逗号分隔</span>
                    </div>
                    <div class="condition-row">
                        <label>制作国家:</label>
                        <input type="text" value="${(conditions.origin_country || []).join(',')}" 
                               onchange="updateCondition('${mediaType}', '${name}', 'origin_country', this.value)"
                               placeholder="如: CN,TW,HK (中国)">
                        <span class="hint">多个用逗号分隔</span>
                    </div>
                `}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateCategoryName(mediaType, oldName, newName) {
    if (!newName.trim() || oldName === newName) return;
    
    const categories = categoryConfig[mediaType];
    const keys = Object.keys(categories);
    const newCategories = {};
    
    keys.forEach(key => {
        if (key === oldName) {
            newCategories[newName.trim()] = categories[key];
        } else {
            newCategories[key] = categories[key];
        }
    });
    
    categoryConfig[mediaType] = newCategories;
    renderCategoryList(mediaType);
}

function updateCondition(mediaType, categoryName, conditionType, value) {
    if (!categoryConfig[mediaType][categoryName]) {
        categoryConfig[mediaType][categoryName] = {};
    }
    
    if (!value.trim()) {
        delete categoryConfig[mediaType][categoryName][conditionType];
    } else {
        const values = value.split(',').map(v => v.trim()).filter(v => v);
        
        if (conditionType === 'genre_ids') {
            // genre_ids 需要转换为数字
            categoryConfig[mediaType][categoryName][conditionType] = values.map(v => parseInt(v)).filter(v => !isNaN(v));
        } else {
            categoryConfig[mediaType][categoryName][conditionType] = values;
        }
    }
}

function addCategory(mediaType) {
    const categories = categoryConfig[mediaType];
    let newName = '新分类';
    let counter = 1;
    
    while (categories[newName]) {
        newName = `新分类${counter++}`;
    }
    
    // 在倒数第二个位置插入（保持最后一个为默认分类）
    const keys = Object.keys(categories);
    const newCategories = {};
    
    if (keys.length === 0) {
        newCategories[newName] = {};
    } else {
        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                // 在最后一个（默认分类）之前插入新分类
                newCategories[newName] = { genre_ids: [] };
            }
            newCategories[key] = categories[key];
        });
        
        // 如果只有一个分类，直接添加到末尾
        if (!newCategories[newName]) {
            newCategories[newName] = { genre_ids: [] };
        }
    }
    
    categoryConfig[mediaType] = newCategories;
    renderCategoryList(mediaType);
}

async function deleteCategory(mediaType, categoryName) {
    const confirmed = await showConfirm({
        title: '删除分类',
        message: `确定要删除分类"${categoryName}"吗？`,
        confirmText: '确定删除',
        cancelText: '取消',
        type: 'danger'
    });
    if (!confirmed) return;
    
    delete categoryConfig[mediaType][categoryName];
    renderCategoryList(mediaType);
}

// 拖拽排序相关函数
let draggedItem = null;

function handleDragStart(e, mediaType) {
    draggedItem = e.target.closest('.category-item');
    draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.name);
    e.dataTransfer.setData('mediaType', mediaType);
}

function handleDragOver(e) {
    e.preventDefault();
    const item = e.target.closest('.category-item');
    if (item && item !== draggedItem) {
        item.classList.add('drag-over');
    }
}

function handleDrop(e, mediaType) {
    e.preventDefault();
    const targetItem = e.target.closest('.category-item');
    if (!targetItem || targetItem === draggedItem) return;
    
    const draggedName = draggedItem.dataset.name;
    const targetName = targetItem.dataset.name;
    
    // 重新排序
    const categories = categoryConfig[mediaType];
    const keys = Object.keys(categories);
    const draggedIndex = keys.indexOf(draggedName);
    const targetIndex = keys.indexOf(targetName);
    
    // 移动位置
    keys.splice(draggedIndex, 1);
    keys.splice(targetIndex, 0, draggedName);
    
    // 重建对象
    const newCategories = {};
    keys.forEach(key => {
        newCategories[key] = categories[key];
    });
    
    categoryConfig[mediaType] = newCategories;
    renderCategoryList(mediaType);
}

function handleDragEnd(e) {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedItem = null;
}

async function saveCategoryConfig() {
    try {
        const response = await fetch('/api/admin/category-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: categoryConfig })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '分类策略已保存', 'success');
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存分类配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

async function resetCategoryConfig() {
    const confirmed = await showConfirm({
        title: '恢复默认分类',
        message: '确定要恢复默认分类策略吗？这将覆盖当前的所有分类配置。',
        confirmText: '确定恢复',
        cancelText: '取消',
        type: 'warning'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch('/api/admin/category-config/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '已恢复默认分类策略', 'success');
            loadCategoryConfig();
        } else {
            showToast('失败', data.error || '重置失败', 'error');
        }
    } catch (error) {
        console.error('重置分类配置失败:', error);
        showToast('错误', '重置失败: ' + error.message, 'error');
    }
}

// 求片限制配置
async function saveRequestLimitConfig() {
    const levelA = parseInt(document.getElementById('limitLevelA').value) || 3;
    const levelB = parseInt(document.getElementById('limitLevelB').value) || 1;
    const levelC = parseInt(document.getElementById('limitLevelC').value) || 0;
    const levelD = parseInt(document.getElementById('limitLevelD').value) || 0;
    
    try {
        const response = await fetch('/api/admin/system-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request_limit: {
                    max_daily: levelA,  // 用 A 级作为 max_daily 的值
                    level_a: levelA,
                    level_b: levelB,
                    level_c: levelC,
                    level_d: levelD
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '求片限制配置已保存', 'success');
            setTimeout(() => loadSystemConfig(), 500);
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// ==================== 系统设置 - 前端配置 ====================
let customLinksData = [];

async function loadSiteConfig() {
    try {
        const response = await fetch('/api/admin/site-config');
        const data = await response.json();
        
        if (data.success && data.config) {
            const config = data.config;
            
            // 填充表单
            document.getElementById('siteName').value = config.site_name || '';
            document.getElementById('siteSubtitle').value = config.site_subtitle || '';
            document.getElementById('siteTitle').value = config.site_title || '';
            document.getElementById('siteLogo').value = config.site_logo || '';
            document.getElementById('shopUrl').value = config.shop_url || '';
            document.getElementById('panelUrl').value = config.panel_url || '';
            document.getElementById('telegramGroup').value = config.telegram_group || '';
            document.getElementById('supportEmail').value = config.support_email || '';
            document.getElementById('registerMode').value = config.register_mode || 'open';
            document.getElementById('welcomeMessage').value = config.welcome_message || '';
            document.getElementById('customCss').value = config.custom_css || '';
            
            // 图片代理开关
            const useImageProxyEl = document.getElementById('useImageProxy');
            if (useImageProxyEl) {
                useImageProxyEl.checked = config.use_image_proxy !== false; // 默认开启
            }
            
            // 加载自定义链接
            customLinksData = config.custom_links || [];
            renderCustomLinks();
            
            // 更新状态徽章
            const statusBadge = document.getElementById('siteConfigStatus');
            if (config.site_name) {
                statusBadge.textContent = '已配置';
                statusBadge.classList.add('configured');
            }
        }
    } catch (error) {
        console.error('加载前端配置失败:', error);
        showToast('错误', '加载配置失败', 'error');
    }
}

// 渲染自定义链接配置
function renderCustomLinks() {
    const container = document.getElementById('customLinksContainer');
    if (!container) return;
    
    if (customLinksData.length === 0) {
        container.innerHTML = '<div class="empty-hint">暂无自定义链接</div>';
        return;
    }
    
    container.innerHTML = customLinksData.map((link, index) => `
        <div class="custom-link-item" data-index="${index}">
            <div class="link-fields">
                <input type="text" placeholder="图标(emoji)" value="${link.icon || ''}" 
                       onchange="updateCustomLink(${index}, 'icon', this.value)" style="width: 60px;">
                <input type="text" placeholder="名称" value="${link.name || ''}" 
                       onchange="updateCustomLink(${index}, 'name', this.value)" style="width: 100px;">
                <input type="text" placeholder="链接URL" value="${link.url || ''}" 
                       onchange="updateCustomLink(${index}, 'url', this.value)" style="flex: 1;">
                <label class="link-enabled">
                    <input type="checkbox" ${link.enabled ? 'checked' : ''} 
                           onchange="updateCustomLink(${index}, 'enabled', this.checked)">
                    启用
                </label>
                <button type="button" class="btn-danger btn-sm" onclick="removeCustomLink(${index})">删除</button>
            </div>
        </div>
    `).join('');
}

// 添加自定义链接
function addCustomLink() {
    customLinksData.push({ name: '', url: '', icon: '🔗', enabled: true });
    renderCustomLinks();
}

// 更新自定义链接
function updateCustomLink(index, field, value) {
    if (customLinksData[index]) {
        customLinksData[index][field] = value;
    }
}

// 删除自定义链接
function removeCustomLink(index) {
    customLinksData.splice(index, 1);
    renderCustomLinks();
}

async function saveSiteConfig() {
    const siteName = document.getElementById('siteName').value.trim();
    const siteSubtitle = document.getElementById('siteSubtitle').value.trim();
    const siteTitle = document.getElementById('siteTitle').value.trim();
    const siteLogo = document.getElementById('siteLogo').value.trim();
    const shopUrl = document.getElementById('shopUrl').value.trim();
    const panelUrl = document.getElementById('panelUrl').value.trim();
    const telegramGroup = document.getElementById('telegramGroup').value.trim();
    const supportEmail = document.getElementById('supportEmail').value.trim();
    const registerMode = document.getElementById('registerMode').value;
    const welcomeMessage = document.getElementById('welcomeMessage').value.trim();
    const customCss = document.getElementById('customCss').value.trim();
    const useImageProxy = document.getElementById('useImageProxy')?.checked ?? true;
    
    try {
        const response = await fetch('/api/admin/site-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_name: siteName,
                site_subtitle: siteSubtitle,
                site_title: siteTitle,
                site_logo: siteLogo,
                shop_url: shopUrl,
                panel_url: panelUrl,
                telegram_group: telegramGroup,
                support_email: supportEmail,
                register_mode: registerMode,
                welcome_message: welcomeMessage,
                custom_css: customCss,
                custom_links: customLinksData,
                use_image_proxy: useImageProxy
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '前端配置已保存，刷新页面后生效', 'success');
            loadSiteConfig();
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存前端配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// 点击弹窗外部关闭
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});


// ==================== 套餐配置 ====================
let plansConfigData = [];

// 记录套餐卡片展开状态
let expandedPlanCards = new Set();

// ==================== 默认权益配置（未订阅/白名单用户） ====================
let defaultBenefitsData = {
    unsubscribed: [],
    whitelist: []
};

async function loadDefaultBenefits() {
    try {
        const response = await fetch('/api/admin/default-benefits');
        const data = await response.json();
        
        if (data.success) {
            defaultBenefitsData = data.default_benefits || { unsubscribed: [], whitelist: [] };
            renderDefaultBenefits('unsubscribed');
            renderDefaultBenefits('whitelist');
        }
    } catch (error) {
        console.error('加载默认权益配置失败:', error);
    }
}

function renderDefaultBenefits(type) {
    const containerId = type === 'whitelist' ? 'whitelistBenefitsList' : 'unsubscribedBenefitsList';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const benefits = defaultBenefitsData[type] || [];
    
    if (benefits.length === 0) {
        container.innerHTML = `<div class="benefits-empty-hint">暂无配置</div>`;
        return;
    }
    
    container.innerHTML = benefits.map((benefit, index) => `
        <div class="benefit-config-item" data-type="${type}" data-index="${index}">
            <div class="benefit-config-icon">
                <input type="text" value="${benefit.icon || ''}" 
                       placeholder="emoji" 
                       maxlength="4"
                       onchange="updateDefaultBenefit('${type}', ${index}, 'icon', this.value)">
            </div>
            <div class="benefit-config-text">
                <input type="text" value="${benefit.text || ''}" 
                       placeholder="权益描述" 
                       maxlength="30"
                       onchange="updateDefaultBenefit('${type}', ${index}, 'text', this.value)">
            </div>
            <button class="benefit-config-delete" onclick="removeDefaultBenefit('${type}', ${index})" title="删除">
                🗑️
            </button>
        </div>
    `).join('');
}

function addDefaultBenefit(type) {
    if (!defaultBenefitsData[type]) {
        defaultBenefitsData[type] = [];
    }
    if (defaultBenefitsData[type].length >= 8) {
        showToast('提示', '最多只能添加8个权益', 'warning');
        return;
    }
    defaultBenefitsData[type].push({ icon: '✨', text: '' });
    renderDefaultBenefits(type);
}

function updateDefaultBenefit(type, index, field, value) {
    if (defaultBenefitsData[type] && defaultBenefitsData[type][index]) {
        defaultBenefitsData[type][index][field] = value;
    }
}

function removeDefaultBenefit(type, index) {
    if (defaultBenefitsData[type]) {
        defaultBenefitsData[type].splice(index, 1);
        renderDefaultBenefits(type);
    }
}

async function saveDefaultBenefits() {
    // 过滤掉空的权益
    const cleanData = {
        unsubscribed: (defaultBenefitsData.unsubscribed || []).filter(b => b.icon && b.text),
        whitelist: (defaultBenefitsData.whitelist || []).filter(b => b.icon && b.text)
    };
    
    try {
        const response = await fetch('/api/admin/default-benefits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ default_benefits: cleanData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '默认权益配置已保存', 'success');
            defaultBenefitsData = cleanData;
            renderDefaultBenefits('unsubscribed');
            renderDefaultBenefits('whitelist');
        } else {
            showToast('错误', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存默认权益配置失败:', error);
        showToast('错误', '网络错误', 'error');
    }
}

// ==================== 套餐内权益配置 ====================
function renderPlanBenefits(planIndex) {
    const plan = plansConfigData[planIndex];
    const benefits = plan.benefits || [];
    const containerId = `planBenefitsList_${planIndex}`;
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (benefits.length === 0) {
        container.innerHTML = `<div class="benefits-empty-hint">暂无配置，点击添加</div>`;
        return;
    }
    
    container.innerHTML = benefits.map((benefit, index) => `
        <div class="benefit-config-item" data-plan="${planIndex}" data-index="${index}">
            <div class="benefit-config-icon">
                <input type="text" value="${benefit.icon || ''}" 
                       placeholder="emoji" 
                       maxlength="4"
                       onchange="updatePlanBenefit(${planIndex}, ${index}, 'icon', this.value)">
            </div>
            <div class="benefit-config-text">
                <input type="text" value="${benefit.text || ''}" 
                       placeholder="权益描述" 
                       maxlength="30"
                       onchange="updatePlanBenefit(${planIndex}, ${index}, 'text', this.value)">
            </div>
            <button class="benefit-config-delete" onclick="removePlanBenefit(${planIndex}, ${index})" title="删除">
                🗑️
            </button>
        </div>
    `).join('');
}

function addPlanBenefit(planIndex) {
    if (!plansConfigData[planIndex].benefits) {
        plansConfigData[planIndex].benefits = [];
    }
    if (plansConfigData[planIndex].benefits.length >= 8) {
        showToast('提示', '最多只能添加8个权益', 'warning');
        return;
    }
    plansConfigData[planIndex].benefits.push({ icon: '✨', text: '' });
    renderPlanBenefits(planIndex);
}

function updatePlanBenefit(planIndex, benefitIndex, field, value) {
    if (plansConfigData[planIndex] && plansConfigData[planIndex].benefits && plansConfigData[planIndex].benefits[benefitIndex]) {
        plansConfigData[planIndex].benefits[benefitIndex][field] = value;
    }
}

function removePlanBenefit(planIndex, benefitIndex) {
    if (plansConfigData[planIndex] && plansConfigData[planIndex].benefits) {
        plansConfigData[planIndex].benefits.splice(benefitIndex, 1);
        renderPlanBenefits(planIndex);
    }
}

// 辅助函数：用于模板字符串中内联渲染
function renderPlanBenefitsInline(benefits) {
    if (!benefits || benefits.length === 0) {
        return `<div class="benefits-empty-hint">暂无配置，点击添加</div>`;
    }
    return ''; // 实际内容会在renderPlanBenefits中渲染
}

async function loadPlansConfig() {
    // 同时加载默认权益配置
    loadDefaultBenefits();
    
    try {
        const response = await fetch('/api/admin/plans-config');
        const data = await response.json();
        
        if (data.success) {
            plansConfigData = data.plans || [];
            expandedPlanCards.clear(); // 加载时重置展开状态
            renderPlansConfig();
        }
    } catch (error) {
        console.error('加载套餐配置失败:', error);
        showToast('错误', '加载套餐配置失败', 'error');
    }
}

function renderPlansConfig() {
    const container = document.getElementById('plansConfigList');
    if (!container) return;
    
    if (plansConfigData.length === 0) {
        container.innerHTML = '<div class="empty-placeholder">暂无套餐配置，请点击上方按钮添加套餐</div>';
        return;
    }
    
    container.innerHTML = plansConfigData.map((plan, index) => `
        <div class="plan-config-item collapsible-card ${expandedPlanCards.has(index) ? 'expanded' : ''}" data-index="${index}">
            <div class="plan-config-header collapsible-header" onclick="togglePlanCard(${index}, event)">
                <div class="header-left">
                    <span class="collapse-icon">▶</span>
                    <span class="plan-config-title">${plan.name || '新套餐'}</span>
                </div>
                <div class="plan-config-actions">
                    ${plan.popular ? '<span class="plan-badge popular">推荐</span>' : ''}
                    <button class="btn-icon btn-danger" onclick="deletePlan(${index}); event.stopPropagation();" title="删除套餐">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
            <div class="plan-config-body collapsible-body">
                <div class="plan-config-grid">
                    <div class="plan-config-field">
                        <label>套餐ID</label>
                        <input type="text" value="${plan.id || ''}" 
                               onchange="updatePlanField(${index}, 'id', this.value)"
                               placeholder="如: basic">
                    </div>
                    <div class="plan-config-field">
                        <label>套餐类型</label>
                        <select class="custom-select" onchange="updatePlanField(${index}, 'type', this.value)">
                            <option value="basic" ${plan.type === 'basic' ? 'selected' : ''}>基础</option>
                            <option value="standard" ${plan.type === 'standard' ? 'selected' : ''}>标准</option>
                            <option value="premium" ${plan.type === 'premium' ? 'selected' : ''}>高级</option>
                            <option value="ultimate" ${plan.type === 'ultimate' ? 'selected' : ''}>至尊</option>
                        </select>
                    </div>
                    <div class="plan-config-field">
                        <label>套餐名称</label>
                        <input type="text" value="${plan.name || ''}" 
                               onchange="updatePlanField(${index}, 'name', this.value)"
                               placeholder="如: 入门版、标准版">
                    </div>
                    <div class="plan-config-field">
                        <label>套餐图标</label>
                        <input type="text" value="${plan.icon || ''}" 
                               onchange="updatePlanField(${index}, 'icon', this.value)"
                               placeholder="如: 🌱 ⭐ 💎 👑">
                    </div>
                    <div class="plan-config-field">
                        <label>默认时长（天）</label>
                        <input type="number" value="${plan.duration_days || (plan.duration || 1) * 30}" min="1" max="3650"
                               onchange="updatePlanField(${index}, 'duration_days', parseInt(this.value) || 30)"
                               placeholder="30">
                        <span class="field-hint">签到兑换套餐使用此天数</span>
                    </div>
                    <div class="plan-config-field full-width">
                        <label>套餐描述</label>
                        <input type="text" value="${plan.description || ''}" 
                               onchange="updatePlanField(${index}, 'description', this.value)"
                               placeholder="如: 适合轻度观影用户，满足基本观影需求">
                    </div>
                    <div class="plan-config-field">
                        <label class="checkbox-label">
                            <input type="checkbox" ${plan.popular ? 'checked' : ''} 
                                   onchange="updatePlanField(${index}, 'popular', this.checked)">
                            <span>设为推荐套餐</span>
                        </label>
                    </div>
                </div>
                
                <!-- 四个周期价格 -->
                <div class="plan-prices-section">
                    <div class="prices-title">💰 价格设置（元）</div>
                    <div class="plan-prices-grid">
                        <div class="price-field">
                            <label>月付价格</label>
                            <div class="price-input-wrapper">
                                <span class="price-prefix">¥</span>
                                <input type="number" value="${plan.price_1m || plan.price || ''}" min="0" step="0.01"
                                       onchange="updatePlanField(${index}, 'price_1m', parseFloat(this.value) || 0)"
                                       placeholder="0.00">
                                <span class="price-suffix">/月</span>
                            </div>
                        </div>
                        <div class="price-field">
                            <label>季付价格</label>
                            <div class="price-input-wrapper">
                                <span class="price-prefix">¥</span>
                                <input type="number" value="${plan.price_3m || ''}" min="0" step="0.01"
                                       onchange="updatePlanField(${index}, 'price_3m', parseFloat(this.value) || 0)"
                                       placeholder="0.00">
                                <span class="price-suffix">/3月</span>
                            </div>
                            <span class="price-hint" id="hint3m_${index}">${plan.price_1m ? '原价 ¥' + (plan.price_1m * 3).toFixed(2) : ''}</span>
                        </div>
                        <div class="price-field">
                            <label>半年付价格</label>
                            <div class="price-input-wrapper">
                                <span class="price-prefix">¥</span>
                                <input type="number" value="${plan.price_6m || ''}" min="0" step="0.01"
                                       onchange="updatePlanField(${index}, 'price_6m', parseFloat(this.value) || 0)"
                                       placeholder="0.00">
                                <span class="price-suffix">/6月</span>
                            </div>
                            <span class="price-hint" id="hint6m_${index}">${plan.price_1m ? '原价 ¥' + (plan.price_1m * 6).toFixed(2) : ''}</span>
                        </div>
                        <div class="price-field">
                            <label>年付价格</label>
                            <div class="price-input-wrapper">
                                <span class="price-prefix">¥</span>
                                <input type="number" value="${plan.price_12m || ''}" min="0" step="0.01"
                                       onchange="updatePlanField(${index}, 'price_12m', parseFloat(this.value) || 0)"
                                       placeholder="0.00">
                                <span class="price-suffix">/年</span>
                            </div>
                            <span class="price-hint" id="hint12m_${index}">${plan.price_1m ? '原价 ¥' + (plan.price_1m * 12).toFixed(2) : ''}</span>
                        </div>
                    </div>
                    <div class="price-auto-calc">
                        <button type="button" class="btn-sm btn-secondary" onclick="autoCalcPrices(${index})">
                            🔄 根据月付自动计算优惠价
                        </button>
                    </div>
                </div>
                
                <!-- 特性说明 -->
                <div class="plan-config-field full-width">
                    <label>特性说明 (每行一个)</label>
                    <textarea rows="3" 
                              onchange="updatePlanField(${index}, 'features', this.value.split('\\n').filter(f => f.trim()))"
                              placeholder="1080P 画质&#10;1 个设备&#10;每日 1 次求片">${(plan.features || []).join('\n')}</textarea>
                </div>
                
                <!-- 订阅权益配置 -->
                <div class="plan-benefits-section">
                    <div class="plan-benefits-header">
                        <span class="plan-benefits-title">🎁 订阅权益（在"我的订阅"显示，最多8个）</span>
                        <button type="button" class="btn-xs btn-secondary" onclick="addPlanBenefit(${index})">➕ 添加</button>
                    </div>
                    <div class="benefits-config-list" id="planBenefitsList_${index}">
                        ${renderPlanBenefitsInline(plan.benefits || [])}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 渲染完成后初始化各套餐的权益列表
    plansConfigData.forEach((plan, index) => {
        renderPlanBenefits(index);
    });
}

// 切换套餐卡片展开/折叠
function togglePlanCard(index, event) {
    // 阻止事件冒泡，防止点击按钮时也触发
    if (event.target.closest('.btn-icon')) return;
    
    const card = document.querySelector(`.plan-config-item[data-index="${index}"]`);
    if (card) {
        card.classList.toggle('expanded');
        // 记录展开状态
        if (card.classList.contains('expanded')) {
            expandedPlanCards.add(index);
        } else {
            expandedPlanCards.delete(index);
        }
    }
}

// 自动计算优惠价格
function autoCalcPrices(index) {
    const plan = plansConfigData[index];
    const monthlyPrice = plan.price_1m || plan.price || 0;
    
    if (monthlyPrice <= 0) {
        showToast('提示', '请先填写月付价格', 'warning');
        return;
    }
    
    // 计算优惠价格：季付93折，半年付83折，年付75折
    plan.price_3m = Math.round(monthlyPrice * 2.8 * 100) / 100;   // 约93折
    plan.price_6m = Math.round(monthlyPrice * 5 * 100) / 100;     // 约83折
    plan.price_12m = Math.round(monthlyPrice * 9 * 100) / 100;    // 约75折
    
    renderPlansConfig();
    showToast('成功', '已自动计算优惠价格', 'success');
}

function updatePlanField(index, field, value) {
    if (plansConfigData[index]) {
        plansConfigData[index][field] = value;
        
        // 同步更新 price 字段（兼容旧数据）
        if (field === 'price_1m') {
            plansConfigData[index].price = value;
            plansConfigData[index].duration = 1;
        }
        
        // 如果修改的是名称，更新标题显示
        if (field === 'name') {
            const item = document.querySelector(`.plan-config-item[data-index="${index}"] .plan-config-title`);
            if (item) item.textContent = value || '新套餐';
        }
        // 如果修改的是推荐状态，重新渲染
        if (field === 'popular') {
            renderPlansConfig();
        }
    }
}

function addNewPlan() {
    const newPlan = {
        id: `plan_${Date.now()}`,
        type: 'basic',
        name: '新套餐',
        duration: 1,
        price: 0,
        price_1m: 0,
        price_3m: 0,
        price_6m: 0,
        price_12m: 0,
        features: [],
        popular: false
    };
    plansConfigData.push(newPlan);
    renderPlansConfig();
    
    // 滚动到新添加的套餐
    const container = document.getElementById('plansConfigList');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
    
    showToast('提示', '已添加新套餐，请填写信息', 'info');
}

async function deletePlan(index) {
    if (plansConfigData.length <= 1) {
        showToast('警告', '至少需要保留一个套餐', 'warning');
        return;
    }
    
    const plan = plansConfigData[index];
    const confirmed = await showConfirm({
        title: '删除套餐',
        message: `确定要删除套餐"${plan.name}"吗？`,
        confirmText: '删除',
        type: 'danger'
    });
    if (confirmed) {
        plansConfigData.splice(index, 1);
        renderPlansConfig();
        showToast('提示', '套餐已删除，请保存以生效', 'info');
    }
}

async function savePlansConfig() {
    // 验证数据
    const invalidPlans = plansConfigData.filter(p => !p.id || !p.name);
    if (invalidPlans.length > 0) {
        showToast('警告', '请确保所有套餐都填写了ID和名称', 'warning');
        return;
    }
    
    // 验证价格
    const noPricePlans = plansConfigData.filter(p => !p.price_1m && !p.price);
    if (noPricePlans.length > 0) {
        showToast('警告', '请确保所有套餐都填写了月付价格', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/plans-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plans: plansConfigData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message || '套餐配置已保存', 'success');
        } else {
            showToast('失败', data.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存套餐配置失败:', error);
        showToast('错误', '保存失败: ' + error.message, 'error');
    }
}

// ==================== 兑换码管理 ====================
let redeemCodesData = [];
let redeemCurrentPage = 1;
const redeemPageSize = 20;

// 加载兑换码列表
async function loadRedeemCodes() {
    const tableBody = document.getElementById('redeemCodesTableBody');
    if (!tableBody) {
        console.error('找不到 redeemCodesTableBody 元素');
        return;
    }
    
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">加载中...</td></tr>';
    
    // 获取筛选参数
    const typeFilter = document.getElementById('codeTypeFilter')?.value || '';
    const statusFilter = document.getElementById('codeStatusFilter')?.value || '';
    
    try {
        let url = '/api/admin/redeem-codes';
        const params = new URLSearchParams();
        if (typeFilter) params.append('type', typeFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (params.toString()) url += '?' + params.toString();
        
        console.log('请求兑换码列表:', url);
        const response = await fetch(url);
        const data = await response.json();
        console.log('兑换码响应:', data);
        
        if (data.success) {
            redeemCodesData = data.codes || [];
            renderRedeemCodesTable();
            
            // 更新统计
            if (data.stats) {
                const totalEl = document.getElementById('totalCodes');
                const availableEl = document.getElementById('unusedCodes');
                const usedEl = document.getElementById('usedCodes');
                
                if (totalEl) totalEl.textContent = data.stats.total || 0;
                if (availableEl) availableEl.textContent = data.stats.unused || 0;
                if (usedEl) usedEl.textContent = data.stats.used || 0;
            }
        } else {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">加载失败: ${data.error || '未知错误'}</td></tr>`;
        }
    } catch (error) {
        console.error('加载兑换码失败:', error);
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">加载失败: ' + error.message + '</td></tr>';
    }
}

// 渲染兑换码表格
function renderRedeemCodesTable() {
    const tableBody = document.getElementById('redeemCodesTableBody');
    if (!tableBody) return;
    
    // 重置全选框
    const selectAllCheckbox = document.getElementById('selectAllRedeem');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateSelectedRedeemCount();
    
    if (redeemCodesData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#6b7280;">暂无兑换码</td></tr>';
        return;
    }
    
    // 分页
    const startIdx = (redeemCurrentPage - 1) * redeemPageSize;
    const pageData = redeemCodesData.slice(startIdx, startIdx + redeemPageSize);
    
    tableBody.innerHTML = pageData.map(code => {
        const codeTypeText = code.code_type === 'new' ? '新购' : '续费';
        const codeTypeClass = code.code_type === 'new' ? 'badge-info' : 'badge-warning';
        const statusText = code.is_used ? '已使用' : (code.is_active !== false ? '可用' : '已禁用');
        const statusClass = code.is_used ? 'badge-secondary' : (code.is_active !== false ? 'badge-success' : 'badge-danger');
        const usedInfo = code.is_used ? `${code.used_by_name || '-'}` : '-';
        const usedTime = code.is_used && code.used_at ? new Date(code.used_at).toLocaleString() : '-';
        
        // 将天数转为月数显示
        const durationMonths = Math.round(code.duration_days / 30);
        const durationText = durationMonths > 0 ? `${durationMonths}个月` : `${code.duration_days}天`;
        
        return `
            <tr data-code-id="${code.id}">
                <td><input type="checkbox" class="redeem-checkbox" value="${code.id}" onchange="updateSelectedRedeemCount()"></td>
                <td><code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:13px;">${code.code}</code></td>
                <td><span class="badge ${codeTypeClass}">${codeTypeText}</span></td>
                <td>${code.plan_name || code.plan_type}</td>
                <td>${durationText}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${usedInfo}</td>
                <td>${usedTime}</td>
                <td>
                    ${!code.is_used ? `
                        <button class="btn-action ${code.is_active !== false ? 'btn-warning' : 'btn-success'}" onclick="toggleRedeemCode(${code.id})" title="${code.is_active !== false ? '禁用' : '启用'}">
                            ${code.is_active !== false ? '禁用' : '启用'}
                        </button>
                        <button class="btn-action btn-danger" onclick="showSingleDeleteConfirm(${code.id})" title="删除">
                            删除
                        </button>
                    ` : `
                        <button class="btn-action btn-danger" onclick="showSingleDeleteConfirm(${code.id})" title="删除">
                            删除
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
    
    // 更新分页信息
    const totalPages = Math.ceil(redeemCodesData.length / redeemPageSize);
    const pageInfo = document.getElementById('redeemPageInfo');
    if (pageInfo) {
        pageInfo.textContent = `第 ${redeemCurrentPage} / ${totalPages || 1} 页，共 ${redeemCodesData.length} 条`;
    }
}

// 全选/取消全选兑换码
function toggleSelectAllRedeem() {
    const selectAll = document.getElementById('selectAllRedeem');
    const checkboxes = document.querySelectorAll('.redeem-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateSelectedRedeemCount();
}

// 更新已选择兑换码数量
function updateSelectedRedeemCount() {
    const checkboxes = document.querySelectorAll('.redeem-checkbox:checked');
    const count = checkboxes.length;
    const countEl = document.getElementById('selectedRedeemCount');
    const batchBtn = document.getElementById('batchDeleteRedeemBtn');
    
    if (countEl) countEl.textContent = count;
    if (batchBtn) batchBtn.style.display = count > 0 ? 'inline-flex' : 'none';
}

// 获取选中的兑换码ID列表
function getSelectedRedeemIds() {
    const checkboxes = document.querySelectorAll('.redeem-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// 显示删除确认弹窗（批量）
function showDeleteRedeemConfirm() {
    const ids = getSelectedRedeemIds();
    if (ids.length === 0) {
        showToast('提示', '请先选择要删除的兑换码', 'warning');
        return;
    }
    document.getElementById('deleteRedeemCount').textContent = ids.length;
    document.getElementById('deleteRedeemOverlay').classList.add('show');
}

// 显示删除确认弹窗（单个）
let singleDeleteRedeemId = null;
function showSingleDeleteConfirm(id) {
    singleDeleteRedeemId = id;
    document.getElementById('deleteRedeemCount').textContent = 1;
    document.getElementById('deleteRedeemOverlay').classList.add('show');
}

// 隐藏删除确认弹窗
function hideDeleteRedeemConfirm() {
    document.getElementById('deleteRedeemOverlay').classList.remove('show');
    singleDeleteRedeemId = null;
}

// 确认删除兑换码
async function confirmDeleteRedeemCodes() {
    let ids;
    if (singleDeleteRedeemId) {
        ids = [singleDeleteRedeemId];
    } else {
        ids = getSelectedRedeemIds();
    }
    
    if (ids.length === 0) {
        hideDeleteRedeemConfirm();
        return;
    }
    
    hideDeleteRedeemConfirm();
    
    let successCount = 0;
    let failCount = 0;
    
    for (const id of ids) {
        try {
            const response = await fetch(`/api/admin/redeem-codes/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error('删除兑换码失败:', error);
            failCount++;
        }
    }
    
    if (successCount > 0) {
        showToast('成功', `成功删除 ${successCount} 个兑换码`, 'success');
    }
    if (failCount > 0) {
        showToast('警告', `${failCount} 个兑换码删除失败`, 'warning');
    }
    
    singleDeleteRedeemId = null;
    loadRedeemCodes();
}

// 切换兑换码分页
function changeRedeemPage(direction) {
    const totalPages = Math.ceil(redeemCodesData.length / redeemPageSize);
    const newPage = redeemCurrentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        redeemCurrentPage = newPage;
        renderRedeemCodesTable();
    }
}

// 显示生成兑换码弹窗
function showGenerateRedeemDialog() {
    document.getElementById('generateRedeemOverlay').classList.add('show');
}

// 隐藏生成兑换码弹窗
function hideGenerateRedeemDialog() {
    document.getElementById('generateRedeemOverlay').classList.remove('show');
}

// 生成兑换码
async function generateRedeemCodes() {
    const codeType = document.getElementById('redeemCodeType').value;
    const planType = document.getElementById('redeemPlanType').value;
    const durationMonths = parseInt(document.getElementById('redeemDuration').value);
    const count = parseInt(document.getElementById('redeemCount').value);
    
    if (!planType) {
        showToast('警告', '请选择套餐类型', 'warning');
        return;
    }
    
    if (count < 1 || count > 100) {
        showToast('警告', '生成数量需在1-100之间', 'warning');
        return;
    }
    
    // 将月数转为天数
    const durationDays = durationMonths * 30;
    
    const btn = document.querySelector('#generateRedeemOverlay .btn-primary');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '生成中...';
    
    try {
        const response = await fetch('/api/admin/redeem-codes/batch-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code_type: codeType,
                plan_type: planType,
                duration_days: durationDays,
                count: count
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', `成功生成 ${data.count} 个兑换码`, 'success');
            hideGenerateRedeemDialog();
            loadRedeemCodes();
            
            // 显示生成的兑换码
            if (data.codes && data.codes.length > 0) {
                showGeneratedCodes(data.codes.map(c => c.code));
            }
        } else {
            showToast('失败', data.error || '生成失败', 'error');
        }
    } catch (error) {
        console.error('生成兑换码失败:', error);
        showToast('错误', '生成失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 显示生成的兑换码
function showGeneratedCodes(codes) {
    const codesText = codes.join('\n');
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay show';
    dialog.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header">
                <h3>🎉 兑换码生成成功</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom:12px;color:#6b7280;">已生成 ${codes.length} 个兑换码：</p>
                <textarea readonly style="width:100%;height:200px;font-family:monospace;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;resize:none;">${codesText}</textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                <button class="btn btn-primary" onclick="copyGeneratedCodes('${codesText.replace(/\n/g, '\\n')}')">
                    📋 复制全部
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

// 复制生成的兑换码
function copyGeneratedCodes(codesText) {
    const text = codesText.replace(/\\n/g, '\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast('成功', '已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('失败', '复制失败', 'error');
    });
}

// 删除兑换码（已被新的弹窗方式替代，保留用于兼容）
async function deleteRedeemCode(codeId) {
    showSingleDeleteConfirm(codeId);
}

// 切换兑换码状态
async function toggleRedeemCode(codeId) {
    try {
        const response = await fetch(`/api/admin/redeem-codes/${codeId}/toggle`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message || '状态已更新', 'success');
            loadRedeemCodes();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换兑换码状态失败:', error);
        showToast('错误', '操作失败', 'error');
    }
}


// ==================== 线路管理 ====================
let allLines = [];

async function loadLines() {
    const linesList = document.getElementById('linesList');
    if (!linesList) return;
    
    linesList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>加载中...</p></div>';
    
    try {
        const response = await fetch('/api/admin/lines');
        const data = await response.json();
        
        if (data.success) {
            allLines = data.lines || [];
            renderLines(allLines);
            updateLinesStats();
        } else {
            linesList.innerHTML = '<p class="error-text">加载失败</p>';
        }
    } catch (error) {
        console.error('加载线路失败:', error);
        linesList.innerHTML = '<p class="error-text">加载失败</p>';
    }
}

function renderLines(lines) {
    const linesList = document.getElementById('linesList');
    if (!linesList) return;
    
    if (lines.length === 0) {
        linesList.innerHTML = `
            <div class="empty-state-compact">
                <div class="empty-icon">🔗</div>
                <div>暂无线路，点击上方按钮添加</div>
            </div>
        `;
        return;
    }
    
    const accessLevelNames = {
        'whitelist': '白名单',
        'subscriber': '订阅用户',
        'all': '所有用户'
    };
    
    linesList.innerHTML = lines.map(line => {
        const fullUrl = line.full_url || (line.is_https ? 'https' : 'http') + '://' + line.server_url + ':' + line.port;
        return `
            <div class="line-item-compact ${!line.is_active ? 'disabled' : ''}">
                <div class="line-item-info">
                    <span class="line-item-icon">${line.access_level === 'whitelist' ? '👑' : '🔗'}</span>
                    <div class="line-item-details">
                        <div class="line-item-name">${line.name}</div>
                        <div class="line-item-url">${fullUrl}</div>
                    </div>
                </div>
                <div class="line-item-badges">
                    <span class="line-badge-mini ${line.access_level}">${accessLevelNames[line.access_level] || line.access_level}</span>
                    <span class="line-badge-mini ${line.is_active ? 'enabled' : 'disabled'}">${line.is_active ? '启用' : '禁用'}</span>
                </div>
                <div class="line-item-actions">
                    <button class="btn-edit" onclick="editLine(${line.id})">编辑</button>
                    <button class="btn-toggle" onclick="toggleLine(${line.id})">${line.is_active ? '禁用' : '启用'}</button>
                    <button class="btn-delete" onclick="deleteLine(${line.id})">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateLinesStats() {
    const totalEl = document.getElementById('totalLines');
    const activeEl = document.getElementById('activeLines');
    const whitelistEl = document.getElementById('whitelistLines');
    const statusEl = document.getElementById('linesStatus');
    
    if (totalEl) totalEl.textContent = allLines.length;
    if (activeEl) activeEl.textContent = allLines.filter(l => l.is_active).length;
    if (whitelistEl) whitelistEl.textContent = allLines.filter(l => l.access_level === 'whitelist').length;
    if (statusEl) statusEl.textContent = `${allLines.length} 条线路`;
}

function showAddLineModal() {
    document.getElementById('lineModalTitle').textContent = '添加线路';
    document.getElementById('editLineId').value = '';
    document.getElementById('lineName').value = '';
    document.getElementById('lineServerUrl').value = '';
    document.getElementById('linePort').value = '8096';
    document.getElementById('lineHttps').value = 'false';
    document.getElementById('lineAccessLevel').value = 'whitelist';
    document.getElementById('lineDescription').value = '';
    document.getElementById('lineSortOrder').value = '0';
    document.getElementById('lineModal').style.display = 'flex';
}

function editLine(lineId) {
    const line = allLines.find(l => l.id === lineId);
    if (!line) return;
    
    document.getElementById('lineModalTitle').textContent = '编辑线路';
    document.getElementById('editLineId').value = line.id;
    document.getElementById('lineName').value = line.name || '';
    document.getElementById('lineServerUrl').value = line.server_url || '';
    document.getElementById('linePort').value = line.port || 8096;
    document.getElementById('lineHttps').value = line.is_https ? 'true' : 'false';
    document.getElementById('lineAccessLevel').value = line.access_level || 'whitelist';
    document.getElementById('lineDescription').value = line.description || '';
    document.getElementById('lineSortOrder').value = line.sort_order || 0;
    document.getElementById('lineModal').style.display = 'flex';
}

function closeLineModal() {
    document.getElementById('lineModal').style.display = 'none';
}

async function saveLine() {
    const lineId = document.getElementById('editLineId').value;
    const name = document.getElementById('lineName').value.trim();
    const serverUrl = document.getElementById('lineServerUrl').value.trim();
    const port = parseInt(document.getElementById('linePort').value) || 8096;
    const isHttps = document.getElementById('lineHttps').value === 'true';
    const accessLevel = document.getElementById('lineAccessLevel').value;
    const description = document.getElementById('lineDescription').value.trim();
    const sortOrder = parseInt(document.getElementById('lineSortOrder').value) || 0;
    
    if (!name) {
        showToast('错误', '请输入线路名称', 'error');
        return;
    }
    if (!serverUrl) {
        showToast('错误', '请输入服务器地址', 'error');
        return;
    }
    
    const payload = {
        name,
        server_url: serverUrl,
        port,
        is_https: isHttps,
        access_level: accessLevel,
        description,
        sort_order: sortOrder
    };
    
    try {
        const url = lineId ? `/api/admin/lines/${lineId}` : '/api/admin/lines';
        const method = lineId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', lineId ? '线路已更新' : '线路已添加', 'success');
            closeLineModal();
            loadLines();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存线路失败:', error);
        showToast('错误', '保存失败', 'error');
    }
}

async function toggleLine(lineId) {
    const line = allLines.find(l => l.id === lineId);
    if (!line) return;
    
    try {
        const response = await fetch(`/api/admin/lines/${lineId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !line.is_active })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', line.is_active ? '线路已禁用' : '线路已启用', 'success');
            loadLines();
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换线路状态失败:', error);
        showToast('错误', '操作失败', 'error');
    }
}

async function deleteLine(lineId) {
    const confirmed = await showConfirm({
        title: '删除线路',
        message: '确定要删除这条线路吗？\n此操作不可恢复。',
        confirmText: '删除',
        type: 'danger'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/lines/${lineId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '线路已删除', 'success');
            loadLines();
        } else {
            showToast('失败', data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除线路失败:', error);
        showToast('错误', '删除失败', 'error');
    }
}


// ==================== 播放监控管理 ====================
let adminPlaybackRefreshTimer = null;
let adminDevicesPage = 1;
let adminHistoryPage = 1;

async function loadAdminPlayback() {
    console.log('loadAdminPlayback 开始加载...');
    loadAdminSessions();
    loadAdminDevices(1);
    loadAdminHistory(1);
    
    // 启动自动刷新（只刷新实时会话，5秒间隔）
    if (adminPlaybackRefreshTimer) {
        clearInterval(adminPlaybackRefreshTimer);
    }
    adminPlaybackRefreshTimer = setInterval(() => {
        const section = document.getElementById('section-playback');
        if (section && section.classList.contains('active')) {
            loadAdminSessions();
        }
    }, 5000);
}

function refreshAdminPlayback() {
    loadAdminSessions();
    loadAdminDevices(1);
    loadAdminHistory(1);
    showToast('成功', '数据已刷新', 'success');
}

async function syncAllPlaybackHistory() {
    const confirmed = await showConfirm({
        title: '同步播放历史',
        message: '确定要从 Emby 同步所有用户的播放历史吗？\n\n这可能需要一些时间。',
        confirmText: '开始同步',
        type: 'info'
    });
    if (!confirmed) return;
    
    showLoading('正在同步播放历史...');
    
    try {
        const response = await fetch('/api/admin/playback/sync-all', {
            method: 'POST'
        });
        const data = await response.json();
        
        hideLoading();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
            loadAdminDevices(1);
            loadAdminHistory(1);
        } else {
            showToast('失败', data.error || '同步失败', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('同步失败:', error);
        showToast('错误', '同步失败', 'error');
    }
}

function switchPlaybackTab(tab) {
    // 切换按钮状态
    document.querySelectorAll('.playback-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.playback-tabs .tab-btn[onclick*="${tab}"]`).classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.playback-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`playbackTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    // 根据标签页加载对应数据
    if (tab === 'blacklist') {
        loadBlacklist();
    }
}

async function loadAdminSessions() {
    const container = document.getElementById('adminSessionsContainer');
    
    try {
        const response = await fetch('/api/admin/playback/all-sessions');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h4>${data.error || '加载失败'}</h4>
                </div>
            `;
            return;
        }
        
        // 更新统计（现在只显示正在播放的数量）
        document.getElementById('adminTotalSessions').textContent = data.total_sessions || 0;
        
        const sessions = data.sessions || [];
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <div class="empty-icon">📺</div>
                    <h4>暂无正在播放的会话</h4>
                    <p>当前没有用户在播放内容</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = sessions.map(s => {
            const isPaused = s.play_state?.is_paused;
            const statusClass = isPaused ? 'paused' : 'playing';
            const statusText = isPaused ? '已暂停' : '播放中';
            
            let nowPlaying = '未知内容';
            let progressPercent = 0;
            let progressTime = '';
            
            if (s.now_playing) {
                nowPlaying = s.now_playing.display_name || s.now_playing.name || '未知内容';
                if (s.play_state && s.now_playing.run_time_ticks) {
                    const pos = s.play_state.position_ticks || 0;
                    const total = s.now_playing.run_time_ticks;
                    progressPercent = Math.round((pos / total) * 100);
                    
                    // 格式化时间
                    const posSec = Math.floor(pos / 10000000);
                    const totalSec = Math.floor(total / 10000000);
                    const formatTime = (sec) => {
                        const h = Math.floor(sec / 3600);
                        const m = Math.floor((sec % 3600) / 60);
                        const s = sec % 60;
                        return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
                    };
                    progressTime = `${formatTime(posSec)} / ${formatTime(totalSec)}`;
                }
            }
            
            // 设备图标
            const clientLower = (s.client || '').toLowerCase();
            let deviceIcon = '📱';
            if (clientLower.includes('tv') || clientLower.includes('android tv')) deviceIcon = '📺';
            else if (clientLower.includes('web') || clientLower.includes('chrome')) deviceIcon = '🌐';
            else if (clientLower.includes('windows') || clientLower.includes('mac')) deviceIcon = '💻';
            else if (clientLower.includes('infuse') || clientLower.includes('plex')) deviceIcon = '🎥';
            
            return `
                <div class="admin-session-card ${statusClass}">
                    <div class="session-header">
                        <div class="session-user">
                            <div class="user-avatar">${(s.user_name || '?')[0].toUpperCase()}</div>
                            <div class="user-info">
                                <div class="user-name">${escapeHtml(s.user_name)}</div>
                                <div class="device-info">
                                    <span class="device-icon">${deviceIcon}</span>
                                    <span>${escapeHtml(s.device_name)}</span>
                                    <span class="client-version">${escapeHtml(s.client)} ${s.app_version || ''}</span>
                                </div>
                            </div>
                        </div>
                        <div class="session-status ${statusClass}">
                            <span class="status-dot"></span>
                            ${statusText}
                        </div>
                    </div>
                    <div class="session-content">
                        <div class="now-playing-title" title="${escapeHtml(nowPlaying)}">
                            🎬 ${escapeHtml(nowPlaying)}
                        </div>
                        <div class="playback-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <div class="progress-info">
                                <span class="progress-percent">${progressPercent}%</span>
                                <span class="progress-time">${progressTime}</span>
                            </div>
                        </div>
                    </div>
                    ${s.remote_end_point ? `<div class="session-footer"><span class="ip-info">📍 ${s.remote_end_point}</span></div>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('加载会话失败:', error);
        container.innerHTML = `
            <div class="admin-empty-state">
                <div class="empty-icon">❌</div>
                <h4>加载失败</h4>
                <p>请稍后重试</p>
            </div>
        `;
    }
}

async function loadAdminDevices(page = 1) {
    console.log('loadAdminDevices 加载第', page, '页');
    adminDevicesPage = page;
    const search = document.getElementById('deviceSearchInput')?.value || '';
    
    try {
        const response = await fetch(`/api/admin/playback/devices?page=${page}&per_page=6&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        
        if (!data.success) {
            document.getElementById('adminDevicesBody').innerHTML = 
                `<tr><td colspan="7" class="error-cell">${data.error || '加载失败'}</td></tr>`;
            return;
        }
        
        // 更新总设备数
        console.log('设备 API 返回:', data.total, '个设备');
        document.getElementById('adminTotalDevices').textContent = data.total || 0;
        
        const devices = data.devices || [];
        const tbody = document.getElementById('adminDevicesBody');
        
        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无设备记录</td></tr>';
            return;
        }
        
        tbody.innerHTML = devices.map(d => {
            const lastActive = d.last_active ? new Date(d.last_active).toLocaleString('zh-CN') : '-';
            const statusClass = d.is_blocked ? 'blocked' : 'active';
            const statusText = d.is_blocked ? '已禁用' : '正常';
            
            return `
                <tr>
                    <td><strong>${escapeHtml(d.user_name)}</strong></td>
                    <td>${escapeHtml(d.device_name)}</td>
                    <td>${escapeHtml(d.client)}</td>
                    <td>${lastActive}</td>
                    <td>${d.last_ip || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="action-cell">
                        <button class="btn btn-sm ${d.is_blocked ? 'btn-success' : 'btn-warning'}" onclick="toggleAdminDevice(${d.id}, ${d.is_blocked})">
                            ${d.is_blocked ? '启用' : '禁用'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAdminDevice(${d.id})">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // 渲染分页
        renderPagination('devicesPagination', data.current_page, data.pages, 'loadAdminDevices');
        
    } catch (error) {
        console.error('加载设备失败:', error);
        document.getElementById('adminDevicesBody').innerHTML = 
            '<tr><td colspan="7" class="error-cell">加载失败</td></tr>';
    }
}

function searchAdminDevices() {
    clearTimeout(window.deviceSearchTimer);
    window.deviceSearchTimer = setTimeout(() => {
        loadAdminDevices(1);
    }, 300);
}

async function toggleAdminDevice(deviceId, currentBlocked) {
    try {
        const response = await fetch(`/api/admin/playback/devices/${deviceId}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ block: !currentBlocked })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', data.message, 'success');
            loadAdminDevices(adminDevicesPage);
        } else {
            showToast('失败', data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换设备状态失败:', error);
        showToast('错误', '操作失败', 'error');
    }
}

async function deleteAdminDevice(deviceId) {
    const confirmed = await showConfirm({
        title: '删除设备',
        message: '确定要删除此设备吗？\n关联的播放记录也会被删除。',
        confirmText: '删除',
        type: 'danger'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/playback/devices/${deviceId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('成功', '设备已删除', 'success');
            loadAdminDevices(adminDevicesPage);
        } else {
            showToast('失败', data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除设备失败:', error);
        showToast('错误', '删除失败', 'error');
    }
}

async function loadAdminHistory(page = 1) {
    console.log('loadAdminHistory 加载第', page, '页');
    adminHistoryPage = page;
    const search = document.getElementById('historySearchInput')?.value || '';
    
    try {
        const response = await fetch(`/api/admin/playback/history?page=${page}&per_page=6&search=${encodeURIComponent(search)}`);
        const data = await response.json();
        
        if (!data.success) {
            document.getElementById('adminHistoryBody').innerHTML = 
                `<tr><td colspan="6" class="error-cell">${data.error || '加载失败'}</td></tr>`;
            return;
        }
        
        // 更新总播放记录数
        console.log('播放历史 API 返回:', data.total, '条记录');
        document.getElementById('adminTotalHistory').textContent = data.total || 0;
        
        const records = data.records || [];
        const tbody = document.getElementById('adminHistoryBody');
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">暂无播放记录</td></tr>';
            return;
        }
        
        tbody.innerHTML = records.map(r => {
            const startTime = r.started_at ? new Date(r.started_at).toLocaleString('zh-CN') : '-';
            const typeText = r.item_type === 'Episode' ? '剧集' : '电影';
            const progress = r.play_percentage ? Math.round(r.play_percentage) + '%' : '-';
            
            return `
                <tr>
                    <td><strong>${escapeHtml(r.user_name)}</strong></td>
                    <td class="nowrap" title="${escapeHtml(r.display_name)}">${escapeHtml(r.display_name?.length > 25 ? r.display_name.slice(0, 25) + '...' : r.display_name)}</td>
                    <td>${typeText}</td>
                    <td>${escapeHtml(r.device_name) || '-'}</td>
                    <td>${progress}</td>
                    <td>${startTime}</td>
                </tr>
            `;
        }).join('');
        
        // 渲染分页
        renderPagination('historyPagination', data.current_page, data.pages, 'loadAdminHistory');
        
    } catch (error) {
        console.error('加载播放历史失败:', error);
        document.getElementById('adminHistoryBody').innerHTML = 
            '<tr><td colspan="6" class="error-cell">加载失败</td></tr>';
    }
}

function searchAdminHistory() {
    clearTimeout(window.historySearchTimer);
    window.historySearchTimer = setTimeout(() => {
        loadAdminHistory(1);
    }, 300);
}

function renderPagination(containerId, currentPage, totalPages, loadFunc) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // 上一页
    html += `<button class="page-btn" onclick="${loadFunc}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages <= 7 || i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="${loadFunc}(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }
    
    // 下一页
    html += `<button class="page-btn" onclick="${loadFunc}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
    
    html += '</div>';
    container.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ==================== 设备黑名单管理 ====================
let allBlacklistRules = [];

async function loadBlacklist() {
    try {
        const response = await fetch('/api/admin/device-blacklist');
        const data = await response.json();
        
        if (data.success) {
            allBlacklistRules = data.rules || [];
            renderBlacklist(allBlacklistRules);
        } else {
            showToast('加载失败', data.error || '无法加载黑名单规则', 'error');
        }
    } catch (error) {
        console.error('加载黑名单失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

function renderBlacklist(rules) {
    const tbody = document.getElementById('blacklistTableBody');
    if (!tbody) return;
    
    if (rules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">暂无黑名单规则</td></tr>';
        return;
    }
    
    tbody.innerHTML = rules.map(rule => `
        <tr>
            <td><strong>${escapeHtml(rule.rule_name)}</strong></td>
            <td><code>${rule.client_pattern || '*'}</code></td>
            <td><code>${rule.device_name_pattern || '*'}</code></td>
            <td>
                <span class="status-badge ${rule.action === 'stop_and_ban' ? 'danger' : 'warning'}">
                    ${rule.action === 'stop_and_ban' ? '🚫 停止+禁号' : '⚠️ 仅停止播放'}
                </span>
            </td>
            <td>
                <span class="status-badge ${rule.is_enabled ? 'active' : 'disabled'}">
                    ${rule.is_enabled ? '✅ 已启用' : '⏸️ 已禁用'}
                </span>
            </td>
            <td>${rule.created_at ? new Date(rule.created_at).toLocaleString() : '-'}</td>
            <td>
                <button class="btn-action edit" onclick="editBlacklistRule(${rule.id})">编辑</button>
                <button class="btn-action delete" onclick="deleteBlacklistRule(${rule.id}, '${escapeHtml(rule.rule_name)}')">删除</button>
            </td>
        </tr>
    `).join('');
}

function showAddBlacklistModal() {
    document.getElementById('blacklistModalTitle').textContent = '添加黑名单规则';
    document.getElementById('blacklistForm').reset();
    document.getElementById('blacklistRuleId').value = '';
    document.getElementById('blacklistEnabled').checked = true;
    document.getElementById('blacklistModal').classList.add('show');
}

function editBlacklistRule(ruleId) {
    const rule = allBlacklistRules.find(r => r.id === ruleId);
    if (!rule) return;
    
    document.getElementById('blacklistModalTitle').textContent = '编辑黑名单规则';
    document.getElementById('blacklistRuleId').value = rule.id;
    document.getElementById('blacklistRuleName').value = rule.rule_name || '';
    document.getElementById('blacklistClientPattern').value = rule.client_pattern || '';
    document.getElementById('blacklistDevicePattern').value = rule.device_name_pattern || '';
    document.getElementById('blacklistAction').value = rule.action || 'stop_only';
    document.getElementById('blacklistDescription').value = rule.description || '';
    document.getElementById('blacklistEnabled').checked = rule.is_enabled;
    
    document.getElementById('blacklistModal').classList.add('show');
}

function closeBlacklistModal() {
    document.getElementById('blacklistModal').classList.remove('show');
}

async function saveBlacklistRule(event) {
    event.preventDefault();
    
    const ruleId = document.getElementById('blacklistRuleId').value;
    const data = {
        rule_name: document.getElementById('blacklistRuleName').value,
        client_pattern: document.getElementById('blacklistClientPattern').value,
        device_name_pattern: document.getElementById('blacklistDevicePattern').value,
        action: document.getElementById('blacklistAction').value,
        description: document.getElementById('blacklistDescription').value,
        is_enabled: document.getElementById('blacklistEnabled').checked
    };
    
    try {
        const url = ruleId ? `/api/admin/device-blacklist/${ruleId}` : '/api/admin/device-blacklist';
        const method = ruleId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('保存成功', ruleId ? '规则已更新' : '规则已创建', 'success');
            closeBlacklistModal();
            loadBlacklist();
        } else {
            showToast('保存失败', result.error || '请稍后重试', 'error');
        }
    } catch (error) {
        console.error('保存黑名单规则失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

async function deleteBlacklistRule(ruleId, ruleName) {
    const confirmed = await showConfirm({
        title: '删除黑名单规则',
        message: `确定要删除规则 "${ruleName}" 吗？`,
        confirmText: '删除',
        type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/device-blacklist/${ruleId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('删除成功', '规则已删除', 'success');
            loadBlacklist();
        } else {
            showToast('删除失败', result.error || '请稍后重试', 'error');
        }
    } catch (error) {
        console.error('删除黑名单规则失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// ==================== 用户详情功能 ====================
let currentDetailUserId = null;
let activityPage = 1;

async function showUserDetail(userId) {
    currentDetailUserId = userId;
    activityPage = 1;
    
    document.getElementById('userDetailModal').style.display = 'flex';
    document.getElementById('userDetailTitle').textContent = '用户详情';
    
    // 重置标签页
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector('.tab-btn').classList.add('active');
    document.getElementById('tab-info').classList.add('active');
    
    // 加载用户详情
    await loadUserDetails(userId);
}

function closeUserDetailModal() {
    document.getElementById('userDetailModal').style.display = 'none';
    currentDetailUserId = null;
}

function switchUserDetailTab(tabName) {
    // 切换标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // 切换内容区域
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 根据标签加载数据
    if (tabName === 'activity' && currentDetailUserId) {
        loadUserActivityLogs();
    }
}

async function loadUserDetails(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/details`);
        const result = await response.json();
        
        if (!result.success) {
            showToast('加载失败', result.error, 'error');
            return;
        }
        
        const user = result.user;
        document.getElementById('userDetailTitle').textContent = `用户详情 - ${user.name}`;
        
        // 渲染基本信息
        const levelClass = user.level === 'c' ? 'status-banned' : (user.level === 'a' ? 'status-active' : '');
        document.getElementById('userInfoContent').innerHTML = `
            <div class="info-item">
                <div class="label">用户名</div>
                <div class="value">${user.name}</div>
            </div>
            <div class="info-item">
                <div class="label">Telegram ID</div>
                <div class="value">${user.telegram_id ? user.telegram_id : '<span style="color:#999;">未绑定</span>'}</div>
            </div>
            <div class="info-item">
                <div class="label">Emby 账号</div>
                <div class="value">${user.emby_name || user.emby_id || '<span style="color:#999;">未绑定</span>'}</div>
            </div>
            <div class="info-item">
                <div class="label">用户等级</div>
                <div class="value ${levelClass}">${user.level_name}</div>
            </div>
            <div class="info-item">
                <div class="label">BOT管理员</div>
                <div class="value">${user.is_bot_admin ? '✅ 是' : '❌ 否'}</div>
            </div>
            <div class="info-item">
                <div class="label">${result.coin_name || '积分'}</div>
                <div class="value" style="color: #f39c12; font-weight: bold;">🪙 ${user.coins || 0}</div>
            </div>
            <div class="info-item">
                <div class="label">订阅到期</div>
                <div class="value">${user.expires_at ? new Date(user.expires_at).toLocaleString('zh-CN') : '无订阅'}</div>
            </div>
            <div class="info-item">
                <div class="label">注册时间</div>
                <div class="value">${user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}</div>
            </div>
            <div class="info-item">
                <div class="label">邀请人数</div>
                <div class="value">${user.invite_count}</div>
            </div>
            ${user.ban_time ? `
            <div class="info-item" style="grid-column: span 2;">
                <div class="label">封禁信息</div>
                <div class="value status-banned">
                    封禁时间: ${new Date(user.ban_time).toLocaleString('zh-CN')}<br>
                    封禁原因: ${user.ban_reason || '未知'}
                </div>
            </div>
            ` : ''}
            <div class="info-item" style="grid-column: span 3;">
                <div class="label">管理操作</div>
                <div class="value user-actions-row" style="flex-wrap: wrap; gap: 8px;">
                    <button class="btn btn-secondary btn-sm" onclick="resetUserPassword(${userId})">🔑 重置密码</button>
                    <button class="btn btn-secondary btn-sm" onclick="giftUserSubscription(${userId})">🎁 赠送订阅</button>
                    <button class="btn btn-warning btn-sm" onclick="reduceUserSubscription(${userId})">⏳ 减少订阅</button>
                    <button class="btn btn-success btn-sm" onclick="adjustUserCoins(${userId}, 'add', '${result.coin_name || '积分'}')">💰 增加${result.coin_name || '积分'}</button>
                    <button class="btn btn-warning btn-sm" onclick="adjustUserCoins(${userId}, 'reduce', '${result.coin_name || '积分'}')">💸 减少${result.coin_name || '积分'}</button>
                    ${!user.is_admin ? `<button class="btn btn-danger btn-sm" onclick="deleteUserAccount(${userId}, '${user.name}')">🗑️ 删除账号</button>` : ''}
                </div>
            </div>
        `;
        
        // 渲染订阅记录
        if (result.subscriptions.length > 0) {
            document.getElementById('subscriptionsContent').innerHTML = result.subscriptions.map(sub => `
                <div class="list-item">
                    <div class="list-item-main">
                        <div class="list-item-title">${sub.plan_name}</div>
                        <div class="list-item-subtitle">
                            ${sub.start_date ? new Date(sub.start_date).toLocaleDateString('zh-CN') : ''} - 
                            ${sub.end_date ? new Date(sub.end_date).toLocaleDateString('zh-CN') : ''}
                        </div>
                    </div>
                    <span class="list-item-badge ${sub.status}">${sub.status === 'active' ? '有效' : (sub.status === 'suspended' ? '已暂停' : '已过期')}</span>
                </div>
            `).join('');
        } else {
            document.getElementById('subscriptionsContent').innerHTML = '<div class="list-empty">暂无订阅记录</div>';
        }
        
        // 渲染设备列表
        if (result.devices.length > 0) {
            document.getElementById('devicesContent').innerHTML = result.devices.map(device => `
                <div class="list-item">
                    <div class="list-item-main">
                        <div class="list-item-title">${device.device_name || '未知设备'}</div>
                        <div class="list-item-subtitle">
                            ${device.client || ''} | IP: ${device.last_ip || '未知'} | 
                            最后活跃: ${device.last_active ? new Date(device.last_active).toLocaleString('zh-CN') : '-'}
                        </div>
                    </div>
                    ${device.is_blocked ? '<span class="list-item-badge blocked">已封禁</span>' : ''}
                </div>
            `).join('');
        } else {
            document.getElementById('devicesContent').innerHTML = '<div class="list-empty">暂无设备记录</div>';
        }
        
        // 渲染求片记录
        if (result.requests.length > 0) {
            const statusMap = {
                'pending': '待处理',
                'approved': '已批准',
                'completed': '已完成',
                'rejected': '已拒绝',
                'downloading': '下载中',
                'downloaded': '已下载',
                'failed': '失败'
            };
            document.getElementById('requestsContent').innerHTML = result.requests.map(req => `
                <div class="list-item">
                    <div class="list-item-main">
                        <div class="list-item-title">${req.title} (${req.year || ''})</div>
                        <div class="list-item-subtitle">
                            ${req.media_type === 'tv' ? '📺 剧集' : '🎬 电影'} | 
                            ${req.created_at ? new Date(req.created_at).toLocaleString('zh-CN') : ''}
                        </div>
                    </div>
                    <span class="list-item-badge ${req.status}">${statusMap[req.status] || req.status}</span>
                </div>
            `).join('');
        } else {
            document.getElementById('requestsContent').innerHTML = '<div class="list-empty">暂无求片记录</div>';
        }
        
    } catch (error) {
        console.error('加载用户详情失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// 重置用户密码
async function resetUserPassword(userId) {
    const newPassword = await showPrompt({
        title: '🔐 重置用户密码',
        message: '请输入新密码（留空则自动生成随机密码）',
        placeholder: '留空自动生成随机密码',
        defaultValue: '',
        confirmText: '确认重置',
        cancelText: '取消',
        type: 'warning'
    });
    if (newPassword === null) return; // 用户取消
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', `密码已重置为: ${result.new_password}`, 'success');
            // 复制新密码到剪贴板
            if (navigator.clipboard) {
                navigator.clipboard.writeText(result.new_password);
                showToast('提示', '新密码已复制到剪贴板', 'info');
            }
        } else {
            showToast('错误', result.error || '重置密码失败', 'error');
        }
    } catch (error) {
        console.error('重置密码失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// 赠送用户订阅
async function giftUserSubscription(userId) {
    const days = await showPrompt({
        title: '🎁 赠送订阅',
        message: '请输入赠送的天数',
        placeholder: '请输入天数',
        defaultValue: '30',
        confirmText: '确认赠送',
        cancelText: '取消',
        type: 'info'
    });
    if (!days || isNaN(days) || parseInt(days) <= 0) {
        if (days !== null) showToast('错误', '请输入有效的天数', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/gift-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration_months: Math.ceil(parseInt(days) / 30), duration_days: parseInt(days) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message || '订阅赠送成功', 'success');
            loadUserDetails(userId);
        } else {
            showToast('错误', result.error || '赠送订阅失败', 'error');
        }
    } catch (error) {
        console.error('赠送订阅失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// 减少用户订阅
async function reduceUserSubscription(userId) {
    const days = await showPrompt({
        title: '⏳ 减少订阅',
        message: '请输入要减少的天数',
        placeholder: '请输入天数',
        defaultValue: '1',
        confirmText: '确认减少',
        cancelText: '取消',
        type: 'warning'
    });
    if (!days || isNaN(days) || parseInt(days) <= 0) {
        if (days !== null) showToast('错误', '请输入有效的天数', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/reduce-subscription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration_days: parseInt(days) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message || '订阅时间已减少', 'success');
            loadUserDetails(userId);
        } else {
            showToast('错误', result.error || '减少订阅失败', 'error');
        }
    } catch (error) {
        console.error('减少订阅失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// 调整用户积分
async function adjustUserCoins(userId, action, coinName) {
    const isAdd = action === 'add';
    const amount = await showPrompt({
        title: isAdd ? `💰 增加${coinName}` : `💸 减少${coinName}`,
        message: `请输入要${isAdd ? '增加' : '减少'}的${coinName}数量`,
        placeholder: `请输入${coinName}数量`,
        defaultValue: '10',
        confirmText: isAdd ? '确认增加' : '确认减少',
        cancelText: '取消',
        type: isAdd ? 'info' : 'warning'
    });
    if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
        if (amount !== null) showToast('错误', '请输入有效的数量', 'error');
        return;
    }
    
    const reason = await showPrompt({
        title: '备注原因',
        message: `请输入${isAdd ? '增加' : '减少'}${coinName}的原因（可选）`,
        placeholder: '例如：活动奖励、系统补偿等',
        defaultValue: isAdd ? '管理员奖励' : '管理员扣除',
        confirmText: '确认',
        cancelText: '取消',
        type: 'info'
    });
    if (reason === null) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/adjust-coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: action,
                amount: parseInt(amount),
                reason: reason || (isAdd ? '管理员奖励' : '管理员扣除')
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message || `${coinName}已${isAdd ? '增加' : '减少'}`, 'success');
            loadUserDetails(userId);
        } else {
            showToast('错误', result.error || `${isAdd ? '增加' : '减少'}${coinName}失败`, 'error');
        }
    } catch (error) {
        console.error('调整积分失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

// 删除用户账号
async function deleteUserAccount(userId, userName) {
    const confirmed = await showConfirm({
        title: '⚠️ 删除用户确认',
        message: `确定要删除用户 "${userName}" 的账号吗？\n\n此操作将：\n- 删除用户所有数据\n- 删除关联的 Emby 账号\n- 此操作不可恢复！`,
        confirmText: '确定删除',
        cancelText: '取消',
        type: 'danger'
    });
    if (!confirmed) return;
    
    // 二次确认
    const confirmed2 = await showConfirm({
        title: '最终确认',
        message: '请再次确认：此操作不可恢复，确定要继续吗？',
        confirmText: '确定继续',
        cancelText: '取消',
        type: 'danger'
    });
    if (!confirmed2) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/delete`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message || '用户已删除', 'success');
            closeUserDetailModal();
            loadUsers(); // 刷新用户列表
        } else {
            showToast('错误', result.error || '删除用户失败', 'error');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showToast('网络错误', '请检查网络连接', 'error');
    }
}

async function loadUserActivityLogs() {
    if (!currentDetailUserId) return;
    
    const actionType = document.getElementById('activityTypeFilter')?.value || '';
    
    try {
        const response = await fetch(`/api/admin/users/${currentDetailUserId}/activity-logs?page=${activityPage}&action_type=${actionType}`);
        const result = await response.json();
        
        if (!result.success) {
            document.getElementById('activityLogContent').innerHTML = '<div class="list-empty">加载失败</div>';
            return;
        }
        
        if (result.logs.length === 0) {
            document.getElementById('activityLogContent').innerHTML = '<div class="list-empty">暂无操作记录</div>';
            document.getElementById('activityPagination').innerHTML = '';
            return;
        }
        
        // 渲染操作记录
        document.getElementById('activityLogContent').innerHTML = result.logs.map(log => `
            <div class="activity-item">
                <div class="activity-icon ${log.status}">${log.action_type_display.split(' ')[0]}</div>
                <div class="activity-content">
                    <div class="activity-type">${log.action_type_display}</div>
                    <div class="activity-detail">${log.action_detail || '-'}</div>
                    <div class="activity-meta">
                        <span>🕐 ${log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}</span>
                        <span>🌐 ${log.ip_address || '-'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 渲染分页
        const { page, total_pages } = result.pagination;
        let paginationHtml = '';
        
        if (total_pages > 1) {
            paginationHtml += `<button ${page <= 1 ? 'disabled' : ''} onclick="changeActivityPage(${page - 1})">上一页</button>`;
            paginationHtml += `<span>第 ${page} / ${total_pages} 页</span>`;
            paginationHtml += `<button ${page >= total_pages ? 'disabled' : ''} onclick="changeActivityPage(${page + 1})">下一页</button>`;
        }
        
        document.getElementById('activityPagination').innerHTML = paginationHtml;
        
    } catch (error) {
        console.error('加载操作日志失败:', error);
        document.getElementById('activityLogContent').innerHTML = '<div class="list-empty">加载失败</div>';
    }
}

function changeActivityPage(page) {
    activityPage = page;
    loadUserActivityLogs();
}

// ==================== 全局操作日志 ====================
let allLogsPage = 1;
let allLogsSearchTimer = null;

async function loadAllActivityLogs(page = 1) {
    allLogsPage = page;
    
    const actionType = document.getElementById('logActionFilter')?.value || '';
    const userName = document.getElementById('logUserSearch')?.value || '';
    const status = document.getElementById('logStatusFilter')?.value || '';
    
    const container = document.getElementById('activityLogsList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-cell">加载中...</div>';
    
    try {
        const response = await fetch(`/api/admin/activity-logs?page=${page}&per_page=30&action_type=${actionType}&user_name=${encodeURIComponent(userName)}&status=${status}`);
        const result = await response.json();
        
        if (!result.success) {
            container.innerHTML = '<div class="empty-state">加载失败</div>';
            return;
        }
        
        if (result.logs.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 暂无操作记录</div>';
            document.getElementById('activityLogsPagination').innerHTML = '';
            return;
        }
        
        // 渲染卡片式日志列表
        container.innerHTML = result.logs.map(log => `
            <div class="activity-log-card ${log.status === 'failed' ? 'failed' : ''}">
                <div class="log-main">
                    <div class="log-icon">${getActionIcon(log.action_type)}</div>
                    <div class="log-content">
                        <div class="log-header">
                            <span class="log-user">${escapeHtml(log.user_name) || '未知用户'}</span>
                            <span class="log-action">${log.action_type_display || log.action_type}</span>
                        </div>
                        <div class="log-detail">${escapeHtml(log.action_detail) || '-'}</div>
                    </div>
                    <div class="log-meta">
                        <div class="log-time">${log.created_at || '-'}</div>
                        <div class="log-ip">${log.ip_address || '-'}</div>
                        <span class="log-status ${log.status}">${log.status === 'success' ? '✓' : '✗'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 渲染分页
        renderAllLogsPagination(result.pagination);
        
    } catch (error) {
        console.error('加载操作日志失败:', error);
        container.innerHTML = '<div class="empty-state">网络错误</div>';
    }
}

function getActionIcon(actionType) {
    const icons = {
        'login': '🔐',
        'logout': '🚪',
        'register': '📝',
        'password_change': '🔑',
        'request_movie': '🎬',
        'cancel_request': '❌',
        'redeem_code': '🎟️',
        'create_order': '🛒',
        'payment_success': '💳',
        'payment_failed': '❌',
        'submit_ticket': '🎫',
        'reply_ticket': '💬',
        'account_banned': '⛔',
        'account_unbanned': '✅',
        'level_change': '📊',
        'view_lines': '🔗'
    };
    return icons[actionType] || '📋';
}

function renderAllLogsPagination(pagination) {
    const container = document.getElementById('activityLogsPagination');
    if (!container) return;
    
    const { page, total_pages, total } = pagination;
    
    if (total_pages <= 1) {
        container.innerHTML = `<span class="pagination-info">共 ${total} 条记录</span>`;
        return;
    }
    
    let html = `<span class="pagination-info">共 ${total} 条记录</span>`;
    html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="loadAllActivityLogs(${page - 1})">上一页</button>`;
    html += `<span class="page-info">第 ${page} / ${total_pages} 页</span>`;
    html += `<button class="page-btn" ${page >= total_pages ? 'disabled' : ''} onclick="loadAllActivityLogs(${page + 1})">下一页</button>`;
    
    container.innerHTML = html;
}

function searchActivityLogs() {
    // 防抖
    if (allLogsSearchTimer) {
        clearTimeout(allLogsSearchTimer);
    }
    allLogsSearchTimer = setTimeout(() => {
        loadAllActivityLogs(1);
    }, 300);
}

function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ==================== 系统公告管理 ====================
let allAnnouncements = [];

async function loadAnnouncements() {
    const listContainer = document.getElementById('announcementsListCompact');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="loading-placeholder">加载中...</div>';
    
    try {
        const response = await fetch('/api/admin/announcements');
        const data = await response.json();
        
        if (data.success) {
            allAnnouncements = data.announcements || [];
            renderAnnouncements();
            // 更新状态
            const statusEl = document.getElementById('announcementsStatus');
            if (statusEl) {
                const activeCount = allAnnouncements.filter(a => a.is_active).length;
                statusEl.textContent = `${activeCount}/${allAnnouncements.length} 条启用`;
            }
        } else {
            listContainer.innerHTML = `<div class="error-text">加载失败: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('加载公告失败:', error);
        listContainer.innerHTML = '<div class="error-text">加载失败</div>';
    }
}

function renderAnnouncements() {
    const listContainer = document.getElementById('announcementsListCompact');
    if (!listContainer) return;
    
    if (allAnnouncements.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state-compact">
                <div class="empty-icon">📢</div>
                <div>暂无公告，点击上方按钮发布</div>
            </div>
        `;
        return;
    }
    
    const typeIcons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'success': '✅',
        'error': '❌'
    };
    
    listContainer.innerHTML = allAnnouncements.map(a => `
        <div class="announcement-item-compact type-${a.type} ${!a.is_active ? 'inactive' : ''}">
            <div class="announcement-item-info">
                <span class="announcement-item-icon">${typeIcons[a.type] || 'ℹ️'}</span>
                <div class="announcement-item-details">
                    <div class="announcement-item-title">
                        ${escapeHtml(a.title)}
                        ${a.is_pinned ? '<span class="pinned">📌</span>' : ''}
                    </div>
                    <div class="announcement-item-meta">
                        <span>${formatDateTime(a.created_at)}</span>
                        <span>${a.end_time ? '有效期至 ' + formatDateTime(a.end_time) : '永久有效'}</span>
                    </div>
                </div>
            </div>
            <div class="announcement-item-badges">
                <span class="announcement-badge-mini ${a.is_active ? 'active' : 'inactive'}">${a.is_active ? '启用' : '禁用'}</span>
            </div>
            <div class="announcement-item-actions">
                <button class="btn-edit" onclick="editAnnouncement(${a.id})">编辑</button>
                <button class="btn-toggle" onclick="toggleAnnouncement(${a.id})">${a.is_active ? '禁用' : '启用'}</button>
                <button class="btn-delete" onclick="deleteAnnouncement(${a.id})">删除</button>
            </div>
        </div>
    `).join('');
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openAnnouncementModal(id = null) {
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
    document.getElementById('announcementType').value = 'info';
    document.getElementById('announcementPinned').checked = false;
    document.getElementById('announcementStartTime').value = '';
    document.getElementById('announcementEndTime').value = '';
    document.getElementById('announcementModalTitle').textContent = '📢 发布公告';
    
    document.getElementById('announcementModalOverlay').style.display = 'flex';
}

function closeAnnouncementModal() {
    document.getElementById('announcementModalOverlay').style.display = 'none';
}

function editAnnouncement(id) {
    const announcement = allAnnouncements.find(a => a.id === id);
    if (!announcement) return;
    
    document.getElementById('announcementId').value = announcement.id;
    document.getElementById('announcementTitle').value = announcement.title;
    document.getElementById('announcementContent').value = announcement.content;
    document.getElementById('announcementType').value = announcement.type;
    document.getElementById('announcementPinned').checked = announcement.is_pinned;
    
    // 处理时间
    if (announcement.start_time) {
        const startDate = new Date(announcement.start_time);
        document.getElementById('announcementStartTime').value = formatDateTimeLocal(startDate);
    } else {
        document.getElementById('announcementStartTime').value = '';
    }
    
    if (announcement.end_time) {
        const endDate = new Date(announcement.end_time);
        document.getElementById('announcementEndTime').value = formatDateTimeLocal(endDate);
    } else {
        document.getElementById('announcementEndTime').value = '';
    }
    
    document.getElementById('announcementModalTitle').textContent = '✏️ 编辑公告';
    document.getElementById('announcementModalOverlay').style.display = 'flex';
}

function formatDateTimeLocal(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function saveAnnouncement() {
    const id = document.getElementById('announcementId').value;
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const type = document.getElementById('announcementType').value;
    const is_pinned = document.getElementById('announcementPinned').checked;
    const startTime = document.getElementById('announcementStartTime').value;
    const endTime = document.getElementById('announcementEndTime').value;
    
    if (!title || !content) {
        showToast('错误', '标题和内容不能为空', 'error');
        return;
    }
    
    const data = {
        title,
        content,
        type,
        is_pinned,
        is_active: true,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null
    };
    
    try {
        const url = id ? `/api/admin/announcements/${id}` : '/api/admin/announcements';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', id ? '公告更新成功' : '公告发布成功', 'success');
            closeAnnouncementModal();
            loadAnnouncements();
        } else {
            showToast('错误', result.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存公告失败:', error);
        showToast('错误', '操作失败', 'error');
    }
}

async function toggleAnnouncement(id) {
    try {
        const response = await fetch(`/api/admin/announcements/${id}/toggle`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message, 'success');
            loadAnnouncements();
        } else {
            showToast('错误', result.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换公告状态失败:', error);
        showToast('错误', '操作失败', 'error');
    }
}

async function deleteAnnouncement(id) {
    const confirmed = await showConfirm({
        title: '删除公告',
        message: '确定要删除这条公告吗？',
        confirmText: '确定删除',
        cancelText: '取消',
        type: 'danger'
    });
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/announcements/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', '公告已删除', 'success');
            loadAnnouncements();
        } else {
            showToast('错误', result.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除公告失败:', error);
        showToast('错误', '删除失败', 'error');
    }
}

// ==================== 知识库管理 ====================
let knowledgeList = [];
let knowledgeCategories = [];

async function loadKnowledge() {
    try {
        const response = await fetch('/api/admin/knowledge');
        const result = await response.json();
        
        if (result.success) {
            knowledgeList = result.items || [];
            renderKnowledgeList();
        }
        
        // 加载分类
        await loadKnowledgeCategories();
    } catch (error) {
        console.error('加载知识库失败:', error);
        showToast('错误', '加载知识库失败', 'error');
    }
}

async function loadKnowledgeCategories() {
    try {
        const response = await fetch('/api/admin/knowledge/categories');
        const result = await response.json();
        
        if (result.success) {
            knowledgeCategories = result.categories || [];
            updateCategorySelects();
        }
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

function updateCategorySelects() {
    // 更新筛选下拉框
    const filterSelect = document.getElementById('knowledgeCategoryFilter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">全部分类</option>' +
            knowledgeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
    
    // 更新编辑弹窗下拉框
    const editSelect = document.getElementById('knowledgeCategory');
    if (editSelect) {
        editSelect.innerHTML = knowledgeCategories.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
    }
}

function renderKnowledgeList(items = null) {
    const list = items || knowledgeList;
    const container = document.getElementById('knowledgeList');
    
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📚</span>
                <p>暂无知识库条目</p>
                <button class="btn-primary" onclick="openAddKnowledgeModal()">添加第一条</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = list.map(item => {
        const category = knowledgeCategories.find(c => c.id === item.category);
        const categoryName = category ? category.name : item.category;
        
        return `
            <div class="knowledge-item" data-id="${item.id}">
                <div class="knowledge-item-header">
                    <div class="knowledge-item-info">
                        <span class="knowledge-item-category">${categoryName}</span>
                        <h4 class="knowledge-item-question">${escapeHtml(item.question)}</h4>
                        <div class="knowledge-item-answer">${item.answer.substring(0, 150)}${item.answer.length > 150 ? '...' : ''}</div>
                    </div>
                    <div class="knowledge-item-actions">
                        <button class="btn-edit" onclick="openEditKnowledgeModal(${item.id})">✏️ 编辑</button>
                        <button class="btn-delete" onclick="openDeleteKnowledgeModal(${item.id})">🗑️ 删除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function searchKnowledge() {
    const keyword = document.getElementById('knowledgeSearch').value.toLowerCase().trim();
    const category = document.getElementById('knowledgeCategoryFilter').value;
    
    let filtered = knowledgeList;
    
    if (keyword) {
        filtered = filtered.filter(item => 
            item.question.toLowerCase().includes(keyword) ||
            item.answer.toLowerCase().includes(keyword)
        );
    }
    
    if (category) {
        filtered = filtered.filter(item => item.category === category);
    }
    
    renderKnowledgeList(filtered);
}

function filterKnowledgeByCategory() {
    searchKnowledge();
}

function openAddKnowledgeModal() {
    document.getElementById('knowledgeModalTitle').textContent = '添加知识库条目';
    document.getElementById('knowledgeItemId').value = '';
    document.getElementById('knowledgeCategory').value = 'account';
    document.getElementById('knowledgeQuestion').value = '';
    document.getElementById('knowledgeAnswer').value = '';
    document.getElementById('knowledgeModal').style.display = 'flex';
}

function openEditKnowledgeModal(id) {
    const item = knowledgeList.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('knowledgeModalTitle').textContent = '编辑知识库条目';
    document.getElementById('knowledgeItemId').value = id;
    document.getElementById('knowledgeCategory').value = item.category || 'other';
    document.getElementById('knowledgeQuestion').value = item.question;
    document.getElementById('knowledgeAnswer').value = item.answer;
    document.getElementById('knowledgeModal').style.display = 'flex';
}

function closeKnowledgeModal() {
    document.getElementById('knowledgeModal').style.display = 'none';
}

async function saveKnowledgeItem() {
    const id = document.getElementById('knowledgeItemId').value;
    const category = document.getElementById('knowledgeCategory').value;
    const question = document.getElementById('knowledgeQuestion').value.trim();
    const answer = document.getElementById('knowledgeAnswer').value.trim();
    
    if (!question || !answer) {
        showToast('错误', '问题和答案不能为空', 'error');
        return;
    }
    
    try {
        let response;
        if (id) {
            // 更新
            response = await fetch(`/api/admin/knowledge/item/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, question, answer })
            });
        } else {
            // 新增
            response = await fetch('/api/admin/knowledge/item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, question, answer })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', result.message, 'success');
            closeKnowledgeModal();
            loadKnowledge();
        } else {
            showToast('错误', result.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存知识库条目失败:', error);
        showToast('错误', '保存失败', 'error');
    }
}

function openDeleteKnowledgeModal(id) {
    document.getElementById('deleteKnowledgeId').value = id;
    document.getElementById('deleteKnowledgeModal').style.display = 'flex';
}

function closeDeleteKnowledgeModal() {
    document.getElementById('deleteKnowledgeModal').style.display = 'none';
}

async function confirmDeleteKnowledge() {
    const id = document.getElementById('deleteKnowledgeId').value;
    
    try {
        const response = await fetch(`/api/admin/knowledge/item/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', '删除成功', 'success');
            closeDeleteKnowledgeModal();
            loadKnowledge();
        } else {
            showToast('错误', result.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除知识库条目失败:', error);
        showToast('错误', '删除失败', 'error');
    }
}

// 分类管理
function openCategoryModal() {
    renderCategoryList();
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

function renderCategoryList() {
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    container.innerHTML = knowledgeCategories.map(c => `
        <div class="category-item" data-id="${c.id}">
            <div class="category-item-info">
                <span class="category-item-id">${c.id}</span>
                <span class="category-item-name">${c.name}</span>
            </div>
            <button onclick="removeCategory('${c.id}')">删除</button>
        </div>
    `).join('');
}

function addCategory() {
    const id = document.getElementById('newCategoryId').value.trim();
    const name = document.getElementById('newCategoryName').value.trim();
    
    if (!id || !name) {
        showToast('错误', '分类ID和名称不能为空', 'error');
        return;
    }
    
    if (knowledgeCategories.some(c => c.id === id)) {
        showToast('错误', '分类ID已存在', 'error');
        return;
    }
    
    knowledgeCategories.push({ id, name });
    renderCategoryList();
    
    document.getElementById('newCategoryId').value = '';
    document.getElementById('newCategoryName').value = '';
}

function removeCategory(id) {
    knowledgeCategories = knowledgeCategories.filter(c => c.id !== id);
    renderCategoryList();
}

async function saveCategories() {
    try {
        const response = await fetch('/api/admin/knowledge/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: knowledgeCategories })
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('成功', '分类保存成功', 'success');
            closeCategoryModal();
            updateCategorySelects();
        } else {
            showToast('错误', result.error || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存分类失败:', error);
        showToast('错误', '保存失败', 'error');
    }
}
