import api from './axios';

export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (typeof err === 'string') return err;
  return err?.response?.data?.message || err?.message || fallback;
};

const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  logoutAll: () => api.post('/auth/logout-all'),
};

const dashboardApi = {
  get: (params) => api.get('/dashboard', { params }),
};

const deadHenApi = {
  getAll: (params) => api.get('/dead-hens', { params }),
  dashboardStats: () => api.get('/dead-hens/dashboard-stats'),
  create: (data) => api.post('/dead-hens', data),
  update: (id, data) => api.put(`/dead-hens/${id}`, data),
  remove: (id) => api.delete(`/dead-hens/${id}`),
};

const setsApi = {
  getAll: () => api.get('/poultry-sets'),
  create: (data) => api.post('/poultry-sets', data),
  update: (id, data) => api.put(`/poultry-sets/${id}`, data),
  remove: (id) => api.delete(`/poultry-sets/${id}`),
};

const birdsApi = {
  getAll: (params) => api.get('/birds', { params }),
  create: (data) => api.post('/birds', data),
  update: (id, data) => api.put(`/birds/${id}`, data),
  remove: (id) => api.delete(`/birds/${id}`),
};

const eggsApi = {
  getAll: (params) => api.get('/eggs', { params }),
  todaySummary: () => api.get('/eggs/today-summary'),
  create: (data) => api.post('/eggs', data),
  update: (id, data) => api.put(`/eggs/${id}`, data),
  remove: (id) => api.delete(`/eggs/${id}`),
};

const eggStockApi = {
  getAll: (params) => api.get('/egg-stock', { params }),
  latest: () => api.get('/egg-stock/latest'),
  adjust: (data) => api.post('/egg-stock/adjust', data),
};

const eggPriceApi = {
  current: () => api.get('/egg-prices/current'),
  refresh: () => api.get('/egg-prices/refresh'),
  getAll: (params) => api.get('/egg-prices', { params }),
  create: (data) => api.post('/egg-prices', data),
  update: (id, data) => api.put(`/egg-prices/${id}`, data),
};

const feedApi = {
  getAll: (params) => api.get('/feed', { params }),
  stock: () => api.get('/feed/stock'),
  create: (data) => api.post('/feed', data),
  update: (id, data) => api.put(`/feed/${id}`, data),
  remove: (id) => api.delete(`/feed/${id}`),
};

const feedUsageApi = {
  getAll: (params) => api.get('/feed-usage', { params }),
  summary: () => api.get('/feed-usage/summary'),
  create: (data) => api.post('/feed-usage', data),
  update: (id, data) => api.put(`/feed-usage/${id}`, data),
  remove: (id) => api.delete(`/feed-usage/${id}`),
};

const expensesApi = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
};

const laboursApi = {
  getAll: (params) => api.get('/labours', { params }),
  get: (id, params) => api.get(`/labours/${id}`, { params }),
  create: (data) => api.post('/labours', data),
  update: (id, data) => api.put(`/labours/${id}`, data),
  toggle: (id) => api.put(`/labours/${id}/toggle`),
  remove: (id) => api.delete(`/labours/${id}`),
};

const labourExpensesApi = {
  getAll: (params) => api.get('/labour-expenses', { params }),
  create: (data) => api.post('/labour-expenses', data),
  createCommon: (data) => api.post('/labour-expenses/common', data),
  deleteGroup: (group) => api.delete(`/labour-expenses/common/${group}`),
  update: (id, data) => api.put(`/labour-expenses/${id}`, data),
  remove: (id) => api.delete(`/labour-expenses/${id}`),
};

const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  create: (data) => api.post('/customers', data),
  get: (id) => api.get(`/customers/${id}`),
  ledger: (id) => api.get(`/customers/${id}/ledger`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};

const salesApi = {
  getAll: (params) => api.get('/local-sales', { params }),
  create: (data) => api.post('/local-sales', data),
  update: (id, data) => api.put(`/local-sales/${id}`, data),
  remove: (id) => api.delete(`/local-sales/${id}`),
};

const wholesaleApi = {
  getAll: (params) => api.get('/wholesale-sales', { params }),
  today: () => api.get('/wholesale-sales/today'),
  brokenAvailable: (params) => api.get('/wholesale-sales/broken-available', { params }),
  create: (data) => api.post('/wholesale-sales', data),
  update: (id, data) => api.put(`/wholesale-sales/${id}`, data),
  remove: (id) => api.delete(`/wholesale-sales/${id}`),
};

const paymentsApi = {
  getAll: (params) => api.get('/customer-payments', { params }),
  create: (data) => api.post('/customer-payments', data),
  update: (id, data) => api.put(`/customer-payments/${id}`, data),
};

const reportsApi = {
  summary: (params) => api.get('/reports/summary', { params }),
  data: (params) => api.get('/reports/data', { params }),
  exportCsv: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
};

const auditApi = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  stats: () => api.get('/settings/stats'),
  exportData: () => api.get('/settings/export', { responseType: 'blob' }),
};

export {
  authApi,
  dashboardApi,
  deadHenApi,
  setsApi,
  birdsApi,
  eggsApi,
  eggStockApi,
  eggPriceApi,
  feedApi,
  feedUsageApi,
  expensesApi,
  laboursApi,
  labourExpensesApi,
  customersApi,
  salesApi,
  wholesaleApi,
  paymentsApi,
  reportsApi,
  auditApi,
  settingsApi,
};