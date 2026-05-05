/**
 * ============================================
 * 主应用页逻辑（记账 + 流水列表 + 统计）
 * ============================================
 */

// ========== 全局状态 ==========
let currentType = "expense";   // 当前记账类型
let editType = "expense";      // 编辑弹窗中的类型
let currentFilter = "";        // 流水列表筛选类型

// ========== 页面初始化 ==========
(function init() {
  const user = requireAuth();
  if (!user) return;

  // 显示用户名
  document.getElementById("navUser").textContent = user.nickname || user.username;

  // 设置默认日期为今天
  document.getElementById("addDate").value = getToday();

  // 填充分类下拉
  fillCategorySelect("addCategory", currentType);

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

/**
 * 填充分类下拉框
 */
function fillCategorySelect(selectId, type) {
  const select = document.getElementById(selectId);
  const categories = API.getCategories(type);
  select.innerHTML = '<option value="">请选择分类</option>' +
    categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

// ========== Tab 切换 ==========
function switchTab(tabName, el) {
  // 隐藏所有页面
  document.querySelectorAll(".tab-page").forEach((p) => (p.style.display = "none"));
  // 显示目标页面
  document.getElementById("page-" + tabName).style.display = "block";

  // 更新 Tab 高亮
  document.querySelectorAll(".tab-item").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");

  // 切换到统计页时刷新数据
  if (tabName === "stats") {
    loadStats();
  }
  // 切换到流水页时刷新
  if (tabName === "list") {
    loadRecords();
  }
}

// ========== 记账页逻辑 ==========

/**
 * 切换收入/支出类型
 */
function switchType(type) {
  currentType = type;
  // 更新按钮样式
  document.querySelectorAll("#page-add .type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (type === "expense") {
    document.querySelector("#page-add .expense-btn").classList.add("active");
  } else {
    document.querySelector("#page-add .income-btn").classList.add("active");
  }
  // 更新分类下拉
  fillCategorySelect("addCategory", type);
}

/**
 * 添加记录
 */
async function handleAdd() {
  // 清除之前的错误
  document.querySelectorAll("#addForm .form-group").forEach((g) => g.classList.remove("has-error"));

  const amount = document.getElementById("addAmount").value;
  const category = document.getElementById("addCategory").value;
  const date = document.getElementById("addDate").value;
  const remark = document.getElementById("addRemark").value.trim();
  let hasError = false;

  // 校验金额：必须为正数
  if (!amount || parseFloat(amount) <= 0) {
    document.getElementById("addAmount").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  // 校验分类
  if (!category) {
    document.getElementById("addCategory").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  // 校验日期
  if (!date) {
    document.getElementById("addDate").closest(".form-group").classList.add("has-error");
    hasError = true;
  }
  if (hasError) return;

  // 【调接口 - 添加记录】
  const res = await API.addRecord({
    type: currentType,
    category,
    amount,
    date,
    remark
  });

  if (res.code === 200) {
    showToast("记录添加成功 ✅", "success");
    // 重置表单
    document.getElementById("addAmount").value = "";
    document.getElementById("addCategory").value = "";
    document.getElementById("addRemark").value = "";
  } else {
    showToast(res.message, "error");
  }
}

// ========== 流水列表逻辑 ==========

/**
 * 筛选记录
 */
function filterRecords(type, el) {
  currentFilter = type;
  // 更新筛选按钮样式
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active-filter"));
  el.classList.add("active-filter");
  loadRecords();
}

/**
 * 加载流水列表
 */
async function loadRecords() {
  const listEl = document.getElementById("recordList");

  // 【调接口 - 获取流水列表】
  const res = await API.getRecords(currentFilter || undefined);

  if (res.code !== 200) {
    listEl.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
    return;
  }

  const records = res.data;

  if (records.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>暂无记录</p>
      </div>`;
    return;
  }

  listEl.innerHTML = records.map((r) => `
    <div class="record-item">
      <div class="record-info">
        <div class="record-category">${r.category}</div>
        <div class="record-date">${r.date}</div>
        ${r.remark ? `<div class="record-remark">${r.remark}</div>` : ""}
      </div>
      <div class="record-amount ${r.type}">
        ${r.type === "expense" ? "-" : "+"}¥${formatAmount(r.amount)}
      </div>
      <div class="record-actions">
        <button class="btn btn-sm btn-outline" onclick="openEditModal(${r.id})">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="handleDelete(${r.id})">删除</button>
      </div>
    </div>
  `).join("");
}

/**
 * 删除记录
 */
async function handleDelete(id) {
  if (!confirm("确定要删除这条记录吗？")) return;

  // 【调接口 - 删除记录】
  const res = await API.deleteRecord(id);

  if (res.code === 200) {
    showToast("删除成功", "success");
    loadRecords();
  } else {
    showToast(res.message, "error");
  }
}

// ========== 编辑弹窗逻辑 ==========

/**
 * 打开编辑弹窗
 */
async function openEditModal(id) {
  // 获取当前记录列表以找到对应记录
  const res = await API.getRecords();
  if (res.code !== 200) return;

  const record = res.data.find((r) => r.id === id);
  if (!record) {
    showToast("记录不存在", "error");
    return;
  }

  // 填充表单
  document.getElementById("editId").value = record.id;
  document.getElementById("editAmount").value = record.amount;
  document.getElementById("editDate").value = record.date;
  document.getElementById("editRemark").value = record.remark || "";

  // 设置类型
  editType = record.type;
  updateEditTypeUI();

  // 填充分类
  fillCategorySelect("editCategory", editType);
  document.getElementById("editCategory").value = record.category;

  // 显示弹窗
  document.getElementById("editModal").classList.add("show");
}

/**
 * 关闭编辑弹窗
 */
function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
}

/**
 * 切换编辑弹窗中的类型
 */
function switchEditType(type) {
  editType = type;
  updateEditTypeUI();
  fillCategorySelect("editCategory", type);
}

function updateEditTypeUI() {
  document.querySelectorAll("#editTypeSwitch .type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (editType === "expense") {
    document.querySelector("#editTypeSwitch .expense-btn").classList.add("active");
  } else {
    document.querySelector("#editTypeSwitch .income-btn").classList.add("active");
  }
}

/**
 * 保存编辑
 */
async function handleEdit() {
  // 清除错误
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

  // 【调接口 - 编辑记录】
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
    loadRecords();
  } else {
    showToast(res.message, "error");
  }
}

// ========== 统计页逻辑 ==========

/**
 * 加载统计数据
 */
async function loadStats() {
  // 【调接口 - 按分类统计支出】
  const expenseRes = await API.getStatsByCategory("expense");
  const incomeRes = await API.getStatsByCategory("income");

  // 计算本月总支出和总收入
  let totalExpense = 0;
  let totalIncome = 0;

  if (expenseRes.code === 200) {
    expenseRes.data.forEach((item) => { totalExpense += item.total; });
  }
  if (incomeRes.code === 200) {
    incomeRes.data.forEach((item) => { totalIncome += item.total; });
  }

  document.getElementById("totalExpense").textContent = "¥" + formatAmount(totalExpense);
  document.getElementById("totalIncome").textContent = "¥" + formatAmount(totalIncome);

  // 渲染支出分类统计表
  const tbody = document.getElementById("statsBody");
  const emptyEl = document.getElementById("statsEmpty");

  if (expenseRes.code !== 200 || expenseRes.data.length === 0) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    document.getElementById("statsTable").style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  document.getElementById("statsTable").style.display = "table";

  tbody.innerHTML = expenseRes.data.map((item) => `
    <tr>
      <td>${item.category}</td>
      <td>${item.count} 笔</td>
      <td style="color: var(--danger); font-weight: 600;">¥${formatAmount(item.total)}</td>
    </tr>
  `).join("");
}

// ========== 筛选按钮样式 ==========
// 给 active-filter 添加样式（内联补充）
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
  `;
  document.head.appendChild(style);
})();

// 点击弹窗外部关闭
document.getElementById("editModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeEditModal();
  }
});
