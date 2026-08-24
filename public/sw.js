self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (evento) => {
  evento.respondWith(fetch(evento.request))
})

self.addEventListener('push', (evento) => {
  let dados = {}

  try {
    dados = evento.data ? evento.data.json() : {}
  } catch (e) {
    dados = {}
  }

  const titulo = dados.titulo || '🚨 Pedido de ajuda'
  const corpo = dados.corpo || 'Alguém da sua confiança pediu ajuda pela Aurora.'

  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: 'aurora-sos',
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 150, 400, 150, 400],
      data: { url: '/' },
    })
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) return janela.focus()
      }

      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})
