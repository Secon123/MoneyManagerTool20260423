/**
 * ============================================
 * API 调用封装层（已对齐后端接口文档）
 * ============================================
 *
 * 【后端接口文档对照】
 * Base URL: http://172.17.74.231:8080/api
 * 认证: 除 /auth/register、/auth/login 外，所有请求需在 Header 携带
 *        Authorization: Bearer <token>
 * 日期格式: yyyy-MM-dd（如 2025-05-07），月份格式 yyyy-MM（如 2025-05）
 * 金额: Number，支持两位小数
 *
 * 【接口列表】
 * 1.1 POST /auth/register          - 用户注册
 * 1.2 POST /auth/login             - 用户登录
 * 2.1 POST /transactions           - 添加记录
 * 2.2 PUT  /transactions/{id}      - 修改记录
 * 2.3 DELETE /transactions/{id}    - 删除记录
 * 2.4 GET  /transactions           - 查询记录列表（分页+日期过滤）
 * 3.1 POST /budgets                - 设置预算
 * 3.2 PUT  /budgets/{id}           - 更新预算
 * 3.3 GET  /budgets?month=yyyy-MM  - 查询某月所有预算
 * 4.1 GET  /statistics/monthly-report?yearMonth=yyyy-MM  - 月度报表
 * 4.2 GET  /statistics/expense-pie?yearMonth=yyyy-MM     - 支出饼图数据
 * 4.3 GET  /statistics/trend?start=&end=                 - 趋势折线图
 */

// ========== 配置 ==========
const USE_MOCK = false; // 切换到真实后端（改回 true 可用 Mock 模式）
const BASE_URL = "http://172.17.74.231:8080/api"; // 后端服务地址

// ========== 工具函数 ==========

/**
 * 显示 Toast 提示
 */
function showToast(message, type = "") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * 获取当前用户（从 localStorage）
 * 后端登录返回: { token, userId, username }
 */
function getCurrentUser() {
  if (USE_MOCK) {
    return MockAPI.getCurrentUser();
  }
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

/**
 * 保存当前用户信息到 localStorage
 */
function saveCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

/**
 * 检查登录状态，未登录则跳转到登录页
 */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

/**
 * 退出登录
 */
function logout() {
  if (USE_MOCK) {
    MockAPI.logout();
  } else {
    localStorage.removeItem("currentUser");
  }
  window.location.href = "index.html";
}

/**
 * 获取请求头（带 Token）
 */
function getAuthHeaders() {
  const user = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${user.token}`
  };
}

// ========== API 方法 ==========

const API = {

  // ==========================================
  //  1. 认证接口
  // ==========================================

  /**
   * 1.1 用户注册
   * POST /auth/register
   * 请求体: { username, password, email }
   *   - email: 非必填，可暂存昵称
   * 响应: { code: 200, message: "...", data: null }
   */
  async register(username, password, nickname) {
    if (USE_MOCK) {
      return MockAPI.register({ username, password, nickname });
    }
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        email: nickname || null // 昵称暂存到 email 字段
      })
    });
    return res.json();
  },

  /**
   * 1.2 用户登录
   * POST /auth/login
   * 请求体: { username, password }
   * 响应: { code: 200, message: "success", data: { token, userId, username } }
   */
  async login(username, password) {
    if (USE_MOCK) {
      return MockAPI.login({ username, password });
    }
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    // 登录成功后保存 token 和用户信息
    if (data.code === 200 && data.data) {
      saveCurrentUser(data.data);
    }
    return data;
  },

  // ==========================================
  //  2. 交易记录（流水）
  // ==========================================

  /**
   * 2.1 添加记录
   * POST /transactions
   * 请求体: { type: "EXPENSE"|"INCOME", amount, category, date, remark }
   * 响应: { code: 200, data: { id, userId, type, amount, category, date, remark, warning } }
   */
  async addRecord(record) {
    if (USE_MOCK) {
      return MockAPI.addRecord(record);
    }
    const res = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: record.type,       // "EXPENSE" 或 "INCOME"（大写）
        amount: parseFloat(record.amount),
        category: record.category,
        date: record.date,
        remark: record.remark || ""
      })
    });
    return res.json();
  },

  /**
   * 2.2 修改记录
   * PUT /transactions/{id}
   * 请求体: 同添加记录
   * 响应: 同添加记录
   */
  async updateRecord(id, record) {
    if (USE_MOCK) {
      return MockAPI.updateRecord(id, record);
    }
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: record.type,
        amount: parseFloat(record.amount),
        category: record.category,
        date: record.date,
        remark: record.remark || ""
      })
    });
    return res.json();
  },

  /**
   * 2.3 删除记录
   * DELETE /transactions/{id}
   * 响应: { code: 200, message: "Deleted successfully", data: null }
   */
  async deleteRecord(id) {
    if (USE_MOCK) {
      return MockAPI.deleteRecord(id);
    }
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * 2.4 查询记录列表（分页 + 日期过滤）
   * GET /transactions?start=&end=&page=&size=&sort=
   * 参数:
   *   start - 开始日期，默认 2000-01-01
   *   end   - 结束日期，默认当天
   *   page  - 页码，从0开始，默认0
   *   size  - 每页大小，默认20
   *   sort  - 排序字段，如 date,desc
   * 响应: Spring Data 分页对象
   *   { code: 200, data: { content: [...], totalPages, totalElements, ... } }
   */
  async getRecords({ start, end, page = 0, size = 20, sort = "date,desc" } = {}) {
    if (USE_MOCK) {
      return MockAPI.getRecords({ type: undefined });
    }
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    params.set("page", page);
    params.set("size", size);
    params.set("sort", sort);

    const res = await fetch(`${BASE_URL}/transactions?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  //  3. 预算管理
  // ==========================================

  /**
   * 3.1 设置预算
   * POST /budgets
   * 请求体: { category, monthLimit, month }
   * 响应: { code: 200, data: { id, userId, category, monthLimit, month } }
   */
  async setBudget({ category, monthLimit, month }) {
    if (USE_MOCK) {
      return { code: 200, data: { id: 1, category, monthLimit, month } };
    }
    const res = await fetch(`${BASE_URL}/budgets`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        category,
        monthLimit: parseFloat(monthLimit),
        month
      })
    });
    return res.json();
  },

  /**
   * 3.2 更新预算
   * PUT /budgets/{id}
   * 请求体: 同设置预算（DTO要求全量）
   * 响应: 同设置预算
   */
  async updateBudget(id, { category, monthLimit, month }) {
    if (USE_MOCK) {
      return { code: 200, data: { id, category, monthLimit, month } };
    }
    const res = await fetch(`${BASE_URL}/budgets/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        category,
        monthLimit: parseFloat(monthLimit),
        month
      })
    });
    return res.json();
  },

  /**
   * 3.3 查询某月所有预算
   * GET /budgets?month=2025-05（必填）
   * 响应: { code: 200, data: [ { id, userId, category, monthLimit, month } ] }
   */
  async getBudgets(month) {
    if (USE_MOCK) {
      return { code: 200, data: [] };
    }
    const res = await fetch(`${BASE_URL}/budgets?month=${month}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  //  4. 统计与报表
  // ==========================================

  /**
   * 4.1 月度报表（收入/支出/结余 + 分类支出明细）
   * GET /statistics/monthly-report?yearMonth=2025-05
   * 响应: {
   *   code: 200,
   *   data: {
   *     yearMonth, totalIncome, totalExpense, balance,
   *     categoryExpenses: [ { category, amount, percent } ]
   *   }
   * }
   */
  async getMonthlyReport(yearMonth) {
    if (USE_MOCK) {
      return MockAPI.getStatsByCategory({ type: "expense" });
    }
    const res = await fetch(`${BASE_URL}/statistics/monthly-report?yearMonth=${yearMonth}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * 4.2 支出饼图数据
   * GET /statistics/expense-pie?yearMonth=2025-05
   * 响应: { code: 200, data: { data: [ { name, value } ] } }
   */
  async getExpensePie(yearMonth) {
    if (USE_MOCK) {
      return { code: 200, data: { data: [] } };
    }
    const res = await fetch(`${BASE_URL}/statistics/expense-pie?yearMonth=${yearMonth}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * 4.3 趋势折线图（每日收支）
   * GET /statistics/trend?start=2025-05-01&end=2025-05-31
   * 参数: start（必填）, end（必填）
   * 响应: { code: 200, data: { dates: [], incomes: [], expenses: [] } }
   */
  async getTrend(start, end) {
    if (USE_MOCK) {
      return { code: 200, data: { dates: [], incomes: [], expenses: [] } };
    }
    const res = await fetch(`${BASE_URL}/statistics/trend?start=${start}&end=${end}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // ==========================================
  //  工具方法
  // ==========================================

  /**
   * 获取分类列表（前端内置，后端暂无此接口）
   * @param {string} type - "EXPENSE" 或 "INCOME"
   * @returns {string[]}
   */
  getCategories(type) {
    return MockAPI.getCategories(type === "INCOME" ? "income" : "expense");
  }
};
