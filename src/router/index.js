import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../stores/authStore'

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
        {
          path: 'payment/success',
          name: 'payment-success',
          component: () => import('../views/payment/PaymentResultView.vue'),
          meta: { status: 'approved' },
        },
        {
          path: 'payment/failure',
          name: 'payment-failure',
          component: () => import('../views/payment/PaymentResultView.vue'),
          meta: { status: 'rejected' },
        },
        {
          path: 'payment/pending',
          name: 'payment-pending',
          component: () => import('../views/payment/PaymentResultView.vue'),
          meta: { status: 'pending' },
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
        {
          path: 'purchases',
          name: 'client-purchases',
          component: () => import('../views/client/ClientPurchasesView.vue'),
        },
        {
          path: 'routine',
          name: 'client-routine',
          component: () => import('../views/client/ClientRoutineView.vue'),
        },
        {
          path: 'questionnaire/:purchaseId',
          name: 'client-questionnaire',
          component: () => import('../views/client/QuestionnaireView.vue'),
          props: true,
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
        {
          path: 'clients',
          name: 'admin-clients',
          component: () => import('../views/admin/AdminClientsView.vue'),
        },
        {
          path: 'clients/:id',
          name: 'admin-client-detail',
          component: () => import('../views/admin/AdminClientDetailView.vue'),
          props: true,
        },
        {
          path: 'purchases',
          name: 'admin-purchases',
          component: () => import('../views/admin/AdminPurchasesView.vue'),
        },
        {
          path: 'questionnaires',
          name: 'admin-questionnaires',
          component: () => import('../views/admin/AdminQuestionnairesView.vue'),
        },
        {
          path: 'packages',
          name: 'admin-packages',
          component: () => import('../views/admin/AdminPackagesView.vue'),
        },
        {
          path: 'packages/create',
          name: 'admin-package-create',
          component: () => import('../views/admin/AdminPackageFormView.vue'),
        },
        {
          path: 'packages/:id/edit',
          name: 'admin-package-edit',
          component: () => import('../views/admin/AdminPackageFormView.vue'),
          props: true,
        },
        {
          path: 'routines',
          name: 'admin-routines',
          component: () => import('../views/admin/AdminRoutinesView.vue'),
        },
        {
          path: 'routines/create',
          name: 'admin-routine-create',
          component: () => import('../views/admin/AdminRoutineBuilderView.vue'),
        },
        {
          path: 'routines/:id/edit',
          name: 'admin-routine-edit',
          component: () => import('../views/admin/AdminRoutineBuilderView.vue'),
          props: true,
        },
        {
          path: 'exercises',
          name: 'admin-exercises',
          component: () => import('../views/admin/AdminExercisesView.vue'),
        },
        {
          path: 'exercises/create',
          name: 'admin-exercise-create',
          component: () => import('../views/admin/AdminExerciseFormView.vue'),
        },
        {
          path: 'exercises/:id/edit',
          name: 'admin-exercise-edit',
          component: () => import('../views/admin/AdminExerciseFormView.vue'),
          props: true,
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

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Recupera la sesión persistida una sola vez, antes de resolver la primera ruta.
  // Un fallo aquí no debe abortar la navegación (dejaría una página en blanco).
  if (!auth.initialized) {
    try {
      await auth.initialize()
    } catch {
      // initialize() ya degrada errores internamente; este catch es defensivo.
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return auth.homeRoute
  }

  // Área admin: solo usuarios con rol admin. El resto vuelve a su panel.
  if (to.meta.role === 'admin' && !auth.isAdmin) {
    return auth.homeRoute
  }

  return true
})

export default router
