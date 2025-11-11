const API = 'http://localhost:3000/api/auth';

const container   = document.getElementById('auth');
const toSignupBtn = document.getElementById('to-signup');
const toSigninBtn = document.getElementById('to-signin');
const loginForm   = document.getElementById('form-login');
const signupForm  = document.getElementById('form-signup');
const forgotBtn   = document.getElementById('btn-forgot');

// Switch animation between panels
function toggleAuth(toSignup) {
  container.classList.toggle('active', toSignup);
}

// Show success/error message below the form
function showMsg(form, text, ok = false) {
  let el = form.querySelector('.form-msg');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-msg';
    form.appendChild(el);
  }
  el.textContent = text || '';
  el.style.color = ok ? '#16a34a' : '#dc2626';
}

// Switch to signup / signin
toSignupBtn.addEventListener('click', () => toggleAuth(true));
toSigninBtn.addEventListener('click', () => toggleAuth(false));

// LOGIN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMsg(loginForm, '');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!email || !password) {
    showMsg(loginForm, 'Please fill all fields');
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const json = await res.json();
    if (!res.ok) {
      showMsg(loginForm, json.error || 'Login failed');
      return;
    }

    // Save token and redirect to homepage
    localStorage.setItem('token', json.token);
    showMsg(loginForm, 'Logged in ✓', true);
    window.location.href = './index.html';
  } catch {
    showMsg(loginForm, 'Network error');
  }
});

// SIGN UP
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMsg(signupForm, '');

  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const password = document.getElementById('su-pass').value;

  if (!name || !email || !password) {
    showMsg(signupForm, 'Please fill all fields');
    return;
  }

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const json = await res.json();
    if (!res.ok) {
      showMsg(signupForm, json.error || 'Sign up failed');
      return;
    }

    showMsg(signupForm, 'Account created ✓', true);
    setTimeout(() => toggleAuth(false), 600);
  } catch {
    showMsg(signupForm, 'Network error');
  }
});

// Forgot password (not implemented yet)
forgotBtn.addEventListener('click', () => {
  alert('Password reset flow coming soon');
});