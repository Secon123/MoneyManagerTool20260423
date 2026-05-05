/**
 * ============================================
 * API 调用封装层
 * ============================================
 *
 * 【使用说明】
 * 当前使用 MockAPI（localStorage 模拟）。
 * 当后端就绪后，只需：
 * 1. 将 USE_MOCK 改为 false
 * 2. 将 BASE_URL 改为真实后端地址
 * 3. 所有调用接口的代码无需修改
 *
 * 【请求/响应格式】
 * 所有接口统一响应格式：
 * {
 *   code: 200,        // 200=成功, 400=参数错误, 401=未登录, 404=不存在
 *   message: "成功",   // 提示信息
 *   data: {}          // 业务数据
 * }
 */

// ========== 配置 ==========
const USE_MOCK = true; // 改为 false 即切换到真实后端
const BASE_URL = "http://localhost:8080/api"; // 真实后端地址

// ========== 工具函数 ==========

/**
 * 显示 Toast 提示
 */
function showToast(message, type = "") {
  // 移除已有的 toast
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 触发动画
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
 */
function getCurrentUser() {
  return MockAPI.getCurrentUser();
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
  MockAPI.logout();
  window.location.href = "index.html";
}

// ========== API 方法 ==========

const API = {
  /**
   * 用户注册
   * POST /api/auth/register
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} nickname - 昵称（可选）
   * @returns {Promise<{code, message, data}>}
   */
  async register(username, password, nickname) {
    if (USE_MOCK) {
      return MockAPI.register({ username, password, nickname });
    }
    // 【真实后端调用】
    // const res = await fetch(`${BASE_URL}/auth/register`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ username, password, nickname })
    // });
    // return res.json();
  },

  /**
   * 用户登录
   * POST /api/auth/login
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{code, message, data: {id, username, nickname, token}}>}
   */
  async login(username, password) {
    if (USE_MOCK) {
      return MockAPI.login({ username, password });
    }
    // 【真实后端调用】
    // const res = await fetch(`${BASE_URL}/auth/login`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ username, password })
    // });
    // return res.json();
  },

  /**
   * 获取流水列表
   * GET /api/records?type=expense|income
   * @param {string} type - 可选，"expense" 或 "income"
   * @returns {Promise<{code, data: Array}>}
   */
  async getRecords(type) {
    if (USE_MOCK) {
      return MockAPI.getRecords({ type });
    }
    // 【真实后端调用】
    // const params = type ? `?type=${type}` : "";
    // const user = getCurrentUser();
    // const res = await fetch(`${BASE_URL}/records${params}`, {
    //   headers: { "Authorization": `Bearer ${user.token}` }
    // });
    // return res.json();
  },

  /**
   * 添加收支记录
   * POST /api/records
   * @param {Object} record - { type, category, amount, date, remark }
   * @returns {Promise<{code, message, data}>}
   */
  async addRecord(record) {
    if (USE_MOCK) {
      return MockAPI.addRecord(record);
    }
    // 【真实后端调用】
    // const user = getCurrentUser();
    // const res = await fetch(`${BASE_URL}/records`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${user.token}`
    //   },
    //   body: JSON.stringify(record)
    // });
    // return res.json();
  },

  /**
   * 编辑记录
   * PUT /api/records/:id
   * @param {number} id - 记录 ID
   * @param {Object} record - { type, category, amount, date, remark }
   * @returns {Promise<{code, message, data}>}
   */
  async updateRecord(id, record) {
    if (USE_MOCK) {
      return MockAPI.updateRecord(id, record);
    }
    // 【真实后端调用】
    // const user = getCurrentUser();
    // const res = await fetch(`${BASE_URL}/records/${id}`, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${user.token}`
    //   },
    //   body: JSON.stringify(record)
    // });
    // return res.json();
  },

  /**
   * 删除记录
   * DELETE /api/records/:id
   * @param {number} id - 记录 ID
   * @returns {Promise<{code, message}>}
   */
  async deleteRecord(id) {
    if (USE_MOCK) {
      return MockAPI.deleteRecord(id);
    }
    // 【真实后端调用】
    // const user = getCurrentUser();
    // const res = await fetch(`${BASE_URL}/records/${id}`, {
    //   method: "DELETE",
    //   headers: { "Authorization": `Bearer ${user.token}` }
    // });
    // return res.json();
  },

  /**
   * 按分类统计
   * GET /api/stats/category?type=expense
   * @param {string} type - "expense" 或 "income"
   * @returns {Promise<{code, data: Array<{category, total, count}>}>}
   */
  async getStatsByCategory(type) {
    if (USE_MOCK) {
      return MockAPI.getStatsByCategory({ type });
    }
    // 【真实后端调用】
    // const user = getCurrentUser();
    // const res = await fetch(`${BASE_URL}/stats/category?type=${type}`, {
    //   headers: { "Authorization": `Bearer ${user.token}` }
    // });
    // return res.json();
  },

  /**
   * 获取分类列表
   * @param {string} type - "expense" 或 "income"
   * @returns {string[]}
   */
  getCategories(type) {
    return MockAPI.getCategories(type);
  }
};
