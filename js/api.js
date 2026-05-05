/**
 * ============================================
 * API 调用封装层
 * ============================================
 *
 * 【使用说明】
 * 当前已连接真实后端：http://172.17.74.231:8080/api
 * 如需切回 Mock 模式，将 USE_MOCK 改为 true 即可。
 *
 * 【后端接口路径对照】
 * 注册/登录: /api/auth/register, /api/auth/login
 * 流水记录: /api/transactions (原 /api/records)
 * 分类统计: /api/statistics/expense-pie (原 /api/stats/category)
 */

// ========== 配置 ==========
const USE_MOCK = false; // 已切换到真实后端（改回 true 可用 Mock 模式）
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

// ========== API 方法 ==========

const API = {
  /**
   * 用户注册
   * POST /api/auth/register
   * 请求体: { username, password, nickname }
   * 响应: { code: 200, message: "注册成功", data: { id, username, nickname } }
   */
  async register(username, password, nickname) {
    if (USE_MOCK) {
      return MockAPI.register({ username, password, nickname });
    }
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, nickname })
    });
    return res.json();
  },

  /**
   * 用户登录
   * POST /api/auth/login
   * 请求体: { username, password }
   * 响应: { code: 200, message: "登录成功", data: { id, username, nickname, token } }
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
    // 登录成功后保存用户信息和 token
    if (data.code === 200 && data.data) {
      saveCurrentUser(data.data);
    }
    return data;
  },

  /**
   * 获取流水列表
   * GET /api/transactions?type=expense|income
   * 【后端实际路径】/api/transactions（原 /api/records）
   * 响应: { code: 200, data: [ { id, type, category, amount, date, remark } ] }
   */
  async getRecords(type) {
    if (USE_MOCK) {
      return MockAPI.getRecords({ type });
    }
    const params = type ? `?type=${type}` : "";
    const user = getCurrentUser();
    const res = await fetch(`${BASE_URL}/transactions${params}`, {
      headers: { "Authorization": `Bearer ${user.token}` }
    });
    return res.json();
  },

  /**
   * 添加收支记录
   * POST /api/transactions
   * 【后端实际路径】/api/transactions（原 /api/records）
   * Body: {type, amount, category, date, remark}
   * 响应: { code: 200, message: "添加成功", data: { id, ... } }
   */
  async addRecord(record) {
    if (USE_MOCK) {
      return MockAPI.addRecord(record);
    }
    const user = getCurrentUser();
    // 按后端要求的字段顺序发送
    const body = {
      type: record.type,
      amount: record.amount,
      category: record.category,
      date: record.date,
      remark: record.remark
    };
    const res = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify(body)
    });
    return res.json();
  },

  /**
   * 编辑记录
   * PUT /api/transactions/{id}
   * 【后端实际路径】/api/transactions/{id}（原 /api/records/:id）
   * 响应: { code: 200, message: "修改成功", data: { ... } }
   */
  async updateRecord(id, record) {
    if (USE_MOCK) {
      return MockAPI.updateRecord(id, record);
    }
    const user = getCurrentUser();
    const body = {
      type: record.type,
      amount: record.amount,
      category: record.category,
      date: record.date,
      remark: record.remark
    };
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify(body)
    });
    return res.json();
  },

  /**
   * 删除记录
   * DELETE /api/transactions/{id}
   * 【后端实际路径】/api/transactions/{id}（原 /api/records/:id）
   * 响应: { code: 200, message: "删除成功" }
   */
  async deleteRecord(id) {
    if (USE_MOCK) {
      return MockAPI.deleteRecord(id);
    }
    const user = getCurrentUser();
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${user.token}` }
    });
    return res.json();
  },

  /**
   * 按分类统计（支出饼图）
   * GET /api/statistics/expense-pie?yearMonth=2025-05
   * 【后端实际路径】/api/statistics/expense-pie（原 /api/stats/category）
   * 响应: 饼图数据格式，如需报表用 /api/statistics/monthly-report
   */
  async getStatsByCategory(type) {
    if (USE_MOCK) {
      return MockAPI.getStatsByCategory({ type });
    }
    const user = getCurrentUser();
    // 获取当前年月，格式：2025-05
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`${BASE_URL}/statistics/expense-pie?yearMonth=${yearMonth}`, {
      headers: { "Authorization": `Bearer ${user.token}` }
    });
    const data = await res.json();
    // 如果后端返回饼图格式，需要适配成前端需要的 {category, total, count} 格式
    // 这里假设后端返回格式兼容，如果不兼容需要额外转换
    return data;
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
