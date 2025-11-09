// =============== CONSTANTS ===============
const BASE_URL = 'http://localhost:3000/api/posts';

// =============== RANDOM PASTEL COLOR ===============
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 5) + 95;
    const lightness = Math.floor(Math.random() * 5) + 95;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// =============== SIDEBAR ACTIVE LINK ===============
const navLink = document.querySelectorAll('.nav__link');
function linkColor() {
    navLink.forEach(link => link.classList.remove('active-link'));
    this.classList.add('active-link');
}
navLink.forEach(link => link.addEventListener('click', linkColor));

// =============== FRONT-END ELEMENTS ===============
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

// =============== POST / EDIT STATE ===============
let editingPost = null;

// =============== MODAL BEHAVIOR ===============
postBtn.addEventListener('click', () => {
    postModal.style.display = 'flex';
    postModal.setAttribute('aria-hidden', 'false');
    skillTextarea.focus();
});

closeModal.addEventListener('click', resetModal);
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

// =============== FETCH POSTS (all / by search) ===============
async function fetchPosts(searchTerm = '') {
    requestsContainer.innerHTML = '';
    offersContainer.innerHTML = '';

    let url = BASE_URL;
    if (searchTerm) url = `${BASE_URL}/search?qry=${encodeURIComponent(searchTerm)}`;

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

// =============== POST CARD CREATION ===============
function createPostElement(post) {
    const { _id, title, type, category, description, color } = post;
    const displayType = type.charAt(0).toUpperCase() + type.slice(1);
    const displayCategory = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';

    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.dataset.id = _id;
    postDiv.style.backgroundColor = color || getRandomPastelColor();

    const postHeading = document.createElement('h4');
    postHeading.textContent = title;

    const postMeta = document.createElement('div');
    postMeta.classList.add('post-meta');
    postMeta.textContent = `${displayType} | ${displayCategory}`;

    const dotsSpan = document.createElement('span');
    dotsSpan.textContent = ' ⋮';
    dotsSpan.classList.add('three-dots');
    postMeta.appendChild(dotsSpan);

    const postText = document.createElement('p');
    postText.textContent = description;

    const dropdown = document.createElement('div');
    dropdown.classList.add('post-dropdown');
    dropdown.innerHTML = `<button class="edit-btn"><i class="ri-edit-line"></i> Edit</button>
                          <button class="delete-btn"><i class="ri-delete-bin-line"></i> Delete</button>`;

    postDiv.append(postHeading, postMeta, postText, dropdown);

    const dots = postMeta.querySelector('.three-dots');
    const editBtn = dropdown.querySelector('.edit-btn');
    const deleteBtn = dropdown.querySelector('.delete-btn');

    // Dropdown toggle
    dots.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.post-dropdown').forEach(d => {
            if (d !== dropdown) d.style.display = 'none';
        });
        dropdown.style.display = (dropdown.style.display === 'flex') ? 'none' : 'flex';
    });

    // Edit
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

    // Delete
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this post?')) {
            try {
                await fetch(`${BASE_URL}/${_id}`, { method: 'DELETE' });
                if (postDiv.parentElement) postDiv.parentElement.removeChild(postDiv);
            } catch (error) {
                console.error('Error deleting post:', error);
                alert('Could not delete post. Check console.');
            }
        }
    });

    return postDiv;
}

// =============== CREATE / UPDATE POST ===============
submitSkill.addEventListener('click', async () => {
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
        let response;
        let newOrUpdatedPost;

        if (editingPost) {
            response = await fetch(`${BASE_URL}/${editingPost._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData),
            });
            newOrUpdatedPost = await response.json();
            const oldPostElement = document.querySelector(`[data-id="${editingPost._id}"]`);
            if (oldPostElement) {
                const updatedPostElement = createPostElement(newOrUpdatedPost);
                oldPostElement.parentElement.replaceChild(updatedPostElement, oldPostElement);
            }
        } else {
            response = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData),
            });
            newOrUpdatedPost = await response.json();
            const postElement = createPostElement(newOrUpdatedPost);
            if (type === 'request') requestsContainer.prepend(postElement);
            else offersContainer.prepend(postElement);
        }

        if (!response.ok) throw new Error(newOrUpdatedPost.message || 'Failed to process post');
        resetModal();
    } catch (error) {
        console.error('Submission Error:', error);
        alert('Failed to save post. Please try again.');
    }
});

// =============== LIVE SEARCH & SUGGESTIONS ===============
let debounceTimer;
searchBar.addEventListener("keyup", async () => {
    const qry = searchBar.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        fetchPosts(qry);
        if (!qry) return suggestionUL.classList.remove("show");

        try {
            const response = await fetch(`${BASE_URL}/suggest?qry=${encodeURIComponent(qry)}`);
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
                    catHeader.addEventListener("click", () => fetchPostsByCategory(s.category));
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

suggestionUL.addEventListener("click", (event) => {
    if (event.target.tagName === "LI" && !event.target.classList.contains("category")) {
        const qry = event.target.textContent;
        searchBar.value = qry;
        suggestionUL.innerHTML = "";
        suggestionUL.classList.remove("show");
        fetchPosts(qry);
    }
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-box") && !event.target.closest("#suggestion")) {
        suggestionUL.classList.remove("show");
    }
    document.querySelectorAll('.post-dropdown').forEach(d => d.style.display = 'none');
});

// Initial load
document.addEventListener('DOMContentLoaded', fetchPosts);
