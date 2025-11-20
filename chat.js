// Fake Messages
const chatData = {
    "1": [
        { fromMe: false, text: "Hey — are you free?", time: "2:08 PM" },
        { fromMe: true, text: "Give me 10 minutes.", time: "2:09 PM" },
        { fromMe: false, text: "Perfect 👍", time: "2:10 PM" }
    ],
    "2": [
        { fromMe: false, text: "Uploaded the document.", time: "11:20 AM" }
    ],
    "3": [
        { fromMe: false, text: "Are you there?", time: "1:05 PM" }
    ]
};

let active = "1";

// Elements
const messagesEl = document.getElementById("messages");
const chatHeader = document.getElementById("chatHeader");
const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

// Helpers
function nowText() {
    const d = new Date();
    return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function simulateReply(userText) {
    const text = userText.toLowerCase().trim();

    if (text.includes("hi") || text.includes("hello") || text.includes("hey")) 
        return "Hi! How are you?";
    if (text.includes("how are you") || text.includes("how r u")) 
        return "I'm good, thanks! And you?";
    if (text.includes("do you accept the offer")) 
        return "Yes";
    if (text.includes("thank you") || text.includes("thanks")) 
        return "You're welcome!";
    if (text.includes("sorry") || text.includes("my bad")) 
        return "No worries!";
    if (text.includes("good morning")) 
        return "Good morning! Have a nice day!";
    if (text.includes("good night")) 
        return "Good night! Sweet dreams!";
    if (text.includes("bye") || text.includes("see you")) 
        return "Bye! Talk to you later.";
    if (text.includes("?")) 
        return "Good question, let me check.";
    if (text.includes("what is your name") || text.includes("who are you")) 
        return "I'm your chat assistant 🤖";
    if (text.includes("help") || text.includes("support")) 
        return "Sure! How can I help you?";
    

    return "Okay 👍";
}

// Render messages
function loadMessages() {
    messagesEl.innerHTML = "";
    chatData[active].forEach(msg => {
        const div = document.createElement("div");
        div.className = "message " + (msg.fromMe ? "me" : "them");
        div.textContent = msg.text;
        messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Switching contacts
document.querySelectorAll(".contact").forEach(contact => {
    contact.onclick = () => {
        active = contact.dataset.id;
        chatHeader.textContent = contact.querySelector(".name").textContent;
        loadMessages();
    };
});

// Sending a message
sendBtn.onclick = () => {
    const txt = input.value.trim();
    if (!txt) return;

    // User message
    chatData[active].push({fromMe: true, text: txt, time: nowText()});
    input.value = "";
    loadMessages();

    // Simulate reply after short delay
    setTimeout(() => {
        const reply = {fromMe: false, text: simulateReply(txt), time: nowText()};
        chatData[active].push(reply);
        loadMessages();
    }, 700);
};

// Load initial chat
loadMessages();
