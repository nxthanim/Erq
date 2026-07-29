import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('erq_token');
      localStorage.removeItem('gebeya_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ====== FEATURES (Saved Gigs, Notifications, Dashboard, Skill Badges) ======
export const featuresAPI = {
  // Saved Gigs
  toggleSavedGig: (gigId) => api.post(`/features/saved-gigs/${gigId}`),
  getSavedGigs: () => api.get('/features/saved-gigs'),
  checkSavedGig: (gigId) => api.get(`/features/saved-gigs/check/${gigId}`),

  // Notifications
  getNotifications: () => api.get('/features/notifications'),
  markNotificationRead: (id) => api.put(`/features/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/features/notifications/read-all'),

  // Dashboard
  getDashboardStats: () => api.get('/features/dashboard'),
  getActivityFeed: (limit) => api.get('/features/activity-feed', { params: { limit } }),

  // Skill Badges
  getUserBadges: (userId) => api.get(`/features/skill-badges/${userId}`),

  // Gig View Counter
  getTrendingGigs: () => api.get('/gigs/trending'),
  getPopularGigs: () => api.get('/gigs/popular'),

  // Dispute Resolution
  createDispute: (data) => api.post('/features/disputes', data),
  addDisputeEvidence: (id, data) => api.put(`/features/disputes/${id}/evidence`, data),
  updateDisputeStatus: (id, data) => api.put(`/features/disputes/${id}/status`, data),
  getDisputes: () => api.get('/features/disputes'),

  // Portfolio Gallery
  getPortfolio: (userId) => api.get(`/features/portfolio/${userId}`),
  addPortfolioItem: (data) => api.post('/features/portfolio', data),
  deletePortfolioItem: (id) => api.delete(`/features/portfolio/${id}`),

  // Referral System
  generateReferral: () => api.post('/features/referral/generate'),
  getReferralStats: () => api.get('/features/referral/stats'),
  lookupReferral: (code) => api.get(`/features/referral/lookup/${code}`),
  redeemReferral: (data) => api.post('/features/referral/redeem', data),
};

// Orders (Gig Purchases with Escrow)
export const ordersAPI = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  accept: (id) => api.put(`/orders/${id}/accept`),
  deliver: (id, data) => api.put(`/orders/${id}/deliver`, data),
  complete: (id) => api.put(`/orders/${id}/complete`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  dispute: (id) => api.put(`/orders/${id}/dispute`),
};

// User Analytics (available to all authenticated users)
export const userAnalyticsAPI = {
  getOverview: (range) => api.get('/user/analytics/overview', { params: { range } }),
  getGigs: (range) => api.get('/user/analytics/gigs', { params: { range } }),
  getEarnings: (range) => api.get('/user/analytics/earnings', { params: { range } }),
  getMessages: (range) => api.get('/user/analytics/messages', { params: { range } }),
  getJobs: (range) => api.get('/user/analytics/jobs', { params: { range } }),
};

// Wallet
export const walletAPI = {
  getOverview: () => api.get('/wallet/overview'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
  recordPinAttempt: (type) => api.post('/wallet/pin-attempt', { type }),
  getPinStatus: () => api.get('/wallet/pin-status'),
};

export default api;

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadProfilePicture: (formData) => api.put('/users/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Email verification
  verifyEmail: (email, verificationData) => api.post('/auth/verify-email', { email, verificationData }),
  getVerificationStatus: (email) => api.get(`/auth/verification-status/${encodeURIComponent(email)}`),
  // Password reset
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users
export const usersAPI = {
  getFreelancers: (params) => api.get('/users/freelancers', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getTopFreelancers: (sortBy) => api.get('/users/top-freelancers', { params: { sortBy } }),
  searchUsers: (q, limit) => api.get('/users/search', { params: { q, limit } }),
  getOnlineStatus: (userIds) => api.get('/users/online-status', { params: { userIds: userIds.join(',') } })
};

// Gigs
export const gigsAPI = {
  list: (params) => api.get('/gigs', { params }),
  get: (id) => api.get(`/gigs/${id}`),
  create: (data) => api.post('/gigs', data),
  update: (id, data) => api.put(`/gigs/${id}`, data),
  delete: (id) => api.delete(`/gigs/${id}`),
  trending: () => api.get('/gigs/trending'),
  popular: () => api.get('/gigs/popular')
};

// Jobs
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  bid: (jobId, data) => api.post(`/jobs/${jobId}/bid`, data),
  quickOrder: (jobId, data) => api.post(`/jobs/${jobId}/quick-order`, data),
  award: (jobId, data) => api.put(`/jobs/${jobId}/award`, data),
  deliver: (jobId, data) => api.put(`/jobs/${jobId}/deliver`, data),
  updateStatus: (jobId, data) => api.put(`/jobs/${jobId}/status`, data),
  delete: (id) => api.delete(`/jobs/${id}`)
};

// Messages
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  send: (data) => api.post('/messages', data),
  getUnreadCount: () => api.get('/messages/unread/count'),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Payments
export const paymentsAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  confirm: (data) => api.post('/payments/confirm', data),
  release: (data) => api.post('/payments/release', data),
  dispute: (data) => api.post('/payments/dispute', data),
  getTransactions: () => api.get('/payments/transactions'),
  confirmBiometric: (data) => api.post('/payments/confirm-biometric', data),
  verifyReceipt: (data) => api.post('/payments/verify-receipt', data),
  initiateChapa: (data) => api.post('/payments/chapa/initiate', data),
  verifyChapa: (tx_ref) => api.post('/payments/chapa/verify', { tx_ref }),
};

// Reviews
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getUserReviews: (userId) => api.get(`/reviews/user/${userId}`)
};

// Categories
export const categoriesAPI = {
  list: (params) => api.get('/categories', { params }),
  listAll: () => api.get('/categories/all'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  verifyUser: (userId) => api.put(`/admin/users/${userId}/verify`),
  getGigs: () => api.get('/admin/gigs'),
  getJobs: () => api.get('/admin/jobs'),
  getTransactions: () => api.get('/admin/transactions'),
  resolveDispute: (transactionId, action) => api.put(`/admin/disputes/${transactionId}/resolve`, { action }),
  getNotifications: () => api.get('/admin/notifications'),
  getAnalytics: () => api.get('/admin/analytics'),
  getFinancialAnalytics: (range) => api.get('/admin/analytics/financial', { params: { range } }),
  getMessagesAnalytics: (range) => api.get('/admin/analytics/messages', { params: { range } }),
  getPlatformAnalytics: (range) => api.get('/admin/analytics/platform', { params: { range } }),
  getPaymentsAnalytics: (range) => api.get('/admin/analytics/payments', { params: { range } }),
  getDisputesAnalytics: (range) => api.get('/admin/analytics/disputes', { params: { range } }),

  getReferralsAnalytics: () => api.get('/admin/analytics/referrals'),
  get: (url) => api.get(url),
  getBiometricEvidence: () => api.get('/admin/biometric-evidence'),
  getReviews: (params) => api.get('/admin/reviews', { params }),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
};

// Business Dashboard
export const businessAPI = {
  getOverview: () => api.get('/business/overview'),
  getCompetitors: () => api.get('/business/competitors'),
  getTransactions: (params) => api.get('/business/transactions', { params }),
  getCustomers: () => api.get('/business/customers'),
  createCustomer: (data) => api.post('/business/customers', data),
  updateCustomer: (id, data) => api.put(`/business/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/business/customers/${id}`),
  getMeetings: () => api.get('/business/meetings'),
  createMeeting: (data) => api.post('/business/meetings', data),
  updateMeeting: (id, data) => api.put(`/business/meetings/${id}`, data),
  getInvoices: () => api.get('/business/invoices'),
  createInvoice: (data) => api.post('/business/invoices', data),
  updateInvoice: (id, data) => api.put(`/business/invoices/${id}`, data),
  getTeam: () => api.get('/business/team'),
  createTeamMember: (data) => api.post('/business/team', data),
  updateTeamMember: (id, data) => api.put(`/business/team/${id}`, data),
  deleteTeamMember: (id) => api.delete(`/business/team/${id}`),
  getRevenue: () => api.get('/business/revenue'),
};

// AI Image Generation
export const aiAPI = {
  // Image-to-image editing (FLUX.1-kontext-dev) — requires an input image
  generateImage: (data) => api.post('/ai/generate-image', data),
  // Text-to-image generation (FLUX-schnell) — no input image needed
  generateImageTxt2img: (data) => api.post('/ai/generate-image-txt2img', data),
  chat: (data) => api.post('/ai/chat', data),
  generateGig: (data) => api.post('/ai/generate-gig', data),

  getRecommendations: (params) => api.get('/ai/recommendations', { params }),
  smartMatch: (data) => api.post('/ai/smart-match', data),
};

// AI Agents & Subagents
export const agentsAPI = {
  list: () => api.get('/agents'),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  getConversations: (agentId) => api.get(`/agents/${agentId}/conversations`),
  createConversation: (agentId, data) => api.post(`/agents/${agentId}/conversations`, data),
  deleteConversation: (agentId, convId) => api.delete(`/agents/${agentId}/conversations/${convId}`),
  getMessages: (agentId, convId) => api.get(`/agents/${agentId}/conversations/${convId}/messages`),
  sendMessage: (agentId, convId, data) => api.post(`/agents/${agentId}/conversations/${convId}/messages`, data),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/agents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
