import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import LoadingDashboard from '../views/LoadingDashboard.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/reviews',
      name: 'reviews',
      component: () => import('../views/Reviews.vue')
    },
    {
      path: '/reviews/:postNumber',
      name: 'review-details',
      component: () => import('../views/ReviewDetails.vue'),
      props: true
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/Search.vue')
    },
    {
      path: '/loading',
      name: 'loading',
      component: LoadingDashboard,
      meta: {
        title: 'Загрузка комментариев'
      }
    }
  ]
})

export default router 