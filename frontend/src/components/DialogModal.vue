<template>
  <transition name="fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="fixed inset-0 bg-black bg-opacity-50" @click="$emit('update:modelValue', false)"></div>
      
            <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 z-10">
                <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800 dark:text-white" :class="titleClass">{{ title }}</h3>
          <button 
            @click="$emit('update:modelValue', false)" 
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
                <div class="mb-6 text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {{ message }}
        </div>
        
                <div class="flex justify-end space-x-3">
          <button 
            v-if="showCancel" 
            @click="$emit('update:modelValue', false); $emit('cancel')" 
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-gray-800 dark:text-white"
          >
            {{ cancelText }}
          </button>
          <button 
            @click="$emit('update:modelValue', false); $emit('confirm')" 
            class="px-4 py-2 rounded-md text-white"
            :class="buttonClass"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'DialogModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
    },
    title: {
      type: String,
      default: 'Информация'
    },
    message: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: 'OK'
    },
    cancelText: {
      type: String,
      default: 'Отмена'
    },
    showCancel: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    titleClass() {
      switch (this.type) {
        case 'success': return 'text-green-600';
        case 'warning': return 'text-yellow-600';
        case 'error': return 'text-red-600';
        default: return 'text-blue-600';
      }
    },
    buttonClass() {
      switch (this.type) {
        case 'success': return 'bg-green-600 hover:bg-green-700';
        case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
        case 'error': return 'bg-red-600 hover:bg-red-700';
        default: return 'bg-blue-600 hover:bg-blue-700';
      }
    }
  },
  emits: ['update:modelValue', 'confirm', 'cancel']
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 