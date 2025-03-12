const server = require('./server');
const fs = require('fs');
const path = require('path');

function checkRequiredFiles() {
  const cacheFile = path.join(__dirname, 'reviewsCache.json');
  const envFile = path.join(__dirname, '.env');
  
  if (!fs.existsSync(cacheFile)) {
    console.log('Кэш-файл не найден, создаем новый...');
    fs.writeFileSync(cacheFile, '[]', 'utf8');
  }
  
  if (!fs.existsSync(envFile)) {
    console.warn('ВНИМАНИЕ: Файл .env не найден, используются стандартные значения');
    // Для теста
    const envContent = 
`PORT=3000
FORUM_URL=https://forum.neverlose.cc/t/24-7-unique-resell-ua-ru-kz-ua-cards-ru-cards-kz-cards-binance-pay-bybit-uid-htx-id/519874`;
    fs.writeFileSync(envFile, envContent, 'utf8');
  }
}

checkRequiredFiles();

server.start(); 