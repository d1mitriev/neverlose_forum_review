<template>
  <footer class="bg-white dark:bg-slate-800 shadow-inner py-6">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <p class="text-gray-600 dark:text-gray-300">
            &copy; {{ currentYear }} NL Forum Comment Search. Все права защищены.
          </p>
        </div>
        
        <div class="flex space-x-4">
          <a href="#" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            <i class="fab fa-github"></i>
          </a>
          <a href="#" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            <i class="fab fa-discord"></i>
          </a>
          <a href="#" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            <i class="fab fa-telegram"></i>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
  computed: {
    currentYear() {
      return new Date().getFullYear();
    }
  }
}
</script> 