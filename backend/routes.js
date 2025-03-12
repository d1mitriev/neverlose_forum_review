const express = require('express');
const router = express.Router();

module.exports = function(getReviewByPostNumber, getLatestReviews, loadReviewsCache, saveReviewsCache, fetchLatestReviews) {
  router.get('/reviews', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      
      const reviews = await getLatestReviews(limit, page);
      res.json(reviews);
    } catch (error) {
      console.error('Ошибка при получении списка комментариев:', error);
      res.status(500).json({ error: 'Ошибка при получении списка комментариев' });
    }
  });
  router.get('/reviews/:postNumber', async (req, res) => {
    try {
      const postNumber = parseInt(req.params.postNumber);
      
      if (isNaN(postNumber)) {
        return res.status(400).json({ error: 'Некорректный номер комментария' });
      }
      
      console.log(`Запрос комментария #${postNumber}`);
      
      const review = await getReviewByPostNumber(postNumber);
      
      if (review) {
        res.json(review);
      } else {
        res.status(404).json({ error: 'Комментарий не найден' });
      }
    } catch (error) {
      console.error('Ошибка при поиске комментария:', error);
      res.status(500).json({ error: 'Ошибка при поиске комментария' });
    }
  });
  router.get('/stats', async (req, res) => {
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
  router.post('/refresh', async (req, res) => {
    try {
      const result = await fetchLatestReviews();
      res.json({ success: true, newComments: result.length });
    } catch (error) {
      console.error('Ошибка при обновлении кэша:', error);
      res.status(500).json({ error: 'Ошибка при обновлении кэша' });
    }
  });
  router.post('/verify-url', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL не указан' });
      }
      const info = extractPostInfoFromUrl(url);
      if (!info) {
        return res.status(400).json({ error: 'Некорректный URL комментария' });
      }
      res.json({ 
        valid: true, 
        topicId: info.topicId, 
        postNumber: info.postNumber 
      });
    } catch (error) {
      console.error('Ошибка при проверке URL:', error);
      res.status(500).json({ error: 'Ошибка при проверке URL' });
    }
  });

  return router;
};

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