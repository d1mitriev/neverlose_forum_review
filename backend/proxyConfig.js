/**
 * Конфигурация прокси для работы с NST-прокси
 */
module.exports = {
  enabled: true,
  
  nstProxies: [
    'gate.nstproxy.io:24125:C8EE5E71EAA30E84-residential-country_UA-r_10m-s_4segITXZew:ebaaat'
  ],
  list: [],
  currentIndex: 0,
  env: process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [],
  init() {
    this.list = [...this.nstProxies];
    return this;
  },
  getCurrentProxy() {
    const allProxies = [...this.nstProxies, ...this.env].filter(p => p && p.trim());
    return allProxies.length > 0 ? allProxies[this.currentIndex] : null;
  },
  rotateProxy() {
    const allProxies = [...this.nstProxies, ...this.env].filter(p => p && p.trim());
    if (allProxies.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % allProxies.length;
    }
    return this.getCurrentProxy();
  },
  parseNstProxy(proxyStr) {
    if (!proxyStr) return null;
    
    const parts = proxyStr.split(':');
    if (parts.length !== 4) {
      console.error('Неверный формат прокси NST');
      return null;
    }
    
    return {
      host: parts[0],
      port: parts[1],
      username: parts[2],
      password: parts[3]
    };
  },
  applyToAxios(axiosConfig) {
    if (!this.enabled) {
      console.log('Использование прокси отключено');
      return axiosConfig;
    }
    
    const proxyStr = this.getCurrentProxy();
    if (!proxyStr) {
      console.log('Нет доступных прокси');
      return axiosConfig;
    }
    
    console.log(`Используем прокси NST: ${proxyStr.split(':')[0]}:${proxyStr.split(':')[1]}`);
    
    try {
      const proxy = this.parseNstProxy(proxyStr);
      
      if (proxy) {
        axiosConfig.proxy = {
          host: proxy.host,
          port: parseInt(proxy.port),
          protocol: 'http'
        };
        axiosConfig.headers = {
          ...axiosConfig.headers,
          'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
        };
        
        console.log('Прокси успешно настроен');
      }
    } catch (error) {
      console.error('Ошибка при настройке прокси:', error.message);
    }
    
    return axiosConfig;
  },
  logSuccess(details = '') {
    const proxyStr = this.getCurrentProxy();
    const proxyInfo = proxyStr ? `${proxyStr.split(':')[0]}:${proxyStr.split(':')[1]}` : 'неизвестный прокси';
    console.log(`[Прокси] Успешное подключение через ${proxyInfo} ${details ? ': ' + details : ''}`);
  },
  
  logError(error) {
    const proxyStr = this.getCurrentProxy();
    const proxyInfo = proxyStr ? `${proxyStr.split(':')[0]}:${proxyStr.split(':')[1]}` : 'неизвестный прокси';
    console.error(`[Прокси] Ошибка подключения через ${proxyInfo}: ${error.message}`);
    this.rotateProxy();
  }
}.init();