<template>
  <div>
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">Поиск комментариев</h1>
      <p class="text-gray-600 dark:text-gray-300">
        Поиск комментариев по их номеру или URL-ссылке
      </p>
    </div>
    
        <div class="card mb-8">
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <label for="searchType" class="block text-gray-700 dark:text-gray-300 text-sm font-medium">Тип поиска</label>
        </div>
        <div class="flex space-x-2">
          <button 
            @click="searchType = 'number'"
            class="px-4 py-2 rounded-md text-sm"
            :class="searchType === 'number' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          >
            Поиск по номеру
          </button>
          <button 
            @click="searchType = 'url'"
            class="px-4 py-2 rounded-md text-sm"
            :class="searchType === 'url' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          >
            Поиск по URL
          </button>
        </div>
      </div>
      
      <div v-if="searchType === 'number'">
        <div class="mb-4">
          <label for="postNumber" class="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
            Номер комментария
          </label>
          <input 
            id="postNumber" 
            type="number" 
            v-model="postNumber" 
            placeholder="Например: 2212" 
            class="form-input"
          />
          <p class="mt-1 text-sm text-gray-500">
            Введите номер комментария, который вы хотите найти
          </p>
        </div>
      </div>
      
      <div v-else>
        <div class="mb-4">
          <label for="url" class="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
            URL-ссылка на комментарий
          </label>
          <input 
            id="url" 
            type="text" 
            v-model="url" 
            placeholder="https://forum.neverlose.cc/t/topic/12345/6789" 
            class="form-input"
          />
          <p class="mt-1 text-sm text-gray-500">
            Вставьте полную ссылку на комментарий с форума
          </p>
        </div>
      </div>
      
      <div class="flex justify-end">
        <button 
          @click="searchReview" 
          class="btn btn-primary"
          :disabled="loading"
        >
          <i class="fas fa-search mr-2"></i> Найти комментарий
        </button>
      </div>
    </div>
    
        <div v-if="loading" class="text-center py-10">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-300">Выполняется поиск...</p>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
      <p class="font-bold">Ошибка!</p>
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="review" class="card border-l-4 border-l-green-500">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          Результат поиска
        </h2>
        <router-link 
          :to="`/reviews/${review.postNumber}`" 
          class="btn btn-primary"
        >
          Просмотреть детали
        </router-link>
      </div>
      
      <div class="flex items-start">
        <img 
          :src="review.avatar" 
          alt="Аватар пользователя" 
          class="w-12 h-12 rounded-full mr-4"
          onerror="this.src='https://via.placeholder.com/70?text=?'"
        />
        <div class="flex-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
              {{ review.username }}
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">
                #{{ review.postNumber }}
              </span>
            </h3>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ review.timeAgo }}
            </span>
          </div>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ review.content }}
          </p>
        </div>
      </div>
    </div>
    
    <div v-else-if="searched && !review" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
      <p class="font-bold">Комментарий не найден!</p>
      <p>К сожалению, указанный комментарий не был найден. Пожалуйста, проверьте правильность введенных данных.</p>
    </div>
    
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          <i class="fas fa-info-circle text-blue-500 mr-2"></i> Как найти номер комментария
        </h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          Номер комментария можно найти в URL-адресе страницы с комментарием или рядом с именем пользователя в интерфейсе форума Neverlose.
        </p>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <p class="text-gray-700 dark:text-gray-300 text-sm">
            Пример URL: <code class="text-blue-600 dark:text-blue-400">https://forum.neverlose.cc/t/topic-title/12345/<strong>6789</strong></code>
            <br>
            Здесь <strong>6789</strong> — это номер комментария.
          </p>
        </div>
      </div>
      
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          <i class="fas fa-search text-blue-500 mr-2"></i> Полнотекстовый поиск
        </h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          Если вы не помните номер комментария, вы можете использовать полнотекстовый поиск на странице со списком всех комментариев.
        </p>
        <router-link 
          to="/reviews" 
          class="btn btn-primary"
        >
          Перейти к списку комментариев
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'SearchView',
  data() {
    return {
      searchType: 'number',
      postNumber: '',
      url: '',
      review: null,
      loading: false,
      error: null,
      searched: false
    };
  },
  mounted() {
        const query = this.$route.query.q;
    if (query) {
            if (query.includes('://') || query.includes('/t/')) {
        this.searchType = 'url';
        this.url = query;
      } else if (!isNaN(query)) {
        this.searchType = 'number';
        this.postNumber = query;
      }
      
            this.searchReview();
    }
  },
  methods: {
    async searchReview() {
      this.loading = true;
      this.error = null;
      this.review = null;
      this.searched = true;
      
      try {
        if (this.searchType === 'number') {
          if (!this.postNumber) {
            this.error = 'Пожалуйста, введите номер комментария';
            return;
          }
          
          console.log('Searching for review #', this.postNumber);
          const response = await api.getReviewByNumber(this.postNumber);
          console.log('Search response:', response.data);
          this.review = response.data;
        } else {
          if (!this.url) {
            this.error = 'Пожалуйста, введите URL-ссылку на комментарий';
            return;
          }
          
                    const urlInfo = await api.verifyUrl(this.url);
          if (urlInfo.data && urlInfo.data.valid && urlInfo.data.postNumber) {
                        const response = await api.getReviewByNumber(urlInfo.data.postNumber);
            this.review = response.data;
          } else {
            this.error = 'Некорректный URL комментария';
          }
        }
      } catch (error) {
        console.error('Ошибка при поиске комментария:', error);
        if (error.response && error.response.status === 404) {
                  } else {
          this.error = 'Не удалось выполнить поиск. Пожалуйста, попробуйте позже.';
        }
      } finally {
        this.loading = false;
      }
    }
  }
};
</script> 