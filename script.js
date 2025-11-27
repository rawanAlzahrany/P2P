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
            // Handle new message if on chat page
            if (window.location.pathname.includes('chat.html')) {
                // Will be handled in chat.js
            }
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
const postBtn = document.getElementById('postBtn');
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




// ====================== POST / EDIT STATE ======================
let editingPost = null;

// ====================== MODAL BEHAVIOR ======================
if (postBtn) {
    postBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please login to create a post');
            window.location.href = 'login.html';
            return;
        }
        postModal.style.display = 'flex';
        postModal.setAttribute('aria-hidden', 'false');
        skillTextarea.focus();
    });
}

if (closeModal) {
    closeModal.addEventListener('click', resetModal);
}

function resetModal() {
    postModal.style.display = 'none';
    postModal.setAttribute('aria-hidden', 'true');
    skillTextarea.value = '';
    postTitle.value = '';
    postType.value = 'request';
    postCategory.value = '';
    editingPost = null;
    document.getElementById('modalTitle').textContent = 'Create a Skill Post';
}

// ====================== FETCH POSTS ======================
async function fetchPosts(searchTerm = '') {
    requestsContainer.innerHTML = '';
    offersContainer.innerHTML = '';

    let url = searchTerm ? `${BASE_URL}/posts/search?qry=${encodeURIComponent(searchTerm)}` : `${BASE_URL}/posts`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();

        if (posts.length === 0) {
            requestsContainer.innerHTML = '<p>No posts found.</p>';
            offersContainer.innerHTML = '<p>No posts found.</p>';
        } else {
            posts.forEach(post => {
                const postElement = createPostElement(post);
                if (post.type === 'request') requestsContainer.appendChild(postElement);
                else if (post.type === 'offer') offersContainer.appendChild(postElement);
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
            startBtn.textContent = 'Start';
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
            document.getElementById('modalTitle').textContent = 'Edit Skill Post';
            postTitle.value = title;
            postType.value = type;
            postCategory.value = category;
            skillTextarea.value = description;
            postModal.style.display = 'flex';
            postModal.setAttribute('aria-hidden', 'false');
            dropdown.style.display = 'none';
            skillTextarea.focus();
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
            showToast('Notification sent!');
            return { success: true };
        } else {
            showToast(data.message || 'Failed to send notification');
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

// ====================== NOTIFICATIONS ======================
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
            const unreadCount = notifications.filter(n => !n.read).length;
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

function renderNotifications(notifications) {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications">No notifications</p>';
        return;
    }

    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif._id}" data-sender="${notif.sender._id}">
            <div class="notification-content">
                <strong>${notif.sender.name}</strong>
                <p>${notif.message}</p>
                <small>${new Date(notif.createdAt).toLocaleString()}</small>
            </div>
        </div>
    `).join('');

    // Add click handlers
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const notifId = item.dataset.id;
            const senderId = item.dataset.sender;
            
            // Mark as read
            const token = localStorage.getItem('token');
            await fetch(`${BASE_URL}/notifications/${notifId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Create or get chat
            const chatResponse = await fetch(`${BASE_URL}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ otherUserId: senderId })
            });
            
            if (chatResponse.ok) {
                const chat = await chatResponse.json();
                localStorage.setItem('currentChatId', chat._id);
                window.location.href = 'chat.html';
            }
        });
    });
}

// ====================== CREATE / UPDATE POST ======================
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
            let response;
            let newOrUpdatedPost;

            if (editingPost) {
                response = await fetch(`${BASE_URL}/posts/${editingPost._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(postData),
                });
                newOrUpdatedPost = await response.json();
                
                if (response.ok) {
                    const oldPostElement = document.querySelector(`[data-id="${editingPost._id}"]`);
                    if (oldPostElement) {
                        const updatedPostElement = createPostElement(newOrUpdatedPost);
                        oldPostElement.parentElement.replaceChild(updatedPostElement, oldPostElement);
                    }
                } else {
                    throw new Error(newOrUpdatedPost.message || 'Failed to update post');
                }
            } else {
                response = await fetch(`${BASE_URL}/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(postData),
                });
                newOrUpdatedPost = await response.json();
                
                if (response.ok) {
                    const postElement = createPostElement(newOrUpdatedPost);
                    if (type === 'request') requestsContainer.prepend(postElement);
                    else offersContainer.prepend(postElement);
                } else {
                    throw new Error(newOrUpdatedPost.message || 'Failed to create post');
                }
            }

            resetModal();
        } catch (error) {
            console.error('Submission Error:', error);
            alert(error.message || 'Failed to save post. Please try again.');
        }
    });
}

// ====================== LIVE SEARCH & SUGGESTIONS ======================
let debounceTimer;

if (searchBar) {
    searchBar.addEventListener("keyup", async () => {
        const qry = searchBar.value.trim();
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            fetchPosts(qry);
            if (!qry) return suggestionUL.classList.remove("show");

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
                            fetch(`${BASE_URL}/posts/category/${s.category}`)
                                .then(res => res.json())
                                .then(posts => {
                                    requestsContainer.innerHTML = '';
                                    offersContainer.innerHTML = '';
                                    posts.forEach(post => {
                                        const postElement = createPostElement(post);
                                        if (post.type === 'request') requestsContainer.appendChild(postElement);
                                        else offersContainer.appendChild(postElement);
                                    });
                                });
                        });
                        suggestionUL.appendChild(catHeader);
                        seenCategories.add(s.category);
                    }
                    const li = document.createElement("li");
                    li.textContent = s.title;
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

if (suggestionUL) {
    suggestionUL.addEventListener("click", (event) => {
        if (event.target.tagName === "LI" && !event.target.classList.contains("category")) {
            const qry = event.target.textContent;
            searchBar.value = qry;
            suggestionUL.innerHTML = "";
            suggestionUL.classList.remove("show");
            fetchPosts(qry);
        }
    });
}

// Close suggestions & dropdowns when clicking outside
document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box") && !event.target.closest("#suggestion")) {
        if (suggestionUL) suggestionUL.classList.remove("show");
    }
    document.querySelectorAll('.post-dropdown').forEach(d => d.style.display = 'none');
    
    // Close notifications dropdown
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationsNavLink = document.getElementById('notificationsNavLink');
    if (notificationsDropdown && notificationsNavLink && 
        !event.target.closest('#notificationsNavLink') && 
        !event.target.closest('.notifications-dropdown')) {
        notificationsDropdown.classList.remove('show');
    }
});

// ====================== NOTIFICATIONS DROPDOWN ======================
function setupNotificationsDropdown() {
    const notificationsNavLink = document.getElementById('notificationsNavLink');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const clearNotifications = document.getElementById('clearNotifications');

    if (notificationsNavLink) {
        notificationsNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (notificationsDropdown) {
                notificationsDropdown.classList.toggle('show');
                if (notificationsDropdown.classList.contains('show')) {
                    updateNotifications();
                }
            }
        });
    }

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
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                
                const text = await response.text();
                console.log('Response text:', text);
                
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    throw new Error('Server returned invalid response: ' + text.substring(0, 100));
                }
                
                if (!response.ok) {
                    console.error('Server error:', data);
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
