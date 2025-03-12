<script setup>
import { ref } from 'vue'

const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const navLinks = [
  { name: 'Главная', route: '/' },
  { name: 'Проверить комментарий', route: '/verify' },
  { name: 'Все комментарии', route: '/reviews' },
  { name: 'Загрузка', route: '/loading' }
]
</script>

<template>
  <header class="bg-white shadow-md dark:bg-slate-800 dark:text-white">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">NL Forum</span>
          </router-link>
          
          <nav class="hidden md:flex space-x-4">
            <router-link 
              v-for="item in navItems" 
              :key="item.path" 
              :to="item.path"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-700"
              :class="{ 'bg-gray-100 dark:bg-slate-700': isActive(item.path) }"
            >
              {{ item.name }}
            </router-link>
          </nav>
        </div>
        
        <div class="hidden md:block">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <input 
                type="text" 
                placeholder="Поиск комментария..." 
                class="form-input pr-10"
                v-model="searchQuery"
                @keyup.enter="goToSearch"
              />
              <button 
                class="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                @click="goToSearch"
              >
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="-mr-2 flex md:hidden">
          <button 
            @click="toggleMobileMenu"
            class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
          >
            <i class="fas" :class="isOpen ? 'fa-times' : 'fa-bars'"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Мобильное меню -->
    <div v-show="isOpen" class="md:hidden">
      <div class="px-2 pt-2 pb-3 space-y-1">
        <router-link 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-slate-700"
          :class="{ 'bg-gray-100 dark:bg-slate-700': isActive(item.path) }"
          @click="isOpen = false"
        >
          {{ item.name }}
        </router-link>
        
        <div class="mt-4 px-3">
          <div class="relative">
            <input 
              type="text" 
              placeholder="Поиск комментария..." 
              class="form-input pr-10"
              v-model="searchQuery"
              @keyup.enter="goToSearch"
            />
            <button 
              class="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              @click="goToSearch"
            >
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Navbar',
  data() {
    return {
      isOpen: false,
      searchQuery: '',
      navItems: [
        { name: 'Главная', path: '/' },
        { name: 'Комментарии', path: '/reviews' },
        { name: 'Поиск', path: '/search' },
        { name: 'Загрузка', path: '/loading' }
      ]
    }
  },
  methods: {
    toggleMobileMenu() {
      this.isOpen = !this.isOpen;
    },
    isActive(path) {
      return this.$route.path === path;
    },
    goToSearch() {
      if (this.searchQuery.trim()) {
        this.$router.push({ 
          path: '/search', 
          query: { q: this.searchQuery.trim() } 
        });
        this.isOpen = false;
      }
    }
  }
}
</script>

<style scoped>
.router-link-active {
  font-weight: bold;
  border-bottom: 2px solid white;
}
</style> 