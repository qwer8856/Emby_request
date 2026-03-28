// Service Worker for PWA
const CACHE_NAME = 'emby-request-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/static/css/common.css',
  '/static/css/dashboard.css',
  '/static/js/common.js',
  '/static/js/dashboard.js'
];

// 安装 Service Worker - 逐个缓存，跳过失败的资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('SW: 缓存失败，跳过:', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求 - 网络优先策略
self.addEventListener('fetch', (event) => {
  // 只缓存 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 跳过 API 请求
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/search') ||
      event.request.url.includes('/trending') ||
      event.request.url.includes('/request-movie')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功获取网络响应，缓存并返回
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试从缓存获取
        return caches.match(event.request);
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '您有新的通知',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '求片系统通知', options)
    );
  }
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  );
});
