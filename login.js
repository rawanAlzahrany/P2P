// ================== CONFIG ==================
const API_BASE_URL = "http://localhost:3000"; // backend server URL

// ================== DOM ELEMENTS ==================
const authForm     = document.getElementById("authForm");
const formTitle    = document.getElementById("formTitle");
const toggleText   = document.getElementById("toggleText");
const toggleAuth   = document.getElementById("toggleAuth");

const nameField    = document.getElementById("nameField");
const agreeRow     = document.getElementById("agreeRow");
const submitBtn    = document.getElementById("submitBtn");

const nameInput    = document.getElementById("name");
const emailInput   = document.getElementById("email");
const passwordInput= document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");

// Current mode: true = signup, false = login
let isSignup = true;
let isPasswordShown = false;

// ================== PASSWORD EYE ICON ==================

// Render eye icon (open/closed)
function renderEye() {
  if (!togglePassword) return;

  if (!isPasswordShown) {
    togglePassword.innerHTML = `<svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#e3e3e3"></circle>
      <path d="M12 9C10.343 9 9 10.343 9 12C9 13.657 10.343 15 12 15C13.657 15 15 13.657 15 12C15 10.343 13.657 9 12 9Z" stroke="#7d7d7d" stroke-width="2"></path>
      <path d="M4 12C4 12 7 7 12 7C17 7 20 12 20 12C20 12 17 17 12 17C7 17 4 12 4 12Z" stroke="#7d7d7d" stroke-width="2"></path>
    </svg>`;
  } else {
    togglePassword.innerHTML = `<svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#e3e3e3"></circle>
      <path d="M4 12C4 12 7 7 12 7C17 7 20 12 20 12C20 12 17 17 12 17C7 17 4 12 4 12Z" stroke="#7d7d7d" stroke-width="2"></path>
      <line x1="6" y1="6" x2="18" y2="18" stroke="#7d7d7d" stroke-width="2"></line>
    </svg>`;
  }
}

// Initial render
renderEye();
if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    isPasswordShown = !isPasswordShown;
    passwordInput.type = isPasswordShown ? "text" : "password";
    renderEye();
  });
}

// ================== TOGGLE SIGNUP / LOGIN UI ==================
if (toggleAuth) {
  toggleAuth.addEventListener("click", (e) => {
    e.preventDefault();
    isSignup = !isSignup;

    if (isSignup) {
      formTitle.textContent  = "Sign up";
      toggleText.textContent = "Already have an account?";
      toggleAuth.textContent = "Log in";
      nameField.style.display = "block";
      agreeRow.style.display  = "flex";
      submitBtn.textContent   = "Create account";
    } else {
      formTitle.textContent  = "Log in";
      toggleText.textContent = "Don't have an account?";
      toggleAuth.textContent = "Sign up";
      nameField.style.display = "none";
      agreeRow.style.display  = "none";
      submitBtn.textContent   = "Log in";
    }
  });
}

// ================== FORM SUBMIT (REGISTER / LOGIN) ==================
if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const name     = nameInput.value.trim();

    if (!email || !password || (isSignup && !name)) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (isSignup) {
        // -------- FRONTEND EMAIL VALIDATION --------
        const digitsPattern = /^[0-9]{7}/;
        const domain = "@uj.edu.sa";

        if (!digitsPattern.test(email)) {
          alert("Email must start with exactly 7 digits.");
          return;
        }

        if (!email.endsWith(domain)) {
          alert("Email must end with @uj.edu.sa.");
          return;
        }

        // -------- SIGN UP REQUEST --------
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Registration failed.");
          return;
        }

        alert("Account created successfully! You can now log in.");
        // Switch UI to login mode
        isSignup = false;
        formTitle.textContent  = "Log in";
        toggleText.textContent = "Don't have an account?";
        toggleAuth.textContent = "Sign up";
        nameField.style.display = "none";
        agreeRow.style.display  = "none";
        submitBtn.textContent   = "Log in";

      } else {
        // -------- LOGIN REQUEST --------
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Login failed.");
          return;
        }

        // Save JWT token and user info
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        alert("Logged in successfully!");
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please make sure the backend server is running.");
    }
  });
}
