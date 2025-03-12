<template>
  <div>
        <section class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 rounded-xl mb-12">
      <div class="container mx-auto px-6 text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          Поиск комментариев на форуме Neverlose
        </h1>
        <p class="text-xl md:text-2xl mb-8 opacity-80">
          Быстрый и удобный инструмент для поиска отзывов и комментариев
        </p>
        <div class="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          <router-link to="/reviews" class="btn btn-secondary px-8 py-3 text-base">
            Просмотреть комментарии
          </router-link>
          <router-link to="/search" class="btn bg-white text-blue-700 hover:bg-gray-100 px-8 py-3 text-base">
            Поиск по номеру
          </router-link>
        </div>
      </div>
    </section>
    
        <section class="mb-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card border-l-4 border-l-blue-500 flex items-center">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
            <i class="fas fa-comments text-blue-500 dark:text-blue-300 text-xl"></i>
          </div>
          <div>
            <h3 class="text-sm text-gray-500 dark:text-gray-400">Всего комментариев</h3>
            <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ stats.totalReviews || 'Загрузка...' }}</p>
          </div>
        </div>
        
        <div class="card border-l-4 border-l-green-500 flex items-center">
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg mr-4">
            <i class="fas fa-users text-green-500 dark:text-green-300 text-xl"></i>
          </div>
          <div>
            <h3 class="text-sm text-gray-500 dark:text-gray-400">Уникальных пользователей</h3>
            <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ stats.uniqueUsers || 'Загрузка...' }}</p>
          </div>
        </div>
        
        <div class="card border-l-4 border-l-purple-500 flex items-center">
          <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mr-4">
            <i class="fas fa-chart-line text-purple-500 dark:text-purple-300 text-xl"></i>
          </div>
          <div>
            <h3 class="text-sm text-gray-500 dark:text-gray-400">Последний комментарий</h3>
            <p class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ stats.latestReview ? `#${stats.latestReview.postNumber}` : 'Загрузка...' }}
            </p>
          </div>
        </div>
      </div>
    </section>
    
        <section v-if="stats.latestReview" class="mb-12">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Последний комментарий</h2>
      <div class="card">
        <div class="flex items-start">
          <img 
            :src="stats.latestReview.avatar" 
            alt="Аватар пользователя" 
            class="w-12 h-12 rounded-full mr-4"
            onerror="this.src='https://via.placeholder.com/70?text=?'"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                {{ stats.latestReview.username }}
              </h3>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ stats.latestReview.timeAgo }}
              </span>
            </div>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              {{ truncateText(stats.latestReview.content, 200) }}
            </p>
            <router-link 
              :to="`/reviews/${stats.latestReview.postNumber}`" 
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Подробнее →
            </router-link>
          </div>
        </div>
      </div>
    </section>
    
        <section class="mb-12">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Как это работает</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card">
          <div class="text-blue-500 dark:text-blue-400 text-3xl mb-4">
            <i class="fas fa-search"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">Поиск по номеру</h3>
          <p class="text-gray-600 dark:text-gray-300">
            Введите номер комментария из URL или из интерфейса форума, чтобы быстро найти нужный комментарий
          </p>
        </div>
        
        <div class="card">
          <div class="text-blue-500 dark:text-blue-400 text-3xl mb-4">
            <i class="fas fa-list"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">Просмотр комментариев</h3>
          <p class="text-gray-600 dark:text-gray-300">
            Просматривайте список всех доступных комментариев с удобной пагинацией и сортировкой
          </p>
        </div>
        
        <div class="card">
          <div class="text-blue-500 dark:text-blue-400 text-3xl mb-4">
            <i class="fas fa-sync"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">Актуальные данные</h3>
          <p class="text-gray-600 dark:text-gray-300">
            Система автоматически обновляет базу данных комментариев, обеспечивая актуальность информации
          </p>
        </div>
      </div>
    </section>
    
        <div class="flex justify-center mb-8">
      <button 
        @click="refreshAllReviews" 
        class="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center"
        :disabled="loadingAll"
      >
        <i class="fas fa-cloud-download-alt mr-2" :class="{'animate-spin': loadingAll}"></i> 
        Загрузить все комментарии с форума
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import api from '../services/api';

export default {
  name: 'HomeView',
  data() {
    return {
      stats: {
        totalReviews: 0,
        uniqueUsers: 0,
        latestReview: null
      },
      loading: true,
      error: null,
      loadingAll: false
    }
  },
  async mounted() {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/stats`);
      this.stats = response.data;
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
      this.error = 'Не удалось загрузить статистику. Пожалуйста, попробуйте позже.';
    } finally {
      this.loading = false;
    }
  },
  methods: {
    truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },
    async refreshAllReviews() {
      if (this.loadingAll) return;
      
      if (!confirm('Вы уверены, что хотите загрузить все комментарии с форума? Это может занять длительное время.')) {
        return;
      }
      
      this.loadingAll = true;
      
      try {
        const response = await api.refreshAllCache();
        
        if (response.data && response.data.success) {
          alert(`Загрузка завершена!\n\nДобавлено ${response.data.newComments} новых комментариев.\nВсего в базе: ${response.data.totalComments} комментариев.`);
          
          const statsResponse = await api.getStats();
          this.stats = statsResponse.data;
        } else {
          alert('Произошла ошибка при загрузке комментариев: ' + (response.data.error || 'Неизвестная ошибка'));
        }
      } catch (error) {
        console.error('Ошибка при загрузке всех комментариев:', error);
        alert('Ошибка при загрузке всех комментариев: ' + (error.response?.data?.error || error.message));
      } finally {
        this.loadingAll = false;
      }
    }
  }
}
</script> 