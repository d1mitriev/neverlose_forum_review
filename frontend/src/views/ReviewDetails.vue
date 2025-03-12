<template>
  <div>
        <div class="mb-4 flex items-center text-sm">
      <router-link to="/" class="text-blue-500 hover:underline">Главная</router-link>
      <span class="mx-2 text-gray-500">/</span>
      <router-link to="/reviews" class="text-blue-500 hover:underline">Комментарии</router-link>
      <span class="mx-2 text-gray-500">/</span>
      <span class="text-gray-600 dark:text-gray-400">Комментарий #{{ postNumber }}</span>
    </div>
    
        <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">
      Комментарий #{{ postNumber }}
    </h1>
    
        <div v-if="loading" class="text-center py-10">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-300">Загрузка комментария...</p>
    </div>
    
        <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
      <p class="font-bold">Ошибка!</p>
      <p>{{ error }}</p>
      <div class="mt-4 flex space-x-4">
        <button @click="fetchReview" class="text-blue-600 hover:underline">Попробовать снова</button>
        <router-link to="/reviews" class="text-blue-600 hover:underline">Вернуться к списку</router-link>
      </div>
    </div>
    
        <div v-else-if="review" class="card border-l-4 border-l-blue-500">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
        <div class="flex items-center mb-4 sm:mb-0">
          <img 
            :src="review.avatar" 
            alt="Аватар пользователя" 
            class="w-12 h-12 rounded-full mr-4"
            onerror="this.src='https://via.placeholder.com/70?text=?'"
          />
          <div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-white">{{ review.username }}</h2>
            <p class="text-gray-500 dark:text-gray-400">
              <i class="far fa-clock mr-1"></i> {{ review.timeAgo }}
            </p>
          </div>
        </div>
        <div class="flex space-x-2">
          <a 
            :href="`${forumUrl}/${postNumber}`" 
            target="_blank" 
            class="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <i class="fas fa-external-link-alt mr-1"></i> Открыть на форуме
          </a>
          <button 
            @click="copyLink" 
            class="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <i class="fas fa-link mr-1"></i> {{ copied ? 'Скопировано!' : 'Копировать ссылку' }}
          </button>
        </div>
      </div>
      
            <div class="prose max-w-none dark:prose-invert">
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-line">{{ review.content }}</p>
      </div>
    </div>
    
        <div v-else class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
      <p class="font-bold">Комментарий не найден!</p>
      <p>К сожалению, комментарий с номером #{{ postNumber }} не найден.</p>
      <router-link to="/search" class="mt-2 text-blue-600 hover:underline block">
        Перейти к поиску комментариев
      </router-link>
    </div>
    
        <div v-if="!loading && !error && !review" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
      <p class="font-bold">Отладочная информация</p>
      <p>Номер комментария: {{ postNumber }}</p>
      <p>Тип: {{ typeof postNumber }}</p>
    </div>
    
        <div v-if="review" class="mt-8 flex justify-between">
      <router-link 
        v-if="parseInt(postNumber) > 1" 
        :to="`/reviews/${parseInt(postNumber) - 1}`" 
        class="btn bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <i class="fas fa-arrow-left mr-2"></i> Предыдущий
      </router-link>
      <div v-else></div>
      
      <router-link 
        :to="`/reviews/${parseInt(postNumber) + 1}`" 
        class="btn bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        Следующий <i class="fas fa-arrow-right ml-2"></i>
      </router-link>
    </div>
  </div>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'ReviewDetails',
  props: {
    postNumber: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      review: null,
      loading: true,
      error: null,
      copied: false,
      forumUrl: 'https://forum.neverlose.cc/t/24-7-unique-resell-ua-ru-kz-ua-cards-ru-cards-kz-cards-binance-pay-bybit-uid-htx-id/519874'
    };
  },
  watch: {
    postNumber: {
      immediate: true,
      handler() {
        this.fetchReview();
      }
    }
  },
  methods: {
    async fetchReview() {
      this.loading = true;
      this.error = null;
      this.review = null;
      
      try {
        console.log('Fetching review #', this.postNumber);
        const response = await api.getReviewByNumber(this.postNumber);
        console.log('Response:', response.data);
        this.review = response.data;
      } catch (error) {
        console.error('Ошибка при загрузке комментария:', error);
        if (error.response && error.response.status === 404) {
          this.error = `Комментарий #${this.postNumber} не найден.`;
        } else {
          this.error = 'Не удалось загрузить комментарий. Пожалуйста, попробуйте позже.';
        }
      } finally {
        this.loading = false;
      }
    },
    copyLink() {
      const url = `${window.location.origin}/reviews/${this.postNumber}`;
      navigator.clipboard.writeText(url).then(() => {
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      });
    }
  }
};
</script> 