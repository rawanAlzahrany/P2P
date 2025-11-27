const API_URL = 'http://localhost:3000';

// ========== FETCH PROFILE ==========
async function fetchProfile() {
  try {
    const res = await fetch(`${API_URL}/api/profile`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// ========== UPDATE PROFILE ==========
async function updateProfile(data) {
  try {
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// ========== RENDER PROFILE ==========
function renderProfile(user) {
  if (!user) return;

  document.getElementById('pp-name').textContent = user.name || 'User';
  document.getElementById('pp-email').textContent = user.email || 'you@example.com';
  document.getElementById('pp-role').style.display = 'none';

  const avatarEl = document.getElementById('pp-avatar');
  avatarEl.style.background = user.avatarColor || 'hsl(217, 70%, 80%)';
  document.getElementById('pp-initial').textContent = (user.name?.[0] || 'U').toUpperCase();

  // Update greeting
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = `Hi, ${user.name || 'User'}!`;

  // Update posts authored by this user
  document.querySelectorAll('.post-author').forEach(el => {
    if (el.dataset.userId === user._id) {
      el.textContent = user.name;
    }
  });

  // ----- RENDER SKILLS -----
  const expList = document.getElementById('pp-exp-list');
  expList.innerHTML = '';
  (user.skills || []).forEach(skill => {
    const badge = document.createElement('div');
    badge.className = 'exp-badge';
    badge.dataset.text = skill;
    badge.style.borderColor = getSkillColor(skill);
    badge.innerHTML = `<span>${skill}</span><button class="remove">✕</button>`;
    expList.appendChild(badge);
  });
}


// ========== SKILL COLOR ==========
function getSkillColor(skill) {
  let color = localStorage.getItem(`skillColor_${skill}`);
  if (!color) {
    const h = Math.floor(Math.random() * 360);
    const s = 70 + Math.random() * 10;
    const l = 75 + Math.random() * 10;
    color = `hsl(${h}, ${s}%, ${l}%)`;
    localStorage.setItem(`skillColor_${skill}`, color);
  }
  return color;
}

// ========== CREATE PROFILE PANEL ==========
function createProfilePanel() {
  if (document.querySelector('.profile-panel')) return;

  const panel = document.createElement('aside');
  panel.className = 'profile-panel';
  panel.innerHTML = `
    <div class="panel-header"><h4>Profile</h4><button id="pp-edit-btn">Edit</button></div>
    <div class="profile-top">
      <div class="profile-avatar" id="pp-avatar"><span id="pp-initial">U</span></div>
      <div class="profile-basic">
        <div id="pp-name">User</div>
        <div id="pp-email">you@example.com</div>
        <div id="pp-role">Role</div>
      </div>
    </div>

    <div class="profile-section">
      <h5>Skills</h5>
      <div id="pp-exp-list" class="exp-list"></div>
      <div class="profile-add-row">
        <input type="text" id="pp-exp-input" placeholder="Add skill..." />
        <button id="pp-exp-add">Add</button>
      </div>
    </div>

    <div class="profile-editor" id="pp-editor">
      <input type="text" id="pp-edit-name" placeholder="Username" />
      <input type="email" id="pp-edit-email" placeholder="Email" />
      <div class="editor-actions">
        <button id="pp-edit-cancel">Cancel</button>
        <button id="pp-edit-save">Save</button>
      </div>
    </div>
   
  `;
  document.body.appendChild(panel);

  const editor = document.getElementById('pp-editor');
  const input = document.getElementById('pp-exp-input');

  // ===== EDIT PROFILE =====
  document.getElementById('pp-edit-btn').addEventListener('click', async () => {
    editor.style.display = editor.style.display === 'block' ? 'none' : 'block';
    const user = await fetchProfile();
    document.getElementById('pp-edit-name').value = user?.name || '';
    document.getElementById('pp-edit-email').value = user?.email || '';
  });
  document.getElementById('pp-edit-save').addEventListener('click', async () => {
  const name = document.getElementById('pp-edit-name').value.trim();
  const email = document.getElementById('pp-edit-email').value.trim();

  // ===== VALIDATION =====
  if (!name || !email) {
    alert(' Username and Email are required to update your profile.');
    return;
  }

  const updated = await updateProfile({ name, email });
  if (updated?.user) renderProfile(updated.user);
  document.getElementById('pp-editor').style.display = 'none';
});


  document.getElementById('pp-edit-cancel').addEventListener('click', () => editor.style.display = 'none');

  // ===== ADD SKILL =====
  document.getElementById('pp-exp-add').addEventListener('click', async () => {
    const skill = input.value.trim();
    if (!skill) return;

    const user = await fetchProfile();
    const newSkills = [...new Set([...(user.skills || []), skill])];

    const updated = await updateProfile({ skills: newSkills });
    if (updated?.user) renderProfile(updated.user);

    input.value = '';
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pp-exp-add').click(); });

  // ===== REMOVE SKILL =====
  document.getElementById('pp-exp-list').addEventListener('click', async e => {
    if (e.target.classList.contains('remove')) {
      const badge = e.target.closest('.exp-badge');
      const skill = badge.dataset.text;

      const user = await fetchProfile();
      const newSkills = (user.skills || []).filter(s => s !== skill);

      const updated = await updateProfile({ skills: newSkills });
      if (updated?.user) renderProfile(updated.user);
    }
  });

  // Initial load
  fetchProfile().then(renderProfile);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', createProfilePanel);
