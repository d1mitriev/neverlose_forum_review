<template>
  <div>
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">Все комментарии</h1>
      <p class="text-gray-600 dark:text-gray-300">
        Просмотр всех доступных комментариев с форума Neverlose
      </p>
    </div>
    
        <div class="mb-6 flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
      <div class="w-full sm:w-auto mb-4 sm:mb-0">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Поиск по имени пользователя..." 
          class="form-input w-full"
          @input="filterReviews"
        />
      </div>
      <div class="flex space-x-2">
        <button 
          @click="refreshReviews" 
          class="btn btn-primary flex items-center"
          :disabled="loading"
        >
          <i class="fas fa-sync-alt mr-2" :class="{'animate-spin': loading}"></i> Обновить
        </button>
        
        <button 
          @click="refreshAllReviews" 
          class="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center"
          :disabled="loadingAll"
        >
          <i class="fas fa-cloud-download-alt mr-2" :class="{'animate-spin': loadingAll}"></i> 
          Загрузить все комментарии
        </button>
        
        <select v-model="sortOption" class="form-input" @change="sortReviews">
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="username">По имени пользователя</option>
        </select>
      </div>
    </div>
    
        <div v-if="loading" class="text-center py-10">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-300">Загрузка комментариев...</p>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
      <p class="font-bold">Ошибка!</p>
      <p>{{ error }}</p>
      <button @click="refreshReviews" class="mt-2 text-blue-600 hover:underline">Попробовать снова</button>
    </div>
    
    <div v-else-if="filteredReviews.length === 0" class="text-center py-10">
      <i class="fas fa-comment-slash text-4xl text-gray-400 mb-3"></i>
      <p class="text-gray-600 dark:text-gray-300">
        Комментарии не найдены. Попробуйте изменить параметры поиска или обновите список.
      </p>
    </div>
    
    <div v-else class="space-y-4">
      <div v-for="review in paginatedReviews" :key="review.postNumber" class="card border-l-4 border-l-blue-500">
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
              {{ truncateText(review.content, 150) }}
            </p>
            <router-link 
              :to="`/reviews/${review.postNumber}`" 
              class="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
            >
              Подробнее <i class="fas fa-chevron-right ml-1 text-xs"></i>
            </router-link>
          </div>
        </div>
      </div>
      
            <div v-if="filteredReviews.length > 0" class="flex justify-center mt-8">
        <nav class="flex items-center space-x-2">
          <button 
            @click="changePage(currentPage - 1)" 
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded border dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300"
            :class="{'opacity-50 cursor-not-allowed': currentPage === 1}"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <template v-for="page in totalPages" :key="page">
            <button 
              v-if="shouldShowPageButton(page)" 
              @click="changePage(page)"
              class="px-3 py-1 rounded border dark:border-gray-700"
              :class="page === currentPage ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300'"
            >
              {{ page }}
            </button>
            <span 
              v-else-if="page === 2 && currentPage > 3" 
              class="px-3 py-1 text-gray-500">...</span>
            <span 
              v-else-if="page === totalPages - 1 && currentPage < totalPages - 2" 
              class="px-3 py-1 text-gray-500">...</span>
          </template>
          
          <button 
            @click="changePage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded border dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300"
            :class="{'opacity-50 cursor-not-allowed': currentPage === totalPages}"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </nav>
      </div>
    </div>
    
        <div v-if="statusMessage" class="fixed bottom-4 right-4 max-w-md bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-lg z-50">
      <div class="flex flex-col">
        <div class="flex items-center mb-2">
          <i class="fas fa-spinner animate-spin mr-3"></i>
          <div class="font-bold">Загрузка комментариев</div>
        </div>
        <p class="text-sm mb-2">{{ statusMessage }}</p>
        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${loadingProgress}%` }"></div>
        </div>
        <button 
          @click="cancelLoading" 
          class="self-end text-xs text-red-600 hover:text-red-800"
        >
          Отменить загрузку
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../services/api';
import DialogModal from '../components/DialogModal.vue';

export default {
  name: 'ReviewsView',
  components: {
    DialogModal
  },
  data() {
    return {
      reviews: [],
      filteredReviews: [],
      loading: true,
      error: null,
      searchQuery: '',
      sortOption: 'newest',
      currentPage: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 0,
      loadingAll: false,
      statusMessage: '',
      statusPollInterval: null,
      loadingProgress: 0,
      dialog: {
        show: false,
        type: 'info',
        title: '',
        message: '',
        confirmText: 'OK',
        cancelText: 'Отмена',
        showCancel: false,
        onConfirm: () => {},
        onCancel: () => {}
      }
    };
  },
  computed: {
    itemsPerPage() {
      return this.perPage;
    },
    paginatedReviews() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredReviews.slice(start, end);
    }
  },
  async mounted() {
    await this.fetchReviews();
  },
  methods: {
    async fetchReviews() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.getReviews(this.currentPage, this.itemsPerPage);
        
                if (response.data && response.data.reviews) {
                    this.reviews = response.data.reviews;
          this.totalItems = response.data.totalItems;
          this.totalPages = response.data.totalPages;
        } else if (Array.isArray(response.data)) {
                    this.reviews = response.data;
          this.totalItems = response.data.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        } else {
          throw new Error('Неожиданный формат данных');
        }
        
        this.filteredReviews = [...this.reviews];
        this.sortReviews();
      } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        this.error = 'Не удалось загрузить комментарии. Пожалуйста, попробуйте позже.';
      } finally {
        this.loading = false;
      }
    },
    async refreshReviews() {
      this.currentPage = 1;
      await this.fetchReviews();
    },
    filterReviews() {
      if (!this.searchQuery.trim()) {
        this.filteredReviews = [...this.reviews];
      } else {
        const query = this.searchQuery.toLowerCase().trim();
        this.filteredReviews = this.reviews.filter(review => {
          return review.username.toLowerCase().includes(query) || 
                 review.content.toLowerCase().includes(query);
        });
      }
      this.sortReviews();
      this.currentPage = 1;
    },
    sortReviews() {
      if (this.sortOption === 'newest') {
        this.filteredReviews.sort((a, b) => parseInt(b.postNumber) - parseInt(a.postNumber));
      } else if (this.sortOption === 'oldest') {
        this.filteredReviews.sort((a, b) => parseInt(a.postNumber) - parseInt(b.postNumber));
      } else if (this.sortOption === 'username') {
        this.filteredReviews.sort((a, b) => a.username.localeCompare(b.username));
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    shouldShowPageButton(page) {
            if (this.totalPages <= 7) {
                return true;
      }
      
            return page === 1 || 
             page === this.totalPages || 
             (page >= this.currentPage - 1 && page <= this.currentPage + 1);
    },
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
      this.statusMessage = 'Начинаем загрузку всех комментариев...';
      
      try {
                this.showDialog({
          type: 'question',
          title: 'Обновление комментариев',
          message: 'Использовать клиентский метод загрузки? (Рекомендуется, если вы видите ошибки с серверным API)',
          confirmText: 'Да, клиентский',
          cancelText: 'Нет, серверный',
          showCancel: true,
          onConfirm: async () => {
            await this.refreshClientSide();
          },
          onCancel: async () => {
            await this.refreshServerSide();
          }
        });
      } catch (error) {
        this.error = 'Ошибка при обновлении комментариев: ' + error.message;
        this.showDialog({
          type: 'error',
          title: 'Ошибка',
          message: this.error
        });
      }
    },
    async pollTaskStatus() {
            this.statusPollInterval = setInterval(async () => {
        try {
          const statusResponse = await api.getRefreshAllStatus();
          const status = statusResponse.data;
          
                    let statusMessage = status.message;
          
          if (status.progress > 0 && status.progress < 100) {
            statusMessage += ` (${status.progress}%)`;
            
            if (status.estimatedTimeLeft) {
              statusMessage += ` - Осталось: ${status.estimatedTimeLeft}`;
            }
          }
          
          if (status.elapsedTime) {
            statusMessage += ` - Прошло: ${status.elapsedTime}`;
          }
          
          this.statusMessage = statusMessage;
          this.loadingProgress = status.progress || 0;
          
          if (!status.inProgress) {
                        clearInterval(this.statusPollInterval);
            this.loadingAll = false;
            
            if (status.error) {
                            const errorDetails = typeof status.error === 'object' 
                ? status.error.details || status.error.message 
                : status.error;
                
              const errorType = typeof status.error === 'object' 
                ? status.error.type || 'UNKNOWN' 
                : 'UNKNOWN';
                
              this.showErrorDialog(errorType, errorDetails);
            } else if (status.result) {
                            const newReviews = typeof status.result.newReviews === 'number' ? status.result.newReviews : 0;
              const totalReviews = typeof status.result.totalReviews === 'number' ? status.result.totalReviews : 0;
              
              alert(`Загрузка завершена!\n\nДобавлено ${newReviews} новых комментариев.\nВсего в базе: ${totalReviews} комментариев.`);
              
                            await this.fetchReviews();
            }
            
            this.statusMessage = '';
          }
        } catch (error) {
          console.error('Ошибка при получении статуса задачи:', error);
          clearInterval(this.statusPollInterval);
          this.loadingAll = false;
          this.statusMessage = '';
          
                    if (error.message.includes('Network Error')) {
            this.showErrorDialog('NETWORK', 'Ошибка сети при получении статуса. Возможно, сервер недоступен или перезагружается.');
          } else if (error.response && error.response.status === 404) {
            this.showErrorDialog('API', 'API для получения статуса не найден. Проверьте, что сервер запущен и доступен.');
          } else {
            this.showErrorDialog('UNKNOWN', 'Неизвестная ошибка при отслеживании статуса: ' + error.message);
          }
        }
      }, 2000);
    },
        showErrorDialog(errorType, errorMessage) {
      let title = 'Ошибка при загрузке комментариев';
      let message = errorMessage;
      let advice = '';
      
            switch(errorType) {
        case 'NETWORK_ERROR':
          title = 'Ошибка сети';
          advice = 'Проверьте ваше интернет-соединение. Возможно, сайт форума временно недоступен.';
          break;
        case 'PARSING_ERROR': 
          title = 'Ошибка обработки данных';
          advice = 'Структура форума могла измениться. Попробуйте обновить приложение.';
          break;
        case 'TIMEOUT_ERROR':
          title = 'Превышено время ожидания';
          advice = 'Форум отвечает слишком долго. Попробуйте позже, когда нагрузка на сервер уменьшится.';
          break;
        case 'AUTH_ERROR':
          title = 'Ошибка доступа';
          advice = 'Доступ к форуму ограничен. Возможно, требуется авторизация или IP-адрес заблокирован.';
          break;
      }
      
      const fullMessage = `${message}\n\n${advice}`;
      alert(`${title}\n\n${fullMessage}`);
    },
    async cancelLoading() {
      if (confirm('Вы уверены, что хотите отменить загрузку комментариев?')) {
        try {
          await api.cancelRefreshAll();
          clearInterval(this.statusPollInterval);
          this.loadingAll = false;
          this.statusMessage = '';
          alert('Загрузка комментариев отменена.');
        } catch (error) {
          console.error('Ошибка при отмене загрузки:', error);
          alert('Ошибка при отмене загрузки: ' + error.message);
        }
      }
    },
        showDialog(options) {
      this.dialog = {
        show: true,
        type: 'info',
        title: 'Информация',
        message: '',
        confirmText: 'OK',
        cancelText: 'Отмена',
        showCancel: false,
        onConfirm: () => {},
        onCancel: () => {},
        ...options
      };
    },
    async refreshClientSide() {
      try {
        this.loading = true;
        this.error = null;
        
                        
        await this.fetchReviews();
        
        this.showDialog({
          type: 'success',
          title: 'Загрузка завершена',
          message: 'Комментарии успешно обновлены через клиентский API.'
        });
      } catch (error) {
        this.error = 'Ошибка при загрузке через клиентский API: ' + error.message;
        this.showDialog({
          type: 'error',
          title: 'Ошибка',
          message: this.error
        });
      } finally {
        this.loading = false;
      }
    },
    async refreshServerSide() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await api.refreshAllCache();
        if (response.data.success) {
          await this.fetchReviews();
          
          this.showDialog({
            type: 'success',
            title: 'Загрузка запущена',
            message: 'Загрузка комментариев запущена на сервере. Проверьте страницу "Загрузка" для отслеживания прогресса.'
          });
        } else {
          throw new Error(response.data.message || 'Неизвестная ошибка');
        }
      } catch (error) {
        this.error = 'Ошибка при загрузке через серверный API: ' + error.message;
        this.showDialog({
          type: 'error',
          title: 'Ошибка',
          message: this.error
        });
      } finally {
        this.loading = false;
      }
    }
  },
  beforeDestroy() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
    }
  }
};
</script> 