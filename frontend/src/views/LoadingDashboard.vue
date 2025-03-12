<template>
  <div class="bg-slate-100 dark:bg-gray-900 min-h-screen p-6">
        <div v-if="isLoading" class="fixed top-4 right-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{{ status.message || 'Загрузка...' }}</span>
    </div>
    
        <div 
      v-if="isLoading" 
      class="fixed top-0 left-0 h-1 bg-blue-600 transition-all duration-300 z-50" 
      :style="`width: ${status.progress}%`"
    ></div>
    
        <div class="max-w-6xl mx-auto mb-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Загрузка комментариев
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              Монитор загрузки и синхронизации данных
            </p>
          </div>
          
          <div class="flex items-center space-x-3 mt-4 md:mt-0">
            <button 
              @click="startLoading" 
              class="btn bg-blue-600 hover:bg-blue-700 text-white"
              :disabled="isLoading"
            >
              <i class="fas fa-play mr-2"></i> Начать загрузку
            </button>
            
            <button 
              @click="cancelLoading" 
              class="btn bg-red-600 hover:bg-red-700 text-white"
              :disabled="!isLoading"
            >
              <i class="fas fa-stop mr-2"></i> Отменить
            </button>
          </div>
        </div>
        
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="stat-card">
            <div class="text-blue-600 dark:text-blue-400 text-xl">
              <i class="fas fa-comments"></i>
            </div>
            <div class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ stats.total || 0 }}
            </div>
            <div class="text-gray-500 dark:text-gray-400 text-sm">
              Всего комментариев
            </div>
          </div>
          
          <div class="stat-card">
            <div class="text-green-600 dark:text-green-400 text-xl">
              <i class="fas fa-plus-circle"></i>
            </div>
            <div class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ stats.new || 0 }}
            </div>
            <div class="text-gray-500 dark:text-gray-400 text-sm">
              Новых загружено
            </div>
          </div>
          
          <div class="stat-card">
            <div class="text-purple-600 dark:text-purple-400 text-xl">
              <i class="fas fa-users"></i>
            </div>
            <div class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ stats.users || 0 }}
            </div>
            <div class="text-gray-500 dark:text-gray-400 text-sm">
              Уникальных пользователей
            </div>
          </div>
          
          <div class="stat-card">
            <div class="text-orange-600 dark:text-orange-400 text-xl">
              <i class="fas fa-clock"></i>
            </div>
            <div class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ elapsedTime }}
            </div>
            <div class="text-gray-500 dark:text-gray-400 text-sm">
              Время загрузки
            </div>
          </div>
        </div>
      </div>
    </div>
    
        <div class="max-w-6xl mx-auto mb-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Прогресс загрузки
        </h2>
        
        <div v-if="isLoading" class="mb-4">
          <div class="relative pt-1">
            <div class="flex mb-2 items-center justify-between">
              <div>
                <span class="text-sm font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
                  {{ status.progress }}%
                </span>
              </div>
              <div class="text-right">
                <span class="text-sm font-semibold inline-block text-gray-600 dark:text-gray-400">
                  {{ status.message }}
                </span>
              </div>
            </div>
            <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-gray-700">
              <div 
                :style="`width: ${status.progress}%`" 
                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 dark:bg-blue-500 transition-all duration-500"
              ></div>
            </div>
          </div>
          
          <div class="flex flex-col md:flex-row justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              <i class="fas fa-history mr-1"></i> Прошло: {{ elapsedTime }}
            </div>
            <div v-if="status.estimatedTimeLeft">
              <i class="fas fa-hourglass-half mr-1"></i> Осталось: {{ status.estimatedTimeLeft }}
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <i class="fas fa-pause-circle text-4xl mb-3"></i>
          <p>Загрузка не запущена</p>
        </div>
      </div>
    </div>
    
        <div class="max-w-6xl mx-auto mb-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800 dark:text-white">
            Настройки прокси
          </h2>
          
          <div class="flex items-center">
            <span class="text-sm text-gray-600 dark:text-gray-400 mr-2">
              Использовать прокси
            </span>
            <label class="switch">
              <input type="checkbox" v-model="proxyEnabled" @change="toggleProxy">
              <span class="slider round"></span>
            </label>
          </div>
        </div>
        
        <div v-if="proxyEnabled" class="mb-4">
          <div class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
            <input 
              type="text" 
              v-model="newProxy" 
              placeholder="http://username:password@host:port" 
              class="form-input flex-grow"
            >
            <button 
              @click="addProxy" 
              class="btn bg-blue-600 hover:bg-blue-700 text-white"
              :disabled="!isValidProxy"
            >
              <i class="fas fa-plus mr-2"></i> Добавить прокси
            </button>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            <i class="fas fa-info-circle mr-1"></i> 
            Активных прокси: {{ proxyCount }}
          </p>
        </div>
        
        <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400">
          <p>Прокси отключены. Включите для обхода ограничений API.</p>
        </div>
        
        <button 
          @click="testProxy" 
          class="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          :disabled="testingProxy"
        >
          <i class="fas fa-vial mr-2"></i> 
          {{ testingProxy ? 'Тестирование...' : 'Проверить прокси' }}
        </button>
      </div>
    </div>
    
        <div class="max-w-6xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Последние загруженные комментарии
        </h2>
        
        <div v-if="loading" class="text-center py-6">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">Загрузка комментариев...</p>
        </div>
        
        <div v-else-if="latestComments.length === 0" class="text-center py-6 text-gray-500 dark:text-gray-400">
          <i class="fas fa-comment-slash text-4xl mb-3"></i>
          <p>Нет загруженных комментариев</p>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="comment in latestComments" :key="comment.postNumber" class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex">
              <img :src="comment.avatar" alt="Avatar" class="w-10 h-10 rounded-full mr-3" onerror="this.src='https://via.placeholder.com/40?text=?'">
              <div>
                <div class="flex items-center">
                  <span class="font-medium text-gray-800 dark:text-white">{{ comment.username }}</span>
                  <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">#{{ comment.postNumber }}</span>
                </div>
                <p class="text-gray-600 dark:text-gray-300 text-sm mt-1">{{ comment.content }}</p>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{{ comment.timeAgo }}</span>
              </div>
            </div>
          </div>
          
          <div class="text-center mt-4">
            <router-link to="/reviews" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Просмотреть все комментарии <i class="fas fa-arrow-right ml-1"></i>
            </router-link>
          </div>
        </div>
      </div>
    </div>
    
        <DialogModal
      v-model="dialog.show"
      :type="dialog.type"
      :title="dialog.title"
      :message="dialog.message"
      :confirm-text="dialog.confirmText"
      :cancel-text="dialog.cancelText"
      :show-cancel="dialog.showCancel"
      @confirm="dialog.onConfirm"
      @cancel="dialog.onCancel"
    />
  </div>
</template>

<script>
import api from '../services/api';
import DialogModal from '../components/DialogModal.vue';

export default {
  name: 'LoadingDashboard',
  components: {
    DialogModal
  },
  data() {
    return {
      loading: true,
      isLoading: false,
      status: {
        progress: 0,
        message: '',
        inProgress: false,
        estimatedTimeLeft: '',
      },
      stats: {
        total: 0,
        new: 0,
        users: 0,
      },
      latestComments: [],
      statusPollInterval: null,
      startTime: null,
      elapsedTime: '00:00:00',
      timer: null,
      proxyEnabled: false,
      proxyCount: 0,
      newProxy: '',
      testingProxy: false,
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
    isValidProxy() {
      if (!this.newProxy) return false;
      try {
        new URL(this.newProxy);
        return true;
      } catch (e) {
        return false;
      }
    }
  },
  async mounted() {
    await this.fetchStats();
    await this.fetchLatestComments();
    await this.fetchProxyStatus();
    await this.checkStatus();
    this.loading = false;
    
        this.statusPollInterval = setInterval(this.checkStatus, 2000);
  },
  beforeDestroy() {
    clearInterval(this.statusPollInterval);
    clearInterval(this.timer);
  },
  methods: {
    async fetchStats() {
      try {
        const response = await api.getStats();
        this.stats = {
          total: response.data.totalReviews || 0,
          new: 0,
          users: response.data.uniqueUsers || 0,
        };
      } catch (error) {
        console.error('Ошибка при получении статистики:', error);
      }
    },
    
    async fetchLatestComments() {
      try {
        const response = await api.getReviews(1, 5);
        this.latestComments = response.data.reviews || [];
      } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
      }
    },
    
    async fetchProxyStatus() {
      try {
        const response = await api.getProxyStatus();
        this.proxyEnabled = response.data.enabled;
        this.proxyCount = response.data.count;
      } catch (error) {
        console.error('Ошибка при получении статуса прокси:', error);
      }
    },
    
    async toggleProxy() {
      try {
        const response = await api.toggleProxy();
        this.proxyEnabled = response.data.enabled;
      } catch (error) {
        console.error('Ошибка при переключении прокси:', error);
      }
    },
    
    async addProxy() {
      if (!this.isValidProxy) return;
      
      try {
        const response = await api.addProxy(this.newProxy);
        this.proxyCount = response.data.count;
        this.newProxy = '';
      } catch (error) {
        console.error('Ошибка при добавлении прокси:', error);
      }
    },
    
    async checkStatus() {
      try {
        const response = await api.getRefreshAllStatus();
        const status = response.data;
        
                if (status.inProgress) {
          if (!this.isLoading) {
                        this.isLoading = true;
            this.startTime = status.startTime || Date.now();
            if (!this.timer) {
              this.timer = setInterval(this.updateElapsedTime, 1000);
            }
          }
          
                    this.status.progress = status.progress || 0;
          this.status.message = status.message || 'Загрузка в процессе...';
          this.status.estimatedTimeLeft = status.estimatedTimeLeft || '';
          
          console.log('Статус загрузки:', {
            progress: this.status.progress,
            message: this.status.message,
            elapsedTime: this.elapsedTime
          });
        } else if (this.isLoading) {
                    this.isLoading = false;
          clearInterval(this.timer);
          this.timer = null;
          
                    if (status.error) {
            this.showDialog({
              type: 'error',
              title: 'Ошибка загрузки',
              message: typeof status.error === 'object' ? status.error.message : status.error
            });
          } else if (status.result) {
            this.stats.new = status.result.newReviews || 0;
            this.stats.total = status.result.totalReviews || 0;
            await this.fetchLatestComments();
            
            this.showDialog({
              type: 'success',
              title: 'Загрузка завершена',
              message: `Добавлено ${this.stats.new} новых комментариев.\nВсего в базе: ${this.stats.total} комментариев.`
            });
          }
        }
      } catch (error) {
        console.error('Ошибка при получении статуса:', error);
      }
    },
    
    updateElapsedTime() {
      if (!this.startTime) return;
      
      const elapsed = Date.now() - this.startTime;
      const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      
      this.elapsedTime = `${hours}:${minutes}:${seconds}`;
      console.log('Прошло времени:', this.elapsedTime);
    },
    
    async startLoading() {
      this.showDialog({
        type: 'info',
        title: 'Выбор метода загрузки',
        message: 'Выберите метод загрузки комментариев:',
        confirmText: 'Клиентский API (быстрее)',
        cancelText: 'Серверный API (надежнее)',
        showCancel: true,
        onConfirm: () => this.startClientLoading(),
        onCancel: () => this.startServerLoading()
      });
    },
    
    async startClientLoading() {
      try {
        const { fetchAllComments } = await import('../utils/commentLoader.js');
        
        this.isLoading = true;
        this.startTime = Date.now();
        this.timer = setInterval(this.updateElapsedTime, 1000);
        this.status.message = 'Загрузка через клиентский API...';
        this.status.progress = 0;
        
        const allComments = await fetchAllComments();
        this.status.progress = 95;
        this.status.message = 'Отправка комментариев на сервер...';
        
        const response = await api.saveComments(allComments);
        
        if (response.data && response.data.success) {
          this.status.progress = 100;
          this.status.message = 'Загрузка завершена';
          this.stats.new = response.data.newComments;
          this.stats.total = response.data.totalComments;
          
          await this.fetchLatestComments();
          
          this.showDialog({
            type: 'success',
            title: 'Загрузка завершена',
            message: `Добавлено ${response.data.newComments} новых комментариев.\nВсего в базе: ${response.data.totalComments} комментариев.`
          });
        } else {
          this.showDialog({
            type: 'error',
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении комментариев на сервере.'
          });
        }
        
        this.isLoading = false;
        clearInterval(this.timer);
        this.timer = null;
      } catch (error) {
        console.error('Ошибка при запуске загрузки:', error);
        
        this.showDialog({
          type: 'error',
          title: 'Ошибка загрузки',
          message: error.message
        });
        
        this.isLoading = false;
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    
    async startServerLoading() {
      try {
        this.isLoading = true;         this.startTime = Date.now();         this.timer = setInterval(this.updateElapsedTime, 1000);         this.status.message = 'Начало загрузки через серверный API...';
        this.status.progress = 0;         
        const response = await api.refreshAllCache();
        
        if (!response.data.inProgress) {
                    this.isLoading = false;
          clearInterval(this.timer);
          this.timer = null;
          
          this.showDialog({
            type: 'error',
            title: 'Ошибка',
            message: 'Не удалось запустить задачу загрузки: ' + (response.data.error || 'Неизвестная ошибка')
          });
        }
              } catch (error) {
        console.error('Ошибка при запуске загрузки:', error);
        
        this.isLoading = false;
        clearInterval(this.timer);
        this.timer = null;
        
        this.showDialog({
          type: 'error',
          title: 'Ошибка загрузки',
          message: error.message
        });
      }
    },
    
    async cancelLoading() {
      this.showDialog({
        type: 'warning',
        title: 'Подтверждение',
        message: 'Вы уверены, что хотите отменить загрузку комментариев?',
        confirmText: 'Отменить загрузку',
        cancelText: 'Продолжить загрузку',
        showCancel: true,
        onConfirm: async () => {
          try {
            await api.cancelRefreshAll();
            this.isLoading = false;
            clearInterval(this.timer);
            this.timer = null;
            
            this.showDialog({
              type: 'info',
              title: 'Загрузка отменена',
              message: 'Загрузка комментариев была отменена.'
            });
          } catch (error) {
            console.error('Ошибка при отмене загрузки:', error);
            
            this.showDialog({
              type: 'error',
              title: 'Ошибка',
              message: `Ошибка при отмене загрузки: ${error.message}`
            });
          }
        }
      });
    },
    
    async testProxy() {
      this.testingProxy = true;
      try {
        const response = await api.testProxy();
        if (response.data.success) {
          this.showDialog({
            type: 'success',
            title: 'Прокси работает',
            message: response.data.message
          });
        } else {
          this.showDialog({
            type: 'error',
            title: 'Ошибка прокси',
            message: response.data.error
          });
        }
      } catch (error) {
        this.showDialog({
          type: 'error',
          title: 'Ошибка',
          message: `Не удалось выполнить тест прокси: ${error.message}`
        });
      } finally {
        this.testingProxy = false;
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
    }
  }
};
</script>

<style scoped>
.stat-card {
  @apply bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2563eb;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2563eb;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}
</style> 