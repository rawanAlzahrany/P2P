// ====================== CONSTANTS ======================
const BASE_URL = 'http://localhost:3000/api';
const API_BASE = 'http://localhost:3000';

// Helper functions for managing interacted posts
function getInteractedPosts() {
    const stored = localStorage.getItem('interactedPosts');
    return stored ? JSON.parse(stored) : [];
}

function addInteractedPost(postId) {
    const posts = getInteractedPosts();
    if (!posts.includes(postId)) {
        posts.push(postId);
        localStorage.setItem('interactedPosts', JSON.stringify(posts));
    }
}

function hasInteractedWithPost(postId) {
    return getInteractedPosts().includes(postId);
}

// ====================== SOCKET.IO SETUP ======================
let socket = null;
function initSocket() {
    const token = localStorage.getItem('token');
    if (token) {
        socket = io(API_BASE);
        socket.on('connect', () => {
            socket.emit('authenticate', token);
        });
        
        socket.on('new_notification', (notification) => {
            showToast(notification.message);
            updateNotifications();
        });
        
        socket.on('new_message', (data) => {
            // Handled in chat.js
        });
    }
}

// ====================== AUTHENTICATION ======================
let currentUser = null;

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        currentUser = JSON.parse(userStr);
        updateUIForLoggedIn();
        initSocket();
    } else {
        currentUser = null;
        updateUIForLoggedOut();
    }
}

function updateUIForLoggedIn() {
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = `Hi, ${currentUser.name}!`;
    
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'block';
    
    const postBtn = document.getElementById('postBtn');
    if (postBtn) postBtn.style.display = 'flex';
    
    const notificationsNavLink = document.getElementById('notificationsNavLink');
    if (notificationsNavLink) notificationsNavLink.style.display = 'block';
    
    updateNotifications();
}

function updateUIForLoggedOut() {
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = 'Hi, User!';
    
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (loginLink) loginLink.style.display = 'block';
    if (signupLink) signupLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    
    const postBtn = document.getElementById('postBtn');
    if (postBtn) postBtn.style.display = 'none';
    
    const notificationsNavLink = document.getElementById('notificationsNavLink');
    if (notificationsNavLink) notificationsNavLink.style.display = 'none';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    updateUIForLoggedOut();
    window.location.reload();
}

// ====================== RANDOM PASTEL COLOR ======================
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 5) + 95;
    const lightness = Math.floor(Math.random() * 5) + 95;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// ====================== SIDEBAR ACTIVE LINK ======================
const navLink = document.querySelectorAll('.nav__link');

function linkColor() {
    navLink.forEach(link => link.classList.remove('active-link'));
    this.classList.add('active-link');
}

navLink.forEach(link => link.addEventListener('click', linkColor));

// ====================== FRONT-END ELEMENTS ======================
const postModal = document.getElementById('postModal');
const closeModal = document.getElementById('closeModal');
const submitSkill = document.getElementById('submitSkill');
const skillTextarea = document.getElementById('skillTextarea');
const postTitle = document.getElementById('postTitle');
const postType = document.getElementById('postType');
const postCategory = document.getElementById('postCategory');
const searchBar = document.getElementById("searchBar");
const suggestionUL = document.getElementById("suggestion");
const requestsContainer = document.getElementById("requestsContainer");
const offersContainer = document.getElementById("offersContainer");

// Notification/History elements
const notificationsNavLink = document.getElementById('notificationsNavLink');
const notificationsDropdown = document.getElementById('notificationsDropdown');
const notificationsList = document.getElementById('notificationsList');
const notificationBadge = document.getElementById('notificationBadge');

const historyNavLink = document.getElementById('historyNavLink');
const historyDropdown = document.getElementById('historyDropdown');
const historyList = document.getElementById('historyList');


// ====================== POST / EDIT STATE ======================
let editingPost = null;

// ====================== MODAL BEHAVIOR ======================
const postBtn = document.getElementById('postBtn'); 

if (postBtn) {
    postBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please login to create a post');
            window.location.href = 'login.html';
            return;
        }
        if (postModal) postModal.style.display = 'flex';
        if (postModal) postModal.setAttribute('aria-hidden', 'false');
        if (skillTextarea) skillTextarea.focus();
    });
}

if (closeModal) {
    closeModal.addEventListener('click', resetModal);
}

function resetModal() {
    if (postModal) postModal.style.display = 'none';
    if (postModal) postModal.setAttribute('aria-hidden', 'true');
    if (skillTextarea) skillTextarea.value = '';
    if (postTitle) postTitle.value = '';
    if (postType) postType.value = 'request';
    if (postCategory) postCategory.value = '';
    editingPost = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Create a Skill Post';
}

// ====================== FETCH POSTS ======================
async function fetchPosts(searchTerm = '') {
    if (requestsContainer) requestsContainer.innerHTML = '';
    if (offersContainer) offersContainer.innerHTML = '';

    let url = searchTerm ? `${BASE_URL}/posts/search?qry=${encodeURIComponent(searchTerm)}` : `${BASE_URL}/posts`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();

        if (posts.length === 0) {
            if (requestsContainer) requestsContainer.innerHTML = '<p>No posts found.</p>';
            if (offersContainer) offersContainer.innerHTML = '<p>No posts found.</p>';
        } else {
            posts.forEach(post => {
                const postElement = createPostElement(post);
                if (post.type === 'request' && requestsContainer) requestsContainer.appendChild(postElement);
                else if (post.type === 'offer' && offersContainer) offersContainer.appendChild(postElement);
            });
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// ====================== POST CARD CREATION ======================
function createPostElement(post) {
    const { _id, title, type, category, description, color, author } = post;
    const displayType = type.charAt(0).toUpperCase() + type.slice(1);
    const displayCategory = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
    const isOwner = currentUser && author && author._id === currentUser.id;

    // Post container
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.dataset.id = _id;
    postDiv.style.backgroundColor = color || getRandomPastelColor();

    // Post heading
    const postHeading = document.createElement('h4');
    postHeading.textContent = title;

    // Post meta (type | category + three dots)
    const postMeta = document.createElement('div');
    postMeta.classList.add('post-meta');
    postMeta.innerHTML = `<span>${displayType} | ${displayCategory}</span>`;
    
    // Author info
    if (author) {
        const authorSpan = document.createElement('span');
        authorSpan.style.fontSize = '0.7rem';
        authorSpan.style.color = '#666';
        authorSpan.textContent = `by ${author.name}`;
        postMeta.appendChild(authorSpan);
    }

    const dotsSpan = document.createElement('span');
    dotsSpan.textContent = ' ⋮';
    dotsSpan.classList.add('three-dots');
    if (isOwner) {
        postMeta.appendChild(dotsSpan);
    }

    // Post description
    const postText = document.createElement('p');
    postText.textContent = description;

    // Start button (only if logged in and not owner)
    const startBtn = document.createElement('button');
    startBtn.classList.add('start-btn');
    startBtn.textContent = 'Connect';
    startBtn.style.display = (currentUser && !isOwner) ? 'block' : 'none';
    
    // Check if user already interacted with this post
    if (hasInteractedWithPost(_id)) {
        startBtn.disabled = true;
        startBtn.textContent = 'Sent';
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
    }
    
    startBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!currentUser) {
            alert('Please login to start a conversation');
            window.location.href = 'login.html';
            return;
        }
        
        // Prevent multiple clicks
        if (hasInteractedWithPost(_id)) {
            showToast('You have already sent a notification for this post');
            return;
        }
        
        startBtn.disabled = true;
        startBtn.textContent = 'Sending...';
        
        const result = await handleStartConversation(_id, author);
        
        if (result.success) {
            addInteractedPost(_id);
            startBtn.textContent = 'Sent';
            startBtn.style.opacity = '0.5';
            startBtn.style.cursor = 'not-allowed';
        } else {
            startBtn.disabled = false;
            startBtn.textContent = 'Connect';
        }
    });

    // Dropdown menu (only for owner)
    const dropdown = document.createElement('div');
    dropdown.classList.add('post-dropdown');
    dropdown.innerHTML = `
        <button class="edit-btn"><i class="ri-edit-line"></i> Edit</button>
        <button class="delete-btn"><i class="ri-delete-bin-line"></i> Delete</button>
    `;
    dropdown.style.display = 'none';

    postDiv.append(postHeading, postMeta, postText, startBtn);
    if (isOwner) {
        postDiv.appendChild(dropdown);
    }

    // ========== DROPDOWN EVENTS ==========
    if (isOwner) {
        const dots = postMeta.querySelector('.three-dots');
        const editBtn = dropdown.querySelector('.edit-btn');
        const deleteBtn = dropdown.querySelector('.delete-btn');

        dots.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.post-dropdown').forEach(d => {
                if (d !== dropdown) d.style.display = 'none';
            });
            dropdown.style.display = (dropdown.style.display === 'flex') ? 'none' : 'flex';
        });

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editingPost = post;
            const modalTitle = document.getElementById('modalTitle');
            if (modalTitle) modalTitle.textContent = 'Edit Skill Post';
            if (postTitle) postTitle.value = title;
            if (postType) postType.value = type;
            if (postCategory) postCategory.value = category;
            if (skillTextarea) skillTextarea.value = description;
            if (postModal) postModal.style.display = 'flex';
            if (postModal) postModal.setAttribute('aria-hidden', 'false');
            dropdown.style.display = 'none';
            if (skillTextarea) skillTextarea.focus();
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this post?')) {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${BASE_URL}/posts/${_id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        postDiv.remove();
                    } else {
                        const data = await response.json();
                        alert(data.message || 'Could not delete post');
                    }
                } catch (error) {
                    console.error('Error deleting post:', error);
                    alert('Could not delete post. Check console.');
                }
            }
        });
    }

    return postDiv;
}

// ====================== CREATE / UPDATE POST (FIXED) ======================
if (submitSkill) {
    submitSkill.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Please login to create a post');
            window.location.href = 'login.html';
            return;
        }

        const title = postTitle.value.trim();
        const type = postType.value.trim().toLowerCase();
        const category = postCategory.value.trim().toLowerCase() || 'other';
        const description = skillTextarea.value.trim();

        if (!title || !description || !postCategory.value) {
            alert('Please fill in Title, Type, Category, and Description.');
            return;
        }

        const postData = { title, type, category, description };
        if (!editingPost) postData.color = getRandomPastelColor();

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Authentication token not found. Please log in.');
            
            let response;
            let newOrUpdatedPost;
            let method;
            let url;

            if (editingPost) {
                method = 'PUT';
                url = `${BASE_URL}/posts/${editingPost._id}`;
            } else {
                method = 'POST';
                url = `${BASE_URL}/posts`;
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(postData),
            });
            
            newOrUpdatedPost = await response.json();
            
            if (response.ok) {
                if (editingPost) {
                    const oldPostElement = document.querySelector(`[data-id="${editingPost._id}"]`);
                    if (oldPostElement) {
                        const updatedPostElement = createPostElement(newOrUpdatedPost);
                        oldPostElement.parentElement.replaceChild(updatedPostElement, oldPostElement);
                    }
                } else {
                    const postElement = createPostElement(newOrUpdatedPost);
                    if (type === 'request' && requestsContainer) requestsContainer.prepend(postElement);
                    else if (offersContainer) offersContainer.prepend(postElement);
                }
                
                resetModal();
            } else {
                throw new Error(newOrUpdatedPost.message || `Failed to save post. HTTP Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert(error.message || 'Failed to save post. Please check console and try again.');
        }
    });
}


// ====================== START CONVERSATION ======================
async function handleStartConversation(postId, postAuthor) {
    if (!currentUser) {
        alert('Please login to start a conversation');
        return { success: false };
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId })
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast('Connection request sent!');
            return { success: true };
        } else {
            showToast(data.message || 'Failed to send connection request');
            return { success: false };
        }
    } catch (error) {
        console.error('Error starting conversation:', error);
        showToast('Failed to start conversation');
        return { success: false };
    }
}

// ====================== TOAST NOTIFICATIONS ======================
function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ====================== NOTIFICATIONS MANAGEMENT ======================
async function updateNotifications() {
    if (!currentUser) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const notifications = await response.json();
            const unreadCount = notifications.length;
            updateNotificationBadge(unreadCount);
            renderNotifications(notifications);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// RENDER NOTIFICATIONS (Still needs the Accept/Reject logic later)
function renderNotifications(notifications) {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    list.innerHTML = ''; // Clear list content

    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications" style="text-align: center; color: #999;">No notifications</p>';
        return;
    }

    // Now safely integrating the Accept/Reject buttons and detailed rendering
    notifications.forEach(notif => {
        const notiEl = document.createElement('div');
        
        notiEl.innerHTML = `
            <div class="notification-item" data-id="${notif._id}" data-sender="${notif.senderId}" style="padding: 10px; border-bottom: 1px solid #eee;">
                <p style="margin: 0 0 5px; font-size: 14px;">
                    <span style="font-weight: bold;">${notif.senderName}</span> wants to connect about:
                    <br>
                    <span style="font-size: 13px; color: #333;">"${notif.postTitle}" (Type: ${notif.postType})</span>
                </p>
                
               <div class="notification-item" data-id="${notif._id}" data-sender="${notif.senderId}">
    <p>
        <span class="sender-name">${notif.senderName}</span> wants to connect about:
        <br>
        <span class="post-title">"${notif.postTitle}" (Type: ${notif.postType})</span>
    </p>
    
    <div class="notification-actions">
        <button class="noti-btn noti-accept-btn" 
                data-post-id="${notif.postId}" 
                data-sender-id="${notif.senderId}"
                data-noti-id="${notif._id}">
            Accept
        </button>
        
        <button class="noti-btn noti-reject-btn"
                data-noti-id="${notif._id}">
            Reject
        </button>
    </div>
</div>

        `;
        list.appendChild(notiEl);

        // Attach event listeners to the dynamically created buttons
        const acceptBtn = notiEl.querySelector('.noti-accept-btn');
        const rejectBtn = notiEl.querySelector('.noti-reject-btn');

        if (acceptBtn) acceptBtn.addEventListener('click', () => handleConnectionAction(notif, 'accept'));
        if (rejectBtn) rejectBtn.addEventListener('click', () => handleConnectionAction(notif, 'reject'));
    });
}

// Connection action handler (Accept/Reject logic for redirect)
async function handleConnectionAction(notification, action) {
    if (!currentUser) return;
    
    const token = localStorage.getItem('token');
    const url = `${BASE_URL}/connections/${action}`; 
    
    const payload = {
        notificationId: notification._id,
        postId: notification.postId,
        senderId: notification.senderId, 
        recipientId: currentUser.id 
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            // Refresh notifications and posts list
            updateNotifications(); 
            fetchPosts(); 

            if (action === 'accept') {
                showToast('Connection accepted. Starting chat...');
                // Store the chatId returned from the backend
                localStorage.setItem('currentChatId', data.chatId); 
                window.location.href = 'chat.html';
            } else if (action === 'reject') {
                showToast('Connection rejected. Notification dismissed.');
            }
        } else {
            alert(data.error || `Failed to ${action} connection.`);
        }
    } catch (error) {
        console.error(`Error handling ${action}:`, error);
        alert('Network error. Failed to process connection.');
    }
}


// ====================== LIVE SEARCH & SUGGESTIONS ======================
let debounceTimer;

if (searchBar) {
    searchBar.addEventListener("keyup", async () => {
        const qry = searchBar.value.trim();
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            fetchPosts(qry);
            if (!qry || !suggestionUL) return suggestionUL.classList.remove("show");

            try {
                const response = await fetch(`${BASE_URL}/posts/suggest?qry=${encodeURIComponent(qry)}`);
                if (!response.ok) throw new Error('Failed to fetch suggestions');

                const suggestions = await response.json();
                suggestionUL.innerHTML = "";
                const seenCategories = new Set();

                suggestions.forEach(s => {
                    if (s.category && !seenCategories.has(s.category)) {
                        const catHeader = document.createElement("li");
                        catHeader.textContent = s.category.charAt(0).toUpperCase() + s.category.slice(1);
                        catHeader.classList.add("category");
                        catHeader.style.cursor = 'pointer';
                        catHeader.addEventListener("click", () => {
                            fetchPostsByCategory(s.category);
                            if (suggestionUL) suggestionUL.classList.remove("show");
                            if (searchBar) searchBar.value = s.category;
                        });
                        suggestionUL.appendChild(catHeader);
                        seenCategories.add(s.category);
                    }
                    const li = document.createElement("li");
                    li.textContent = s.title;
                    li.addEventListener("click", () => {
                        if (searchBar) searchBar.value = s.title;
                        if (suggestionUL) suggestionUL.classList.remove("show");
                        fetchPosts(s.title);
                    });
                    suggestionUL.appendChild(li);
                });

                if (suggestions.length > 0) suggestionUL.classList.add("show");
                else suggestionUL.classList.remove("show");

            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        }, 300);
    });
}

async function fetchPostsByCategory(category) {
    try {
        const response = await fetch(`${BASE_URL}/posts/category/${category}`);
        if (!response.ok) throw new Error('Failed to fetch category posts');
        const posts = await response.json();

        if (requestsContainer) requestsContainer.innerHTML = '';
        if (offersContainer) offersContainer.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = createPostElement(post);
            if (post.type === 'request' && requestsContainer) requestsContainer.appendChild(postElement);
            else if (offersContainer) offersContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error fetching category posts:', error);
    }
}

// Close suggestions & dropdowns when clicking outside
document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box") && !event.target.closest("#suggestion")) {
        if (suggestionUL) suggestionUL.classList.remove("show");
    }
    document.querySelectorAll('.post-dropdown').forEach(d => d.style.display = 'none');
    
    // Close notifications dropdown
    if (notificationsDropdown && notificationsNavLink && 
        !event.target.closest('#notificationsNavLink') && 
        !event.target.closest('.notifications-dropdown')) {
        notificationsDropdown.classList.remove('show');
    }
});


// ====================== HISTORY MANAGEMENT ======================

function toggleHistory() {
    if (notificationsDropdown) notificationsDropdown.classList.remove('show');
    
    if (historyDropdown) historyDropdown.style.display = historyDropdown.style.display === 'flex' ? 'none' : 'flex';
    
    if (historyDropdown && historyDropdown.style.display === 'flex') {
        fetchHistory();
    }
}

async function fetchHistory() {
    if (!currentUser) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const sessions = await response.json();
            renderHistory(sessions);
        } else {
            console.error('Failed to fetch history.');
            renderHistory([]);
        }
    } catch (error) {
        console.error('Network error fetching history:', error);
        renderHistory([]);
    }
}

function renderHistory(sessions) {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = ''; 

    if (sessions.length === 0) {
        list.innerHTML = '<p class="no-history" style="text-align: center; color: #999;">No completed sessions yet.</p>';
        return;
    }

    sessions.forEach(session => {
        const historyEl = document.createElement('div');
        historyEl.className = 'history-item notification-item'; 
        
        const partnerName = session.partnerName || 'Unknown User'; 
        const statusText = session.status === 'completed' ? 'Completed' : 'Ended Early';
        const statusColor = session.status === 'completed' ? '#4CAF50' : '#f44336';
        const startDate = session.startDate ? new Date(session.startDate).toLocaleDateString() : 'N/A';
        const endDate = session.endDate ? new Date(session.endDate).toLocaleDateString() : 'N/A';
        
        historyEl.innerHTML = `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <p style="margin: 0; padding-bottom: 5px;">
                    <span style="font-weight: bold;">${session.title || 'Direct Session'}</span>
                </p>
                <p style="font-size: 13px; margin: 0; color: #555;">
                    Partner: ${partnerName}
                    <br>
                    Started: ${startDate} | Finished: ${endDate}
                </p>
                <p style="font-size: 13px; font-weight: 600; margin: 5px 0 0 0; color: ${statusColor};">
                    Status: ${statusText} (Ended by: ${session.endedBy})
                </p>
            </div>
        `;
        
        list.appendChild(historyEl);
    });
}


// ====================== NOTIFICATIONS DROPDOWN SETUP ======================
function setupNotificationsDropdown() {
    // Attach click handler to the history icon
    if (historyNavLink) {
        historyNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHistory();
        });
    }

    // Attach click handler to the notification icon
    if (notificationsNavLink) {
        notificationsNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // This is the original logic to show/hide the dropdown
            if (notificationsDropdown) notificationsDropdown.classList.toggle('show');
            if (notificationsDropdown && notificationsDropdown.classList.contains('show')) {
                // Ensure history dropdown is closed when notification opens
                if (historyDropdown) historyDropdown.style.display = 'none';
                updateNotifications();
            }
        });
    }

    // Clear all notifications logic
    const clearNotifications = document.getElementById('clearNotifications');
    if (clearNotifications) {
        clearNotifications.addEventListener('click', async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Please login first');
                return;
            }
            
            if (!confirm('Are you sure you want to delete all notifications?')) {
                return;
            }
            
            try {
                const response = await fetch(`${BASE_URL}/notifications`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || `HTTP ${response.status}: Failed to delete notifications`);
                }
                
                updateNotifications();
                showToast('All notifications deleted');
            } catch (error) {
                console.error('Error deleting notifications:', error);
                showToast('Error: ' + error.message);
            }
        });
    }
}


// ====================== LOGOUT ======================
function setupLogout() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
}

// ====================== INITIAL LOAD ======================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchPosts();
    setupNotificationsDropdown();
    setupLogout();
});