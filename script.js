// Configuration
const CONFIG = {
    masterKey: '$2a$10$5TyPwxtO8pS6G5qBROpTx.PX3NTZx3bg/W6cnelH2J5Qzyfz27ZA.',
    binId: '68e20eaa43b1c97be95acd5b',
    webhookUrl: 'https://discord.com/api/webhooks/1419536249034899487/sXGKPDe4t9126cevMaCcFwkDSN3Znxf_cRbSfrOkhKzND0IeUNYQOAVg53Z15YuVLXgQ',
    maxHistory: 6,
    searchDelay: 2500, // 2.5 seconds delay before fallback
    minMatchCount: 2 // Minimum matching words required
};

// DOM Elements
const chatBox = document.getElementById('chat');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// State
let jsonData = [];
let messageHistory = [];
let answerIndexCache = {}; // Tracks last used answer index for each question

// Data Fetching
async function fetchJsonData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.binId}/latest`, {
            headers: { 'X-Master-Key': CONFIG.masterKey }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        jsonData = data.record;
    } catch (error) {
        console.error('Error fetching JSON:', error);
        addBotMessage('Error loading responses. Please try again.');
    }
}

// Message Handling
function addUserMessage(message) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = message;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    messageHistory.push({ type: 'user', text: message });
    if (messageHistory.length > CONFIG.maxHistory) messageHistory.shift();
}

function addBotMessage(message) {
    const welcome = chatBox.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.innerHTML = `<img src="SAI.jpg" alt="Satyam AI Logo">${message}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    messageHistory.push({ type: 'bot', text: message });
    if (messageHistory.length > CONFIG.maxHistory) messageHistory.shift();
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'msg bot typing';
    div.innerHTML = `<img src="SAI.jpg" alt="Satyam AI Logo">Typing...`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function removeTypingIndicator(typingDiv) {
    if (typingDiv) typingDiv.remove();
}

// Webhook Integration
function showImprovementPrompt() {
    if (confirm('Add request to improve the AI? Yes | No')) {
        sendToWebhook();
    }
}

async function sendToWebhook() {
    try {
        await fetch(CONFIG.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: 'Improvement Request:\n' + messageHistory.map(msg => `${msg.type.toUpperCase()}: ${msg.text}`).join('\n')
            })
        });
        addBotMessage('Thanks');
    } catch (error) {
        console.error('Error sending to webhook:', error);
        addBotMessage('Failed to send feedback. Try again later.');
    }
}

// Logic
function fixSpelling(input) {
    const corrections = {
        'hj': 'hi',
        'hii': 'hi',
        'hoi': 'hi',
        'hio': 'hi',
        'satyam': 'Who is satham',
        'hlo': 'hi'
    };
    return corrections[input.toLowerCase()] || input;
}

function processMathQuery(input) {
    try {
        const result = eval(input);
        return [`The answer is: ${result}`];
    } catch (error) {
        return ['Invalid math expression'];
    }
}

// Count matching words between user input and question
function countMatchingWords(userInput, question) {
    const userWords = userInput.toLowerCase().split(/\s+/).map(fixSpelling);
    const questionWords = question.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    for (const userWord of userWords) {
        if (questionWords.includes(userWord)) {
            matchCount++;
        }
    }
    
    return matchCount;
}

// Find best matching response based on word count
function findBestMatch(input) {
    input = input.toLowerCase().trim();
    
    let bestMatches = [];
    let highestMatchCount = 0;
    
    for (const item of jsonData) {
        const matchCount = countMatchingWords(input, item.Question);
        
        if (matchCount > highestMatchCount) {
            highestMatchCount = matchCount;
            bestMatches = [item];
        } else if (matchCount === highestMatchCount && matchCount > 0) {
            bestMatches.push(item);
        }
    }
    
    if (highestMatchCount >= CONFIG.minMatchCount && bestMatches.length > 0) {
        const questionKey = bestMatches[0].Question.toLowerCase();
        
        if (!answerIndexCache[questionKey]) {
            answerIndexCache[questionKey] = 0;
        } else {
            answerIndexCache[questionKey] = (answerIndexCache[questionKey] + 1) % bestMatches.length;
        }
        
        const selectedItem = bestMatches[answerIndexCache[questionKey]];
        return { answer: selectedItem.Answer, matchCount: highestMatchCount };
    }
    
    return null;
}

// Advanced Two-Phase Search with exact matching
function searchMatching(input) {
    const result = findBestMatch(input);
    return result ? [result.answer] : [];
}

function searchContaining(input) {
    input = input.toLowerCase().trim();
    const words = input.split(/\s+/).map(fixSpelling);
    
    // Use the same best match logic for containing search
    const result = findBestMatch(input);
    
    // If no result from best match, try fallback to any containing match
    if (!result) {
        for (const word of words) {
            const match = jsonData.find(item => item.Question.toLowerCase().includes(word));
            if (match) return [match.Answer];
        }
    }
    
    return result ? [result.answer] : [];
}

async function matchResponse(input) {
    input = input.toLowerCase().trim();
    
    // Check for math query first
    if (/[+\-*/]/.test(input)) {
        return { responses: processMathQuery(input), searchType: 'math' };
    }

    // Phase 1: Try exact matching search (best word count match)
    const matchingResults = searchMatching(input);
    
    if (matchingResults.length > 0) {
        return { responses: matchingResults, searchType: 'matching' };
    }

    // Wait 2-3 seconds before trying containing search
    await new Promise(resolve => setTimeout(resolve, CONFIG.searchDelay));

    // Phase 2: Try containing search
    const containingResults = searchContaining(input);
    
    if (containingResults.length > 0) {
        return { responses: containingResults, searchType: 'containing' };
    }

    // No results found
    return {
        responses: null,
        searchType: 'none',
        messages: [
            "Looks like I can't answer this",
            "Kindly Click SUBMIT to help improving this AI",
            '<a href="#" onclick="showImprovementPrompt(); return false;">SUBMIT</a>'
        ],
        delay: 3000
    };
}

async function handleSend() {
    const input = userInput.value.trim();
    if (!input) return;
    
    addUserMessage(input);
    userInput.value = '';

    const typingDiv = addTypingIndicator();
    
    try {
        const result = await matchResponse(input);
        removeTypingIndicator(typingDiv);
        
        if (result.responses) {
            // Found matching or containing results
            result.responses.forEach(msg => addBotMessage(msg));
        } else {
            // No results found - show improvement prompt
            addBotMessage(result.messages[0]); // "Looks like I can't answer this"
            await new Promise(resolve => setTimeout(resolve, result.delay)); // 3-second delay
            addBotMessage(result.messages[1]); // "Kindly Click SUBMIT..."
            await new Promise(resolve => setTimeout(resolve, result.delay)); // Another 3-second delay
            addBotMessage(result.messages[2]); // SUBMIT link
        }
    } catch (error) {
        removeTypingIndicator(typingDiv);
        console.error('Error processing response:', error);
        addBotMessage('Something went wrong. Please try again.');
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleSend();
    });
    fetchJsonData();
});
