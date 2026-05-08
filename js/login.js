/**
 * ============================================
 * 登录/注册页逻辑（已对齐后端接口文档）
 * ============================================
 *
 * 后端登录返回: { token, userId, username }
 * 后端注册: email 字段暂存昵称（非必填）
 * 前端显示昵称时使用 username
 */

// ========== 页面初始化 ==========
(function init() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = "app.html";
  }
})();

// ========== 登录/注册切换 ==========
function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  document.getElementById("authTitle").textContent = "💰 记账助手";
  document.getElementById("authSubtitle").textContent = "创建新账号";
  clearAllErrors();
}

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("authTitle").textContent = "💰 记账助手";
  document.getElementById("authSubtitle").textContent = "登录你的账号";
  clearAllErrors();
}

// ========== 表单校验工具 ==========
function setError(groupId) {
  document.getElementById(groupId).classList.add("has-error");
}

function clearError(groupId) {
  document.getElementById(groupId).classList.remove("has-error");
}

function clearAllErrors() {
  document.querySelectorAll(".form-group").forEach((g) => g.classList.remove("has-error"));
}

// ========== 登录逻辑 ==========
async function handleLogin() {
  clearAllErrors();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  let hasError = false;

  if (!username) {
    setError("loginUsername");
    hasError = true;
  }
  if (!password) {
    setError("loginPassword");
    hasError = true;
  }
  if (hasError) return;

  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "登录中...";

  try {
    // 【调接口 - 登录 POST /auth/login】
    const res = await API.login(username, password);

    if (res.code === 200) {
      showToast("登录成功", "success");
      setTimeout(() => {
        window.location.href = "app.html";
      }, 500);
    } else {
      showToast(res.message || "登录失败", "error");
    }
  } catch (e) {
    showToast("网络错误，请重试", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "登 录";
  }
}

// ========== 注册逻辑 ==========
async function handleRegister() {
  clearAllErrors();

  const username = document.getElementById("regUsername").value.trim();
  const nickname = document.getElementById("regNickname").value.trim();
  const password = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;
  let hasError = false;

  if (!username || username.length < 3) {
    setError("regUsername");
    hasError = true;
  }
  if (!password || password.length < 6) {
    setError("regPassword");
    hasError = true;
  }
  if (password !== password2) {
    setError("regPassword2");
    hasError = true;
  }
  if (hasError) return;

  const btn = document.querySelector("#registerForm .btn");
  btn.disabled = true;
  btn.textContent = "注册中...";

  try {
    // 【调接口 - 注册 POST /auth/register】
    // 昵称通过 email 字段传给后端暂存
    const res = await API.register(username, password, nickname || null);

    if (res.code === 200) {
      showToast("注册成功，请登录", "success");
      setTimeout(() => {
        showLogin();
        document.getElementById("loginUsername").value = username;
      }, 500);
    } else {
      showToast(res.message || "注册失败", "error");
    }
  } catch (e) {
    showToast("网络错误，请重试", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "注 册";
  }
}

// ========== 回车提交 ==========
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm.style.display !== "none") {
      handleLogin();
    } else if (registerForm.style.display !== "none") {
      handleRegister();
    }
  }
});
