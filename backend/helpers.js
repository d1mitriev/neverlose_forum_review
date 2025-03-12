const puppeteer = require('puppeteer');

async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,720'
    ],
    defaultViewport: { width: 1280, height: 720 }
  });
}
async function retry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 1.5);
  }
}
function extractPostInfoFromUrl(url) {
  try {
    const regex = /\/t\/.*?\/(\d+)\/(\d+)(?:\?|$)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
      return {
        topicId: match[1],
        postNumber: parseInt(match[2])
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при извлечении информации из URL:', error);
    return null;
  }
}
function normalizeUrl(url, baseUrl = 'https://forum.neverlose.cc') {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return baseUrl + url;
  return baseUrl + '/' + url;
}

module.exports = {
  launchBrowser,
  retry,
  extractPostInfoFromUrl,
  normalizeUrl
}; 