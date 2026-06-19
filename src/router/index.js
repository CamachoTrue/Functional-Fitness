import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/PublicLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/public/HomeView.vue'),
        },
        {
          path: 'packages',
          name: 'packages',
          component: () => import('../views/public/PackagesView.vue'),
        },
        {
          path: 'package/:id',
          name: 'package-detail',
          component: () => import('../views/public/PackageDetailView.vue'),
          props: true,
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('../views/auth/LoginView.vue'),
          meta: { guestOnly: true },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('../views/auth/RegisterView.vue'),
          meta: { guestOnly: true },
        },
      ],
    },
    {
      path: '/client',
      component: () => import('../layouts/ClientLayout.vue'),
      meta: { requiresAuth: true, role: 'client' },
      children: [
        {
          path: 'dashboard',
          name: 'client-dashboard',
          component: () => import('../views/client/ClientDashboardView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

export default router
