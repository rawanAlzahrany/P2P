/*=============== ACTIVE LINK ===============*/
const navLink = document.querySelectorAll('.nav__link');

function linkColor() {
    navLink.forEach(link => link.classList.remove('active-link'));
    this.classList.add('active-link');
}

navLink.forEach(link => link.addEventListener('click', linkColor));

/*=============== POST MODAL ===============*/
const postBtn = document.getElementById('postBtn');
const postModal = document.getElementById('postModal');
const closeModal = document.getElementById('closeModal');
const submitSkill = document.getElementById('submitSkill');
const skillTextarea = document.getElementById('skillTextarea');
const postsContainer = document.getElementById('postsContainer');
const postTitle = document.getElementById('postTitle');
const postType = document.getElementById('postType');
const postCategory = document.getElementById('postCategory');

// Open modal and focus textarea
postBtn.addEventListener('click', () => {
    postModal.style.display = 'flex';
    skillTextarea.focus();
});

// Close modal and reset inputs
closeModal.addEventListener('click', () => {
    postModal.style.display = 'none';
    skillTextarea.value = '';
    postTitle.value = '';
    postType.value = 'request';
    postCategory.value = 'language';
});

// Submit new post
submitSkill.addEventListener('click', () => {
    const title = postTitle.value.trim();
    const type = postType.value;
    const category = postCategory.value;
    const description = skillTextarea.value.trim();

    if (title === '' || description === '') return; // prevent empty posts

    // Create post card container
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    // Title
    const postHeading = document.createElement('h4');
    postHeading.textContent = title;

    // Meta info (type | category) and three dots
    const postMeta = document.createElement('div');
    postMeta.classList.add('post-meta');
    postMeta.innerHTML = `<span>${type} | ${category}</span> <span class="three-dots">⋮</span>`;

    // Description
    const postText = document.createElement('p');
    postText.textContent = description;

    // Append elements to postDiv
    postDiv.appendChild(postHeading);
    postDiv.appendChild(postMeta);
    postDiv.appendChild(postText);

    // Prepend to posts container
    postsContainer.prepend(postDiv);

    // Reset modal inputs and close modal
    skillTextarea.value = '';
    postTitle.value = '';
    postType.value = 'request';
    postCategory.value = 'language';
    postModal.style.display = 'none';
});

