import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000 });

export default {
    getReviews(page = 1, limit = 10) {
    return apiClient.get(`/reviews?page=${page}&limit=${limit}`);
  },
  
    getReviewByNumber(postNumber) {
    return apiClient.get(`/reviews/${postNumber}`);
  },
  
    getStats() {
    return apiClient.get('/stats');
  },
  
    refreshCache() {
    return apiClient.post('/refresh');
  },
  
    verifyUrl(url) {
    return apiClient.post('/verify-url', { url });
  },
  
    refreshAllCache() {
    return apiClient.post('/refresh-all');
  },
  
    getRefreshAllStatus() {
    return apiClient.get('/refresh-all/status');
  },
  
    cancelRefreshAll() {
    return apiClient.post('/refresh-all/cancel');
  },
  
    saveComments(comments) {
    return apiClient.post('/save-comments', { comments });
  },
  
    getProxyStatus() {
    return apiClient.get('/proxy/status');
  },
  
    toggleProxy() {
    return apiClient.post('/proxy/toggle');
  },
  
    addProxy(proxy) {
    return apiClient.post('/proxy/add', { proxy });
  },
  
    testProxy() {
    return apiClient.get('/proxy/test');
  }
}; 