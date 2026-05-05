/**
 * ============================================
 * Mock API 层 - 使用 localStorage 模拟 RESTful 后端
 * ============================================
 *
 * 【接口设计说明】
 * 所有接口遵循 RESTful 风格，当后端就绪后，只需将 api.js 中的
 * BASE_URL 改为真实后端地址，并移除 mock 拦截即可。
 *
 * 接口列表：
 * POST   /api/auth/register  - 用户注册
 * POST   /api/auth/login     - 用户登录
 * GET    /api/records        - 获取流水列表（支持 ?type=expense/income）
 * POST   /api/records        - 添加收支记录
 * PUT    /api/records/:id    - 编辑记录
 * DELETE /api/records/:id    - 删除记录
 * GET    /api/stats/category - 按分类统计支出
 */

const MockAPI = (function () {
  // ========== 数据初始化 ==========

  const STORAGE_KEY_USERS = "mock_users";
  const STORAGE_KEY_RECORDS = "mock_records";
  const STORAGE_KEY_CURRENT_USER = "mock_current_user";

  // 预置分类
  const EXPENSE_CATEGORIES = [
    "餐饮", "交通", "购物", "娱乐", "住房",
    "医疗", "教育", "通讯", "日用品", "其他支出"
  ];

  const INCOME_CATEGORIES = [
    "工资", "兼职", "红包", "理财", "其他收入"
  ];

  /**
   * 从 localStorage 读取数据，如不存在则初始化
   */
  function getData(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // 初始化默认用户（方便测试）
  function initDefaultData() {
    let users = getData(STORAGE_KEY_USERS, []);
    if (users.length === 0) {
      users = [
        {
          id: 1,
          username: "demo",
          password: "123456",
          nickname: "演示用户"
        }
      ];
      setData(STORAGE_KEY_USERS, users);
    }

    // 初始化一些示例记录
    let records = getData(STORAGE_KEY_RECORDS, []);
    if (records.length === 0) {
      const now = new Date();
      const fmt = (d) => d.toISOString().split("T")[0];
      records = [
        { id: 1, userId: 1, type: "expense", category: "餐饮", amount: 35.5, date: fmt(now), remark: "午餐外卖" },
        { id: 2, userId: 1, type: "expense", category: "交通", amount: 6, date: fmt(now), remark: "地铁" },
        { id: 3, userId: 1, type: "income", category: "工资", amount: 5000, date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), remark: "5月工资" },
        { id: 4, userId: 1, type: "expense", category: "购物", amount: 299, date: fmt(new Date(now.getTime() - 86400000)), remark: "买衣服" },
        { id: 5, userId: 1, type: "expense", category: "餐饮", amount: 22, date: fmt(new Date(now.getTime() - 86400000)), remark: "早餐+咖啡" },
        { id: 6, userId: 1, type: "expense", category: "娱乐", amount: 45, date: fmt(new Date(now.getTime() - 2 * 86400000)), remark: "看电影" },
        { id: 7, userId: 1, type: "expense", category: "餐饮", amount: 58, date: fmt(new Date(now.getTime() - 2 * 86400000)), remark: "朋友聚餐" },
        { id: 8, userId: 1, type: "income", category: "红包", amount: 200, date: fmt(new Date(now.getTime() - 3 * 86400000)), remark: "生日红包" },
      ];
      setData(STORAGE_KEY_RECORDS, records);
    }
  }

  initDefaultData();

  // ========== 模拟网络延迟 ==========
  function delay(ms = 300) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== 生成自增 ID ==========
  function nextId(records) {
    return records.length > 0 ? Math.max(...records.map((r) => r.id)) + 1 : 1;
  }

  // ========== 接口实现 ==========

  return {
    /**
     * 用户注册
     * POST /api/auth/register
     * 请求体: { username, password, nickname }
     * 响应: { code: 200, message: "注册成功", data: { id, username, nickname } }
     *       { code: 400, message: "用户名已存在" }
     */
    async register({ username, password, nickname }) {
      await delay();
      const users = getData(STORAGE_KEY_USERS, []);
      if (users.find((u) => u.username === username)) {
        return { code: 400, message: "用户名已存在" };
      }
      const newUser = {
        id: nextId(users),
        username,
        password,
        nickname: nickname || username
      };
      users.push(newUser);
      setData(STORAGE_KEY_USERS, users);
      return {
        code: 200,
        message: "注册成功",
        data: { id: newUser.id, username: newUser.username, nickname: newUser.nickname }
      };
    },

    /**
     * 用户登录
     * POST /api/auth/login
     * 请求体: { username, password }
     * 响应: { code: 200, message: "登录成功", data: { id, username, nickname, token } }
     *       { code: 401, message: "用户名或密码错误" }
     */
    async login({ username, password }) {
      await delay();
      const users = getData(STORAGE_KEY_USERS, []);
      const user = users.find(
        (u) => u.username === username && u.password === password
      );
      if (!user) {
        return { code: 401, message: "用户名或密码错误" };
      }
      // 模拟 token
      const token = "mock_token_" + user.id + "_" + Date.now();
      setData(STORAGE_KEY_CURRENT_USER, {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        token
      });
      return {
        code: 200,
        message: "登录成功",
        data: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          token
        }
      };
    },

    /**
     * 获取当前登录用户
     * 响应: { id, username, nickname, token } 或 null
     */
    getCurrentUser() {
      return getData(STORAGE_KEY_CURRENT_USER, null);
    },

    /**
     * 退出登录
     */
    logout() {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    },

    /**
     * 获取流水列表
     * GET /api/records?type=expense|income
     * 查询参数: type (可选，筛选类型)
     * 响应: { code: 200, data: [ { id, type, category, amount, date, remark } ] }
     */
    async getRecords({ type } = {}) {
      await delay();
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { code: 401, message: "未登录" };

      let records = getData(STORAGE_KEY_RECORDS, []).filter(
        (r) => r.userId === currentUser.id
      );

      if (type) {
        records = records.filter((r) => r.type === type);
      }

      // 按日期倒序
      records.sort((a, b) => new Date(b.date) - new Date(a.date));

      return { code: 200, data: records };
    },

    /**
     * 添加收支记录
     * POST /api/records
     * 请求体: { type: "expense"|"income", category, amount, date, remark }
     * 响应: { code: 200, message: "添加成功", data: { id, ... } }
     */
    async addRecord({ type, category, amount, date, remark }) {
      await delay();
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { code: 401, message: "未登录" };

      const records = getData(STORAGE_KEY_RECORDS, []);
      const newRecord = {
        id: nextId(records),
        userId: currentUser.id,
        type,
        category,
        amount: parseFloat(amount),
        date,
        remark: remark || ""
      };
      records.push(newRecord);
      setData(STORAGE_KEY_RECORDS, records);
      return { code: 200, message: "添加成功", data: newRecord };
    },

    /**
     * 编辑记录
     * PUT /api/records/:id
     * 请求体: { type, category, amount, date, remark }
     * 响应: { code: 200, message: "修改成功", data: { ... } }
     */
    async updateRecord(id, { type, category, amount, date, remark }) {
      await delay();
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { code: 401, message: "未登录" };

      const records = getData(STORAGE_KEY_RECORDS, []);
      const index = records.findIndex((r) => r.id === id && r.userId === currentUser.id);
      if (index === -1) return { code: 404, message: "记录不存在" };

      records[index] = {
        ...records[index],
        type,
        category,
        amount: parseFloat(amount),
        date,
        remark: remark || ""
      };
      setData(STORAGE_KEY_RECORDS, records);
      return { code: 200, message: "修改成功", data: records[index] };
    },

    /**
     * 删除记录
     * DELETE /api/records/:id
     * 响应: { code: 200, message: "删除成功" }
     */
    async deleteRecord(id) {
      await delay();
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { code: 401, message: "未登录" };

      let records = getData(STORAGE_KEY_RECORDS, []);
      const index = records.findIndex((r) => r.id === id && r.userId === currentUser.id);
      if (index === -1) return { code: 404, message: "记录不存在" };

      records.splice(index, 1);
      setData(STORAGE_KEY_RECORDS, records);
      return { code: 200, message: "删除成功" };
    },

    /**
     * 按分类统计支出
     * GET /api/stats/category?type=expense
     * 响应: { code: 200, data: [ { category, total, count } ] }
     */
    async getStatsByCategory({ type = "expense" } = {}) {
      await delay();
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { code: 401, message: "未登录" };

      const records = getData(STORAGE_KEY_RECORDS, []).filter(
        (r) => r.userId === currentUser.id && r.type === type
      );

      // 按分类分组汇总
      const map = {};
      records.forEach((r) => {
        if (!map[r.category]) {
          map[r.category] = { category: r.category, total: 0, count: 0 };
        }
        map[r.category].total += r.amount;
        map[r.category].count += 1;
      });

      const result = Object.values(map).sort((a, b) => b.total - a.total);
      return { code: 200, data: result };
    },

    /**
     * 获取分类列表
     * GET /api/categories?type=expense|income
     */
    getCategories(type) {
      return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    }
  };
})();
