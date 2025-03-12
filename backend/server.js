const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const proxyConfig = require('./proxyConfig');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const reviewsCacheFile = path.join(__dirname, 'reviewsCache.json');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const forumConfig = {
    forumUrl: process.env.FORUM_URL || 'https://forum.neverlose.cc/t/24-7-unique-resell-ua-ru-kz-ua-cards-ru-cards-kz-cards-binance-pay-bybit-uid-htx-id/519874',
    postsPerPage: 20
};
const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  PARSING: 'PARSING_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  AUTH: 'AUTH_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};
const { window } = new JSDOM('');
global.document = window.document;
async function loadReviewsCache() {
    try {
        const data = await fs.readFile(reviewsCacheFile, 'utf8');
        const cache = JSON.parse(data) || [];
        
        
        cache.forEach((review, index) => {
            if (!review.postNumber) {
                review.postNumber = (2000 + index).toString();
            }
        });
        
        return cache;
    } catch (error) {
        console.error('Ошибка при загрузке кэша комментариев:', error);
        return [];
    }
}
async function saveReviewsCache(cache) {
    try {
        await fs.writeFile(reviewsCacheFile, JSON.stringify(cache, null, 2), 'utf8');
        console.log(`Кэш комментариев обновлен, всего ${cache.length} комментариев`);
    } catch (error) {
        console.error('Ошибка при сохранении кэша комментариев:', error);
    }
}
async function getReviewByPostNumber(postNumber) {
    try {
        postNumber = postNumber.toString();
        console.log(`Поиск комментария #${postNumber}`);
        const cache = await loadReviewsCache();
        const cachedReview = cache.find(review => review.postNumber === postNumber);
        
        if (cachedReview) {
            console.log(`Найден закэшированный комментарий #${postNumber}`);
            return cachedReview;
        }
        
        console.log(`Комментарий #${postNumber} не найден в кэше, ищем на форуме...`);
        
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            
            const directUrl = `${forumConfig.forumUrl}/${postNumber}`;
            console.log(`Переходим на страницу комментария: ${directUrl}`);
            
            await page.goto(directUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            
            const review = await page.evaluate((targetNumber) => {
                
                const postSelector = `#post_${targetNumber}`;
                const post = document.querySelector(postSelector);
                
                if (!post) {
                    console.log(`Пост с селектором ${postSelector} не найден`);
                    return null;
                }
                
                
                const username = post.querySelector('.username a')?.textContent.trim() || '';
                const timeAgo = post.querySelector('.relative-date')?.textContent.trim() || '';
                const content = post.querySelector('.cooked')?.textContent.trim() || '';
                let avatar = post.querySelector('.avatar')?.getAttribute('src') || '';
                
                
                if (avatar && avatar.startsWith('/')) {
                    avatar = 'https://forum.neverlose.cc' + avatar;
                }
                
                return {
                    postNumber: targetNumber,
                    username,
                    timeAgo,
                    content,
                    avatar
                };
            }, postNumber);
            
            if (review) {
                console.log(`Найден комментарий от ${review.username}`);
                
                
                cache.push(review);
                await saveReviewsCache(cache);
                
                return review;
            } else {
                console.log(`Комментарий с номером ${postNumber} не найден`);
                return null;
            }
        } catch (error) {
            console.error('Ошибка при получении комментария:', error);
            return null;
        } finally {
            if (browser) await browser.close();
        }
    } catch (error) {
        console.error(`Ошибка при получении комментария #${postNumber}:`, error);
        return null;
    }
}


async function getLatestReviews(limit = 10, page = 1) {
    const reviews = await loadReviewsCache();
    
    
    reviews.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = reviews.slice(startIndex, endIndex);
    
    
    return {
        totalItems: reviews.length,
        currentPage: page,
        totalPages: Math.ceil(reviews.length / limit),
        reviews: paginatedReviews
    };
}


async function fetchLatestReviews() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        
        const jsonUrl = `${forumConfig.forumUrl}.json`;
        await page.goto(jsonUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        
        const topicData = await page.evaluate(() => {
            return JSON.parse(document.body.textContent);
        });
        
        
        const totalPosts = topicData.posts_count || 0;
        const lastPage = Math.ceil(totalPosts / forumConfig.postsPerPage);
        
        if (lastPage <= 0) {
            return [];
        }
        
        
        const lastPageUrl = `${forumConfig.forumUrl}?page=${lastPage}`;
        await page.goto(lastPageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        
        const newReviews = await page.evaluate(() => {
            const posts = document.querySelectorAll('.topic-post');
            return Array.from(posts).map(post => {
                const postNumber = post.getAttribute('data-post-number') || '';
                const username = post.querySelector('.username a')?.textContent.trim() || '';
                const timeAgo = post.querySelector('.relative-date')?.textContent.trim() || '';
                const content = post.querySelector('.cooked')?.textContent.trim() || '';
                let avatar = post.querySelector('.avatar')?.getAttribute('src') || '';
                
                
                if (avatar && avatar.startsWith('/')) {
                    avatar = 'https://forum.neverlose.cc' + avatar;
                }
                
                return {
                    postNumber,
                    username,
                    timeAgo,
                    content,
                    avatar
                };
            });
        });
        
        if (newReviews.length > 0) {
            
            const cache = await loadReviewsCache();
            const cachePostNumbers = new Set(cache.map(r => r.postNumber));
            
            const uniqueNewReviews = newReviews.filter(
                review => !cachePostNumbers.has(review.postNumber)
            );
            
            if (uniqueNewReviews.length > 0) {
                const updatedCache = [...cache, ...uniqueNewReviews];
                await saveReviewsCache(updatedCache);
                console.log(`Добавлено ${uniqueNewReviews.length} новых комментариев в кэш`);
            }
        }
        
        return newReviews;
    } catch (error) {
        console.error('Ошибка при получении комментариев с форума:', error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}


let allReviewsTaskStatus = {
  inProgress: false,
  progress: 0,
  message: '',
  startTime: null,
  error: null,
  result: null
};


app.post('/api/refresh-all', async (req, res) => {
  try {
    
    if (allReviewsTaskStatus.inProgress) {
      console.log('Попытка запустить уже выполняющийся процесс. Текущий статус:', allReviewsTaskStatus);
      return res.json(allReviewsTaskStatus);
    }
    
    
    allReviewsTaskStatus = {
      inProgress: true,
      startTime: Date.now(),
      progress: 0, 
      message: 'Инициализация...'
    };
    
    console.log('Запускаем процесс загрузки комментариев...');
    
    
    fetchAllReviewsInBackground();
    
    console.log('Задача запущена, возвращаем статус');
    res.json(allReviewsTaskStatus);
  } catch (error) {
    console.error('Ошибка при запуске обновления всех комментариев:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/refresh-all/status', (req, res) => {
  
  let statusData = { ...allReviewsTaskStatus };
  
  console.log('Запрос статуса загрузки:', statusData);
  
  if (statusData.startTime) {
    const elapsedMs = Date.now() - statusData.startTime;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSec / 60);
    const seconds = elapsedSec % 60;
    
    statusData.elapsedTime = `${minutes}м ${seconds}с`;
    
    
    if (statusData.progress > 0 && statusData.progress < 100) {
      const totalEstimatedMs = (elapsedMs / statusData.progress) * 100;
      const remainingMs = totalEstimatedMs - elapsedMs;
      const remainingSec = Math.floor(remainingMs / 1000);
      const remainingMin = Math.floor(remainingSec / 60);
      const remainingSecs = remainingSec % 60;
      
      statusData.estimatedTimeLeft = `≈ ${remainingMin}м ${remainingSecs}с`;
    }
  }
  
  res.json(statusData);
});


async function fetchAllReviewsInBackground() {
  try {
    allReviewsTaskStatus.message = 'Подготовка к загрузке...';
    
    try {
      
      if (!proxyConfig.nstProxies) {
        proxyConfig.nstProxies = [];
        console.warn('proxyConfig.nstProxies не был инициализирован, создан пустой массив');
      }
      
      if (!proxyConfig.list) {
        proxyConfig.list = [];
        console.warn('proxyConfig.list не был инициализирован, создан пустой массив');
      }
      
      
      const result = await fetchCommentsAccordingToSpec();
      
      if (result.success) {
        const newReviewsCount = result.newReviews;
        const totalReviewsCount = result.totalReviews;
        
        allReviewsTaskStatus.progress = 100;
        allReviewsTaskStatus.message = `Загрузка завершена. Добавлено ${newReviewsCount} новых комментариев. Всего в кэше: ${totalReviewsCount}`;
        allReviewsTaskStatus.result = {
          newReviews: newReviewsCount,
          totalReviews: totalReviewsCount
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      throw {
        type: ERROR_TYPES.UNKNOWN,
        message: error.message,
        details: `Произошла ошибка при загрузке комментариев: ${error.message}.`
      };
    }
  } catch (error) {
    console.error('Ошибка в процессе фоновой загрузки комментариев:', error);
    
    allReviewsTaskStatus.error = {
      message: error.message || 'Неизвестная ошибка',
      type: error.type || ERROR_TYPES.UNKNOWN,
      details: error.details || 'Подробности отсутствуют'
    };
    
    allReviewsTaskStatus.message = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
  } finally {
    allReviewsTaskStatus.inProgress = false;
  }
}


async function fetchAllCommentsViaApi() {
  console.log('Начинаем ускоренную загрузку всех комментариев через API Discourse...');
  
  allReviewsTaskStatus.message = 'Подготовка к загрузке...';
  allReviewsTaskStatus.progress = 1;
  
  
  const topicMatch = forumConfig.forumUrl.match(/\/t\/[^\/]+\/(\d+)/);
  const topicId = topicMatch ? topicMatch[1] : null;
  
  if (!topicId) {
    throw new Error('Не удалось определить ID темы из URL форума');
  }
  
  console.log(`Определен ID темы: ${topicId}`);
  allReviewsTaskStatus.message = `Получение информации о теме #${topicId}...`;
  allReviewsTaskStatus.progress = 5;
  
  
  if (proxyConfig.nstProxies && proxyConfig.nstProxies.length > 0) {
    proxyConfig.enabled = true;
    console.log(`Доступно ${proxyConfig.nstProxies.length} прокси для использования`);
  } else {
    console.log('Нет доступных прокси, продолжаем без прокси');
  }
  
  let browser;
  try {
    allReviewsTaskStatus.startTime = Date.now();
    
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://forum.neverlose.cc/'
      },
      timeout: 60000 
    };
    
    
    if (proxyConfig.enabled) {
      proxyConfig.applyToAxios(axiosConfig);
    }
    
    console.log('Конфигурация запроса:', JSON.stringify(axiosConfig, null, 2));
    
    const axiosInstance = axios.create(axiosConfig);
    
    
    axiosInstance.interceptors.request.use(request => {
      console.log('Отправка запроса:', request.method, request.url);
      return request;
    });
    
    axiosInstance.interceptors.response.use(
      response => {
        console.log('Получен ответ:', response.status, response.statusText);
        return response;
      },
      error => {
        console.error('Ошибка запроса:', error.message);
        return Promise.reject(error);
      }
    );
    
    
    const initialUrl = `https://forum.neverlose.cc/t/${topicId}/1.json`;
    console.log(`Получение метаданных темы: ${initialUrl}`);
    
    const topicResponse = await axiosInstance.get(initialUrl);
    const topicData = topicResponse.data;
    
    
    const postsCount = topicData.posts_count || 0;
    const totalPages = Math.ceil(postsCount / 20);
    
    console.log(`Всего постов: ${postsCount}, страниц: ${totalPages}`);
    
    
    let cache = await loadReviewsCache();
    const initialCacheSize = cache.length;
    console.log(`Начальный размер кэша: ${initialCacheSize} комментариев`);
    
    
    const processedPostNumbers = new Set(cache.map(review => review.postNumber));
    let newReviewsAdded = 0;
    
    
    const concurrencyLimit = 3; 
    const pageChunks = [];
    
    
    for (let i = 1; i <= totalPages; i += concurrencyLimit) {
      const chunk = [];
      for (let j = 0; j < concurrencyLimit && i + j <= totalPages; j++) {
        chunk.push(i + j);
      }
      pageChunks.push(chunk);
    }
    
    
    for (let chunkIndex = 0; chunkIndex < pageChunks.length; chunkIndex++) {
      if (!allReviewsTaskStatus.inProgress) {
        console.log('Загрузка отменена пользователем');
        break;
      }
      
      const pageNumbers = pageChunks[chunkIndex];
      const pagePromises = pageNumbers.map(async (pageNum) => {
        try {
          console.log(`Загрузка страницы ${pageNum} из ${totalPages}...`);
          
          
          const pageUrl = `https://forum.neverlose.cc/t/${topicId}/${pageNum}.json`;
          const pageResponse = await axiosInstance.get(pageUrl);
          const pageData = pageResponse.data;
          
          if (!pageData || !pageData.post_stream || !pageData.post_stream.posts) {
            console.error(`Не удалось получить данные для страницы ${pageNum}`);
            return { pageNum, newPosts: [] };
          }
          
          const posts = pageData.post_stream.posts || [];
          console.log(`Получено ${posts.length} постов на странице ${pageNum}`);
          
          
          const newPosts = [];
          for (const post of posts) {
            
            if (post && post.post_number && !processedPostNumbers.has(post.post_number.toString())) {
              
              const reviewItem = {
                postNumber: post.post_number.toString(),
                username: post.username || 'Unknown',
                timeAgo: new Date(post.created_at).toLocaleString(),
                content: post.cooked ? extractTextFromHtml(post.cooked) : '',
                avatar: post.avatar_template 
                  ? `https://forum.neverlose.cc${post.avatar_template.replace('{size}', '90')}`
                  : ''
              };
              
              newPosts.push(reviewItem);
              processedPostNumbers.add(reviewItem.postNumber);
            }
          }
          
          return { pageNum, newPosts };
        } catch (err) {
          console.error(`Ошибка при загрузке страницы ${pageNum}:`, err);
          return { pageNum, newPosts: [], error: err.message };
        }
      });
      
      
      const results = await Promise.all(pagePromises);
      
      
      for (const result of results) {
        if (result.newPosts && result.newPosts.length > 0) {
          cache.push(...result.newPosts);
          newReviewsAdded += result.newPosts.length;
          console.log(`Добавлено ${result.newPosts.length} новых комментариев со страницы ${result.pageNum}`);
        }
      }
      
      
      const processedPages = Math.min((chunkIndex + 1) * concurrencyLimit, totalPages);
      allReviewsTaskStatus.progress = Math.floor(processedPages / totalPages * 100);
      allReviewsTaskStatus.message = `Обработано ${processedPages} из ${totalPages} страниц. Найдено ${newReviewsAdded} новых комментариев.`;
      
      
      if (chunkIndex % 3 === 0 || chunkIndex === pageChunks.length - 1) {
        console.log('Промежуточное сохранение кэша...');
        await saveReviewsCache(cache);
      }
      
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    
    cache.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
    
    
    await saveReviewsCache(cache);
    
    
    return { 
      success: true, 
      newReviews: newReviewsAdded,
      totalReviews: cache.length
    };
  } catch (error) {
    console.error('Ошибка при загрузке комментариев через API:', error);
    return { success: false, error: error.message };
  }
}


function extractTextFromHtml(html) {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    
    return text.replace(/\s+/g, ' ').trim();
  } catch (e) {
    console.error('Ошибка при извлечении текста из HTML:', e);
    
    
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}




app.get('/api/reviews', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        
        const reviewsData = await getLatestReviews(limit, page);
        console.log(`Отправляем ${reviewsData.reviews.length} комментариев`); 
        res.json(reviewsData);
    } catch (error) {
        console.error('Ошибка при получении списка комментариев:', error);
        res.status(500).json({ error: 'Ошибка при получении списка комментариев' });
    }
});


app.get('/api/reviews/:postNumber', async (req, res) => {
    try {
        const postNumber = req.params.postNumber;
        
        console.log(`Запрос комментария #${postNumber}`);
        
        const review = await getReviewByPostNumber(postNumber);
        
        if (review) {
            console.log(`Отправка комментария #${postNumber} клиенту:`, JSON.stringify(review));
            res.json(review);
        } else {
            console.log(`Комментарий #${postNumber} не найден`);
            res.status(404).json({ error: 'Комментарий не найден' });
        }
    } catch (error) {
        console.error('Ошибка при поиске комментария:', error);
        res.status(500).json({ error: 'Ошибка при поиске комментария' });
    }
});


app.get('/api/stats', async (req, res) => {
    try {
        const cache = await loadReviewsCache();
        
        const stats = {
            totalReviews: cache.length,
            latestReview: cache.length > 0 
                ? cache.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber))[0] 
                : null,
            uniqueUsers: new Set(cache.map(r => r.username)).size
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
});


app.post('/api/refresh-all', async (req, res) => {
    try {
        
        const result = await fetchAllReviews();
        
        if (result.success) {
            res.json({
                success: true, 
                message: `Загрузка завершена. Добавлено ${result.newReviews} новых комментариев. Всего в кэше: ${result.totalReviews}`,
                newComments: result.newReviews,
                totalComments: result.totalReviews
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Произошла ошибка при загрузке комментариев: ' + result.error
            });
        }
    } catch (error) {
        console.error('Ошибка при полном обновлении кэша:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при полном обновлении кэша: ' + error.message 
        });
    }
});


app.post('/api/verify-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ valid: false, error: 'URL не указан' });
        }
        
        console.log(`Проверка URL: ${url}`);
        
        
        const urlRegex = /\/t\/[^\/]+\/(\d+)(?:\/(\d+))?/;
        const match = url.match(urlRegex);
        
        if (!match) {
            return res.json({ valid: false, error: 'Некорректный URL форума' });
        }
        
        
        const postNumber = match[2] || null;
        
        return res.json({ 
            valid: true, 
            postNumber,
            message: postNumber ? `Найден комментарий #${postNumber}` : 'Ссылка на тему, комментарий не указан' 
        });
    } catch (error) {
        console.error('Ошибка при проверке URL:', error);
        res.status(500).json({ valid: false, error: 'Ошибка при проверке URL' });
    }
});


app.post('/api/refresh-all/cancel', (req, res) => {
  if (allReviewsTaskStatus.inProgress) {
    allReviewsTaskStatus.inProgress = false;
    allReviewsTaskStatus.message = 'Загрузка отменена пользователем';
    console.log('Задача загрузки комментариев отменена пользователем');
    
    res.json({
      success: true,
      message: 'Задача загрузки комментариев отменена'
    });
  } else {
    res.json({
      success: false,
      message: 'Нет активной задачи загрузки комментариев'
    });
  }
});


app.get('/api/debug/cache', async (req, res) => {
  try {
    const cache = await loadReviewsCache();
    
    res.json({
      totalItems: cache.length,
      firstItem: cache.length > 0 ? cache[0] : null,
      lastItem: cache.length > 0 ? cache[cache.length - 1] : null,
      itemsPerPage: 20,
      uniqueUsers: new Set(cache.map(r => r.username)).size,
      postNumbersCount: new Set(cache.map(r => r.postNumber)).size
    });
  } catch (error) {
    console.error('Ошибка при проверке кэша:', error);
    res.status(500).json({ error: 'Ошибка при проверке кэша' });
  }
});


app.post('/api/save-comments', async (req, res) => {
  try {
    const { comments } = req.body;
    
    if (!Array.isArray(comments)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверный формат данных. Ожидается массив комментариев.' 
      });
    }
    
    console.log(`Получено ${comments.length} комментариев от клиента`);
    
    
    let cache = await loadReviewsCache();
    const initialCacheSize = cache.length;
    
    
    const processedPostNumbers = new Set(cache.map(review => review.postNumber));
    let newCommentsAdded = 0;
    
    
    for (const comment of comments) {
      if (comment && comment.postNumber && !processedPostNumbers.has(comment.postNumber)) {
        cache.push(comment);
        processedPostNumbers.add(comment.postNumber);
        newCommentsAdded++;
      }
    }
    
    
    cache.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
    
    
    await saveReviewsCache(cache);
    
    console.log(`Кэш комментариев обновлен. Добавлено ${newCommentsAdded} новых комментариев. Всего: ${cache.length}`);
    
    res.json({
      success: true,
      newComments: newCommentsAdded,
      totalComments: cache.length
    });
  } catch (error) {
    console.error('Ошибка при сохранении комментариев:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/api/proxy/status', (req, res) => {
  res.json({
    enabled: proxyConfig.enabled,
    count: proxyConfig.nstProxies.length,
    currentIndex: proxyConfig.currentIndex
  });
});

app.post('/api/proxy/toggle', (req, res) => {
  proxyConfig.enabled = !proxyConfig.enabled;
  console.log(`Использование прокси ${proxyConfig.enabled ? 'включено' : 'выключено'}`);
  res.json({ enabled: proxyConfig.enabled });
});

app.post('/api/proxy/add', (req, res) => {
  const { proxy } = req.body;
  
  if (!proxy || typeof proxy !== 'string') {
    return res.status(400).json({ error: 'Некорректный формат прокси' });
  }
  
  
  try {
    new URL(proxy);
  } catch (e) {
    return res.status(400).json({ error: 'Некорректный URL прокси' });
  }
  
  if (!proxyConfig.list.includes(proxy)) {
    proxyConfig.list.push(proxy);
    console.log('Добавлен новый прокси');
  }
  
  res.json({ success: true, count: proxyConfig.list.length });
});


app.get('/api/proxy-request', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL не указан' });
    }
    
    console.log(`Проксирование запроса к: ${url}`);
    
    try {
      
      const data = await fetchWithProxyRetry(url, { timeout: 60000 }, 3);
      res.json(data);
    } catch (error) {
      console.error('Ошибка при проксировании запроса:', error);
      res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/proxy/test', async (req, res) => {
  try {
    if (!proxyConfig.enabled) {
      return res.json({ 
        success: false, 
        error: 'Прокси отключены. Включите использование прокси для тестирования.' 
      });
    }
    
    const currentProxy = proxyConfig.getCurrentProxy();
    if (!currentProxy) {
      return res.json({ 
        success: false, 
        error: 'Нет доступных прокси для тестирования.' 
      });
    }
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      timeout: 30000
    };
    
    proxyConfig.applyToAxios(axiosConfig);
    
    console.log('Тестирование прокси...');
    const axiosInstance = axios.create(axiosConfig);
    
    
    const response = await axiosInstance.get('https://httpbin.org/ip');
    
    proxyConfig.logSuccess(`IP: ${response.data.origin}`);
    
    res.json({ 
      success: true, 
      message: `Успешно! Ваш IP через прокси: ${response.data.origin}`,
      proxyDetails: `${currentProxy.split(':')[0]}:${currentProxy.split(':')[1]}`
    });
  } catch (error) {
    proxyConfig.logError(error);
    
    res.json({ 
      success: false, 
      error: `Ошибка при тестировании прокси: ${error.message}` 
    });
  }
});


app.get('/api/last-added', async (req, res) => {
  try {
    const cache = await loadReviewsCache();
    
    
    const latestAdded = cache
      .sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber))
      .slice(0, 10);
    
    res.json({
      success: true,
      lastAdded: latestAdded,
      totalCount: cache.length
    });
  } catch (error) {
    console.error('Ошибка при получении последних комментариев:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});


async function fetchWithProxyRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      
      const axiosConfig = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          ...options.headers
        },
        timeout: options.timeout || 30000
      };
      
      
      if (proxyConfig.enabled) {
        proxyConfig.applyToAxios(axiosConfig);
      }
      
      console.log(`Попытка ${attempt}/${maxRetries} для ${url}`);
      const axiosInstance = axios.create(axiosConfig);
      const response = await axiosInstance.get(url);
      
      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`Ошибка при попытке ${attempt}/${maxRetries}:`, error.message);
      
      
      if (attempt === maxRetries) {
        throw new Error(`Не удалось выполнить запрос после ${maxRetries} попыток: ${error.message}`);
      }
      
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}


async function fetchCommentsAccordingToSpec() {
  console.log('Начинаем загрузку комментариев по ТЗ...');
  
  allReviewsTaskStatus.message = 'Получение информации о теме...';
  allReviewsTaskStatus.progress = 1;
  
  try {
    
    const topicId = '519874'; 
    
    
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000
    };
    
    
    if (proxyConfig.enabled) {
      proxyConfig.applyToAxios(axiosConfig);
    }
    
    const axiosInstance = axios.create(axiosConfig);
    
    
    console.log(`Получение базовой информации о теме #${topicId}...`);
    const topicResponse = await axiosInstance.get(`https://forum.neverlose.cc/t/${topicId}.json`);
    const topicData = topicResponse.data;
    const postsCount = topicData.posts_count;
    
    console.log(`Всего постов в теме: ${postsCount}`);
    allReviewsTaskStatus.message = `Определено ${postsCount} комментариев для загрузки`;
    allReviewsTaskStatus.progress = 5;
    
    
    const postsPerPage = 20; 
    const totalPages = Math.ceil(postsCount / postsPerPage);
    
    console.log(`Для загрузки необходимо обработать ${totalPages} страниц`);
    
    
    let allPosts = [];
    let cache = await loadReviewsCache();
    const initialCacheSize = cache.length;
    
    
    const existingPostNumbers = new Set(cache.map(item => item.postNumber.toString()));
    let newPostsCount = 0;
    
    for (let page = 1; page <= totalPages; page++) {
      allReviewsTaskStatus.progress = Math.floor(5 + (page / totalPages * 90));
      allReviewsTaskStatus.message = `Загрузка страницы ${page} из ${totalPages}...`;
      
      try {
        console.log(`Загрузка страницы ${page} из ${totalPages}...`);
        
        
        const pageUrl = `https://forum.neverlose.cc/t/${topicId}.json?page=${page}`;
        const pageResponse = await axiosInstance.get(pageUrl);
        
        
        if (pageResponse.data && pageResponse.data.post_stream && 
            pageResponse.data.post_stream.posts && 
            pageResponse.data.post_stream.posts.length > 0) {
          
          const posts = pageResponse.data.post_stream.posts;
          console.log(`Получено ${posts.length} постов на странице ${page}`);
          
          
          for (const post of posts) {
            
            if (post.post_number && !existingPostNumbers.has(post.post_number.toString())) {
              
              const formattedPost = {
                postNumber: post.post_number.toString(),
                username: post.username || 'Unknown',
                timeAgo: new Date(post.created_at).toLocaleString(),
                content: post.cooked ? extractTextFromHtml(post.cooked) : '',
                avatar: post.avatar_template 
                  ? `https://forum.neverlose.cc${post.avatar_template.replace('{size}', '90')}`
                  : 'https://via.placeholder.com/70?text=?'
              };
              
              
              cache.push(formattedPost);
              existingPostNumbers.add(formattedPost.postNumber);
              newPostsCount++;
              
              console.log(`Добавлен новый комментарий #${formattedPost.postNumber} от ${formattedPost.username}`);
            } else {
              console.log(`Пропускаем уже существующий пост #${post.post_number}`);
            }
          }
        } else {
          console.log(`Нет постов на странице ${page} или неверный формат ответа`);
        }
        
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Ошибка при загрузке страницы ${page}:`, error.message);
      }
      
      
      if (page % 10 === 0 || page === totalPages) {
        console.log(`Промежуточное сохранение кэша. Добавлено ${newPostsCount} новых комментариев`);
        
        
        cache.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
        await saveReviewsCache(cache);
        
        allReviewsTaskStatus.message = `Загружено ${newPostsCount} новых комментариев. Обработано ${page} из ${totalPages} страниц.`;
      }
    }
    
    
    cache.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
    await saveReviewsCache(cache);
    
    console.log(`Загрузка завершена. Добавлено ${newPostsCount} новых комментариев. Всего в кэше: ${cache.length}`);
    
    return { 
      success: true, 
      newReviews: newPostsCount,
      totalReviews: cache.length
    };
  } catch (error) {
    console.error('Ошибка при загрузке комментариев:', error.message);
    return { success: false, error: error.message };
  }
} 