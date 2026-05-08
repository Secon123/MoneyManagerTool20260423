/**
 * ============================================
 * 主应用页逻辑（已对齐后端接口文档）
 * ============================================
 *
 * 关键变更:
 * - type 使用大写 "EXPENSE"/"INCOME"
 * - 流水列表使用 Spring Data 分页（content/totalPages）
 * - 新增预算管理功能
 * - 统计页使用月度报表接口 + 趋势接口
 */

// ========== 全局状态 ==========
let currentType = "EXPENSE";    // 当前记账类型（大写）
let editType = "EXPENSE";       // 编辑弹窗类型（大写）
let currentFilter = "";         // 流水列表筛选类型
let currentPage = 0;            // 当前页码（从0开始）
let totalPages = 0;             // 总页数

// ========== 页面初始化 ==========
(function init() {
  const user = requireAuth();
  if (!user) return;

  // 显示用户名（后端返回 username，无 nickname 字段）
  document.getElementById("navUser").textContent = user.username || "用户";

  // 设置默认日期为今天
  document.getElementById("addDate").value = getToday();

  // 设置默认月份为当前月
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("statsMonth").value = currentMonth;
  document.getElementById("budgetMonth").value = currentMonth;

  // 填充分类下拉（支出）
  fillCategorySelect("addCategory", "EXPENSE");
  // 填充预算分类下拉
  fillCategorySelect("budgetCategory", "EXPENSE");

  // 加载流水列表
  loadRecords();
})();

// ========== 工具函数 ==========
function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatAmount(amount) {
  return parseFloat(amount).toFixed(2);
}

function fillCategorySelect(selectId, type) {
  const select = document.getElementById(selectId);
  const categories = API.getCategories(type);
  select.innerHTML = '<option value="">请选择分类</option>' +
    categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

// ========== Tab 切换 ==========
function switchTab(tabName, el) {
  document.querySelectorAll(".tab-page").forEach((p) => (p.style.display = "none"));
  document.getElementById("page-" + tabName).style.display = "block";

  document.querySelectorAll(".tab-item").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");

  if (tabName === "stats") loadStats();
  if (tabName === "list") loadRecords();
  if (tabName === "budget") loadBudgets();
}

// ========== 记账页逻辑 ==========

function switchType(type) {
  currentType = type;
  document.querySelectorAll("#page-add .type-btn").forEach((btn) => btn.classList.remove("active"));
  if (type === "EXPENSE") {
    document.querySelector("#page-add .expense-btn").classList.add("active");
  } else {
    document.querySelector("#page-add .income-btn").classList.add("active");
  }
  fillCategorySelect("addCategory", type);
}

async function handleAdd() {
  document.querySelectorAll("#addForm .form-group").forEach((g) => g.classList.remove("has-error"));

  const amount = document.getElementById("addAmount").value;
  const category = document.getElementById("addCategory").value;
  const date = document.getElementById("addDate").value;
  const remark = document.getElementById("addRemark").value.trim();
  let hasError = false;

  if (!amount || parseFloat(amount) <= 0) {
    document.getElementById("addAmount").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!category) {
    document.getElementById("addCategory").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!date) {
    document.getElementById("addDate").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (hasError) return;

  // 【调接口 - 添加记录 POST /transactions】
  const res = await API.addRecord({
    type: currentType,  // "EXPENSE" 或 "INCOME"
    category,
    amount,
    date,
    remark
  });

  if (res.code === 200) {
    showToast("记录添加成功 ✅", "success");
    document.getElementById("addAmount").value = "";
    document.getElementById("addCategory").value = "";
    document.getElementById("addRemark").value = "";
  } else {
    showToast(res.message || "添加失败", "error");
  }
}

// ========== 流水列表逻辑 ==========

function filterRecords(type, el) {
  currentFilter = type;
  currentPage = 0; // 切换筛选时回到第一页
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active-filter"));
  el.classList.add("active-filter");
  loadRecords();
}

async function loadRecords(page = 0) {
  currentPage = page;
  const listEl = document.getElementById("recordList");

  // 【调接口 - 查询记录列表 GET /transactions（分页+日期过滤）】
  const res = await API.getRecords({
    page: page,
    size: 20,
    sort: "date,desc"
  });

  if (res.code !== 200) {
    listEl.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    return;
  }

  // 后端返回 Spring Data 分页对象: { content, totalPages, totalElements }
  const pageData = res.data;
  const records = pageData.content || [];
  totalPages = pageData.totalPages || 0;

  if (records.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>暂无记录</p>
      </div>`;
    document.getElementById("pagination").style.display = "none";
    return;
  }

  // 前端筛选（如果后端不支持 type 筛选，前端做过滤）
  const filtered = currentFilter
    ? records.filter((r) => r.type === currentFilter)
    : records;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>该类型暂无记录</p>
      </div>`;
    document.getElementById("pagination").style.display = "none";
    return;
  }

  listEl.innerHTML = filtered.map((r) => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-category">${r.category}</div>
        <div class="record-date">${r.date}</div>
        ${r.remark ? `<div class="record-remark">${r.remark}</div>` : ""}
        ${r.warning ? `<div class="record-remark" style="color: var(--warning);">⚠️ ${r.warning}</div>` : ""}
      </div>
      <div class="record-amount ${r.type === 'EXPENSE' ? 'expense' : 'income'}">
        ${r.type === "EXPENSE" ? "-" : "+"}¥${formatAmount(r.amount)}
      </div>
      <div class="record-actions">
        <button class="btn btn-sm btn-outline" onclick="openEditModal(${r.id})">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="handleDelete(${r.id})">删除</button>
      </div>
    </div>
  `).join("");

  // 渲染分页
  renderPagination();
}

function renderPagination() {
  const pagEl = document.getElementById("pagination");
  if (totalPages <= 1) {
    pagEl.style.display = "none";
    return;
  }
  pagEl.style.display = "flex";

  let html = "";
  // 上一页
  html += `<button class="btn btn-sm btn-outline" ${currentPage === 0 ? 'disabled' : ''} onclick="loadRecords(${currentPage - 1})">上一页</button>`;
  // 页码
  for (let i = 0; i < totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - currentPage) > 2 && i !== 0 && i !== totalPages - 1) {
      if (i === 1 || i === totalPages - 2) html += `<span style="padding: 6px;">...</span>`;
      continue;
    }
    html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}" onclick="loadRecords(${i})">${i + 1}</button>`;
  }
  // 下一页
  html += `<button class="btn btn-sm btn-outline" ${currentPage >= totalPages - 1 ? 'disabled' : ''} onclick="loadRecords(${currentPage + 1})">下一页</button>`;

  pagEl.innerHTML = html;
}

async function handleDelete(id) {
  if (!confirm("确定要删除这条记录吗？")) return;

  // 【调接口 - 删除记录 DELETE /transactions/{id}】
  const res = await API.deleteRecord(id);

  if (res.code === 200) {
    showToast("删除成功", "success");
    loadRecords(currentPage);
  } else {
    showToast(res.message || "删除失败", "error");
  }
}

// ========== 编辑弹窗逻辑 ==========

async function openEditModal(id) {
  // 先获取当前页数据找到对应记录
  const res = await API.getRecords({ page: currentPage, size: 20, sort: "date,desc" });
  if (res.code !== 200) return;

  const record = (res.data.content || []).find((r) => r.id === id);
  if (!record) {
    showToast("记录不存在", "error");
    return;
  }

  document.getElementById("editId").value = record.id;
  document.getElementById("editAmount").value = record.amount;
  document.getElementById("editDate").value = record.date;
  document.getElementById("editRemark").value = record.remark || "";

  editType = record.type; // "EXPENSE" 或 "INCOME"
  updateEditTypeUI();
  fillCategorySelect("editCategory", editType);
  document.getElementById("editCategory").value = record.category;

  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
}

function switchEditType(type) {
  editType = type;
  updateEditTypeUI();
  fillCategorySelect("editCategory", type);
}

function updateEditTypeUI() {
  document.querySelectorAll("#editTypeSwitch .type-btn").forEach((btn) => btn.classList.remove("active"));
  if (editType === "EXPENSE") {
    document.querySelector("#editTypeSwitch .expense-btn").classList.add("active");
  } else {
    document.querySelector("#editTypeSwitch .income-btn").classList.add("active");
  }
}

async function handleEdit() {
  document.querySelectorAll("#editForm .form-group").forEach((g) => g.classList.remove("has-error"));

  const id = parseInt(document.getElementById("editId").value);
  const amount = document.getElementById("editAmount").value;
  const category = document.getElementById("editCategory").value;
  const date = document.getElementById("editDate").value;
  const remark = document.getElementById("editRemark").value.trim();
  let hasError = false;

  if (!amount || parseFloat(amount) <= 0) {
    document.getElementById("editAmount").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!category) {
    document.getElementById("editCategory").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!date) {
    document.getElementById("editDate").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (hasError) return;

  // 【调接口 - 修改记录 PUT /transactions/{id}】
  const res = await API.updateRecord(id, {
    type: editType,
    category,
    amount,
    date,
    remark
  });

  if (res.code === 200) {
    showToast("修改成功 ✅", "success");
    closeEditModal();
    loadRecords(currentPage);
  } else {
    showToast(res.message || "修改失败", "error");
  }
}

// ========== 统计页逻辑 ==========

async function loadStats() {
  const yearMonth = document.getElementById("statsMonth").value;
  if (!yearMonth) return;

  // 【调接口 - 月度报表 GET /statistics/monthly-report?yearMonth=】
  const res = await API.getMonthlyReport(yearMonth);

  if (res.code !== 200 || !res.data) {
    document.getElementById("totalExpense").textContent = "¥0.00";
    document.getElementById("totalIncome").textContent = "¥0.00";
    document.getElementById("totalBalance").textContent = "¥0.00";
    document.getElementById("statsBody").innerHTML = "";
    document.getElementById("statsEmpty").style.display = "block";
    document.getElementById("statsTable").style.display = "none";
    return;
  }

  const data = res.data;

  // 汇总
  document.getElementById("totalExpense").textContent = "¥" + formatAmount(data.totalExpense || 0);
  document.getElementById("totalIncome").textContent = "¥" + formatAmount(data.totalIncome || 0);
  const balance = (data.totalIncome || 0) - (data.totalExpense || 0);
  const balanceEl = document.getElementById("totalBalance");
  balanceEl.textContent = (balance >= 0 ? "+" : "") + "¥" + formatAmount(balance);
  balanceEl.style.color = balance >= 0 ? "var(--success)" : "var(--danger)";

  // 分类支出明细
  const tbody = document.getElementById("statsBody");
  const emptyEl = document.getElementById("statsEmpty");
  const categories = data.categoryExpenses || [];

  if (categories.length === 0) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    document.getElementById("statsTable").style.display = "none";
  } else {
    emptyEl.style.display = "none";
    document.getElementById("statsTable").style.display = "table";
    tbody.innerHTML = categories.map((item) => `
      <tr>
        <td>${item.category}</td>
        <td style="color: var(--danger); font-weight: 600;">¥${formatAmount(item.amount)}</td>
        <td>${item.percent}%</td>
      </tr>
    `).join("");
  }

  // 加载趋势数据
  loadTrend(yearMonth);
}

async function loadTrend(yearMonth) {
  const trendEl = document.getElementById("trendContent");

  // 计算月份的起止日期
  const [year, month] = yearMonth.split("-");
  const start = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const end = `${year}-${month}-${lastDay}`;

  // 【调接口 - 趋势折线图 GET /statistics/trend?start=&end=】
  const res = await API.getTrend(start, end);

  if (res.code !== 200 || !res.data || !res.data.dates || res.data.dates.length === 0) {
    trendEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📈</div>
        <p>暂无趋势数据</p>
      </div>`;
    return;
  }

  const { dates, incomes, expenses } = res.data;

  // 用表格展示趋势
  let totalIncome = 0, totalExpense = 0;
  const rows = dates.map((date, i) => {
    const inc = incomes[i] || 0;
    const exp = expenses[i] || 0;
    totalIncome += inc;
    totalExpense += exp;
    return `<tr>
      <td>${date}</td>
      <td style="color: var(--success);">¥${formatAmount(inc)}</td>
      <td style="color: var(--danger);">¥${formatAmount(exp)}</td>
    </tr>`;
  }).join("");

  trendEl.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>收入</th>
            <th>支出</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="font-weight: 600; border-top: 2px solid var(--border);">
            <td>合计</td>
            <td style="color: var(--success);">¥${formatAmount(totalIncome)}</td>
            <td style="color: var(--danger);">¥${formatAmount(totalExpense)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

// ========== 预算管理逻辑 ==========

async function loadBudgets() {
  const month = document.getElementById("budgetMonth").value;
  if (!month) return;

  const listEl = document.getElementById("budgetList");

  // 【调接口 - 查询某月所有预算 GET /budgets?month=】
  const res = await API.getBudgets(month);

  if (res.code !== 200 || !res.data || res.data.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <p>暂无预算设置</p>
      </div>`;
    return;
  }

  listEl.innerHTML = res.data.map((b) => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-category">${b.category}</div>
        <div class="record-date">${b.month}</div>
      </div>
      <div class="record-amount" style="color: var(--primary);">
        ¥${formatAmount(b.monthLimit)}
      </div>
      <div class="record-actions">
        <button class="btn btn-sm btn-outline" onclick="handleEditBudget(${b.id}, '${b.category}', ${b.monthLimit}, '${b.month}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="handleDeleteBudget(${b.id})">删除</button>
      </div>
    </div>
  `).join("");
}

async function handleSetBudget() {
  document.querySelectorAll("#budgetForm .form-group").forEach((g) => g.classList.remove("has-error"));

  const category = document.getElementById("budgetCategory").value;
  const monthLimit = document.getElementById("budgetLimit").value;
  const month = document.getElementById("budgetMonth").value;
  let hasError = false;

  if (!category) {
    document.getElementById("budgetCategory").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!monthLimit || parseFloat(monthLimit) <= 0) {
    document.getElementById("budgetLimit").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (!month) {
    showToast("请选择月份", "error");
    return;
  }
  if (hasError) return;

  // 【调接口 - 设置预算 POST /budgets】
  const res = await API.setBudget({ category, monthLimit, month });

  if (res.code === 200) {
    showToast("预算设置成功 ✅", "success");
    document.getElementById("budgetLimit").value = "";
    document.getElementById("budgetCategory").value = "";
    loadBudgets();
  } else {
    showToast(res.message || "设置失败", "error");
  }
}

async function handleEditBudget(id, category, monthLimit, month) {
  const newLimit = prompt(`编辑 ${category} 的预算金额（当前: ¥${formatAmount(monthLimit)}）`, monthLimit);
  if (newLimit === null || parseFloat(newLimit) <= 0) return;

  // 【调接口 - 更新预算 PUT /budgets/{id}】
  const res = await API.updateBudget(id, { category, monthLimit: newLimit, month });

  if (res.code === 200) {
    showToast("预算更新成功", "success");
    loadBudgets();
  } else {
    showToast(res.message || "更新失败", "error");
  }
}

async function handleDeleteBudget(id) {
  if (!confirm("确定要删除这条预算吗？")) return;

  // 后端没有单独的删除预算接口，用更新接口将金额设为0模拟
  showToast("后端暂未提供删除预算接口", "error");
}

// ========== 筛选按钮和分页样式 ==========
(function addExtraStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .filter-btn.active-filter {
      background: var(--primary) !important;
      color: #fff !important;
      border-color: var(--primary) !important;
    }
    .filter-btn {
      margin-left: 6px;
      font-size: 12px !important;
      padding: 4px 10px !important;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      padding: 12px 0;
      flex-wrap: wrap;
    }
    .pagination .btn {
      min-width: 36px;
    }
    input[type="month"] {
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text);
      background: #fff;
      outline: none;
    }
    input[type="month"]:focus {
      border-color: var(--primary);
    }
  `;
  document.head.appendChild(style);
})();

// 点击弹窗外部关闭
document.getElementById("editModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeEditModal();
  }
});
