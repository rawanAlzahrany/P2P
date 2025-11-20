// ====================== CONSTANTS ======================
const API_BASE = 'http://localhost:3000/api';
let socket = null;
let currentUser = null;
let chats = [];
let activeChatId = null;
let activeChat = null;

// ====================== ELEMENTS ======================
const messagesEl = document.getElementById("messages");
const chatHeader = document.getElementById("chatHeader");
const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const sidebar = document.querySelector('.sidebar');

// ====================== INITIALIZATION ======================
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        alert('Please login to access chat');
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Initialize Socket.io
    socket = io('http://localhost:3000');
    socket.on('connect', () => {
        socket.emit('authenticate', token);
    });
    
    socket.on('new_message', async (data) => {
        if (data.chatId === activeChatId) {
            // Update active chat
            await loadChats();
            activeChat = chats.find(c => c._id === activeChatId);
            if (activeChat) {
                // Add new message with animation
                addMessageToUI(data.message, false, true);
            }
        } else {
            // Update chat list
            await loadChats();
        }
    });
    
    socket.on('message_sent', async (data) => {
        if (data.chatId === activeChatId) {
            // Add new message with animation
            addMessageToUI(data.message, true, true);
        }
    });
    
    // Load chats
    await loadChats();
    
    // Check if there's a specific chat to open
    const chatId = localStorage.getItem('currentChatId');
    if (chatId) {
        await openChat(chatId);
        localStorage.removeItem('currentChatId');
    }
});

// ====================== LOAD CHATS ======================
async function loadChats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load chats');
        
        chats = await response.json();
        renderChatList();
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// ====================== RENDER CHAT LIST ======================
function renderChatList() {
    // Clear existing contacts (except header)
    const existingContacts = sidebar.querySelectorAll('.contact');
    existingContacts.forEach(contact => {
        if (!contact.closest('.sidebar-header')) {
            contact.remove();
        }
    });
    
    if (chats.length === 0) {
        const noChats = document.createElement('div');
        noChats.className = 'contact';
        noChats.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                No chats yet. Start a conversation from a post!
            </div>
        `;
        sidebar.appendChild(noChats);
        return;
    }
    
    chats.forEach(chat => {
        const otherUser = chat.participants.find(p => p._id !== currentUser.id);
        if (!otherUser) return;
        
        const lastMessage = chat.messages.length > 0 
            ? chat.messages[chat.messages.length - 1] 
            : null;
        
        const contact = document.createElement('div');
        contact.className = 'contact';
        contact.dataset.chatId = chat._id;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = otherUser.name.charAt(0).toUpperCase();
        
        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = otherUser.name;
        
        const last = document.createElement('div');
        last.className = 'last';
        if (lastMessage) {
            const isFromMe = lastMessage.sender._id === currentUser.id;
            last.textContent = (isFromMe ? 'You: ' : '') + lastMessage.text;
        } else {
            last.textContent = 'No messages yet';
        }
        
        info.appendChild(name);
        info.appendChild(last);
        contact.appendChild(avatar);
        contact.appendChild(info);
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'contact-delete-btn';
        deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
        deleteBtn.title = 'Delete contact';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Delete chat with ${otherUser.name}?`)) {
                await deleteContact(chat._id);
            }
        });
        contact.appendChild(deleteBtn);
        
        contact.addEventListener('click', () => {
            openChat(chat._id);
        });
        
        sidebar.appendChild(contact);
    });
}

// ====================== OPEN CHAT ======================
async function openChat(chatId) {
    activeChatId = chatId;
    activeChat = chats.find(c => c._id === chatId);
    
    if (!activeChat) {
        // Reload chats if not found
        await loadChats();
        activeChat = chats.find(c => c._id === chatId);
    }
    
    if (!activeChat) {
        console.error('Chat not found');
        return;
    }
    
    const otherUser = activeChat.participants.find(p => p._id !== currentUser.id);
    if (chatHeader) {
        // Clear header but keep the button
        const clearBtn = chatHeader.querySelector('#clearChatBtn');
        chatHeader.innerHTML = '';
        const headerTitle = document.createElement('span');
        headerTitle.textContent = otherUser ? otherUser.name : 'Chat';
        chatHeader.appendChild(headerTitle);
        if (clearBtn) {
            chatHeader.appendChild(clearBtn);
        }
    }
    
    renderMessages();
    
    // Update active contact
    document.querySelectorAll('.contact').forEach(contact => {
        contact.classList.remove('active');
        if (contact.dataset.chatId === chatId) {
            contact.classList.add('active');
        }
    });
}

// ====================== RENDER MESSAGES ======================
function renderMessages() {
    if (!messagesEl || !activeChat) return;
    
    messagesEl.innerHTML = '';
    
    activeChat.messages.forEach(msg => {
        const isFromMe = msg.sender._id === currentUser.id;
        addMessageToUI(msg, isFromMe, false); // false = not a new message
    });
    
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ====================== ADD MESSAGE TO UI ======================
function addMessageToUI(msg, isFromMe, isNew = true) {
    if (!messagesEl) return;
    
    // Check if message already exists
    const existingMsg = Array.from(messagesEl.children).find(el => 
        el.textContent === msg.text && 
        el.classList.contains(isFromMe ? 'me' : 'them')
    );
    
    if (existingMsg) return;
    
    const div = document.createElement("div");
    div.className = "message " + (isFromMe ? "me" : "them");
    // Only add new-message class for new messages (with animation)
    if (isNew) {
        div.classList.add("new-message");
    }
    div.textContent = msg.text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ====================== SEND MESSAGE ======================
if (sendBtn) {
    sendBtn.onclick = async () => {
        if (!activeChatId) {
            alert('Please select a chat first');
            return;
        }
        
        const txt = input.value.trim();
        if (!txt) return;
        
        try {
            const token = localStorage.getItem('token');
            
            // Emit message via socket
            socket.emit('send_message', {
                chatId: activeChatId,
                text: txt,
                senderId: currentUser.id
            });
            
            input.value = "";
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    };
}

// Allow Enter key to send
if (input) {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
}

// ====================== CLEAR CHAT BUTTON ======================
const clearChatBtn = document.getElementById('clearChatBtn');
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', clearChat);
}

// ====================== DELETE CONTACT ======================
async function deleteContact(chatId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/${chatId}/contact`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Remove from UI
            const contactEl = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (contactEl) {
                contactEl.remove();
            }
            
            // Clear chat if it's the active one
            if (activeChatId === chatId) {
                activeChatId = null;
                activeChat = null;
                messagesEl.innerHTML = '';
                chatHeader.textContent = 'Me';
            }
            
            alert('Contact deleted successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete contact');
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Error deleting contact');
    }
}

// ====================== CLEAR CHAT ======================
async function clearChat() {
    if (!activeChatId) {
        alert('Please select a chat first');
        return;
    }

    if (!confirm('Are you sure you want to delete all messages? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/${activeChatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            messagesEl.innerHTML = '';
            await loadChats();
            alert('Chat cleared successfully');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to clear chat');
        }
    } catch (error) {
        console.error('Error clearing chat:', error);
        alert('Error clearing chat');
    }
}

// ====================== HELPERS ======================
function nowText() {
    const d = new Date();
    return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}
