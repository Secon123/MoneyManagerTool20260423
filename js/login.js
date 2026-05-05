/**
 * ============================================
 * 登录/注册页逻辑
 * ============================================
 */

// ========== 页面初始化 ==========
// 如果已登录，直接跳转到主页面
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
function setError(groupId, errorId) {
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

  // 校验
  if (!username) {
    setError("loginUsername", "loginUsernameError");
    hasError = true;
  }
  if (!password) {
    setError("loginPassword", "loginPasswordError");
    hasError = true;
  }
  if (hasError) return;

  // 禁用按钮，防止重复提交
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "登录中...";

  try {
    // 【调接口 - 登录】
    const res = await API.login(username, password);

    if (res.code === 200) {
      showToast("登录成功", "success");
      setTimeout(() => {
        window.location.href = "app.html";
      }, 500);
    } else {
      showToast(res.message, "error");
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

  // 校验
  if (!username || username.length < 3) {
    setError("regUsername", "regUsernameError");
    hasError = true;
  }
  if (!password || password.length < 6) {
    setError("regPassword", "regPasswordError");
    hasError = true;
  }
  if (password !== password2) {
    setError("regPassword2", "regPassword2Error");
    hasError = true;
  }
  if (hasError) return;

  // 禁用按钮
  const btn = document.querySelector("#registerForm .btn");
  btn.disabled = true;
  btn.textContent = "注册中...";

  try {
    // 【调接口 - 注册】
    const res = await API.register(username, password, nickname || null);

    if (res.code === 200) {
      showToast("注册成功，请登录", "success");
      // 切换到登录表单
      setTimeout(() => {
        showLogin();
        document.getElementById("loginUsername").value = username;
      }, 500);
    } else {
      showToast(res.message, "error");
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
