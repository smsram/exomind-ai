const chatBox = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const stopButton = document.getElementById("stop-button");
const scrollButton = document.querySelector(".scroll-button"); // Scroll button element

let typingTimeout;
let abortController;
let isAutoScrolling = true;

// Typing Animation
var typed = new Typed('#typed1', {
    strings: ['Contextual Chat'],
    typeSpeed: 50,
    loop: false
});

// Stop cursor blinking after 3 seconds
setTimeout(() => {
    const typedCursor = document.querySelector('.typed-cursor');
    if (typedCursor) {
        typedCursor.style.display = 'none'; // Hide the blinking cursor
    }
}, 0.1000);

// Show stop button and disable user input during typing
function disableUserInput() {
    userInput.disabled = true;
    stopButton.style.display = "block"; // Show stop button
}

// Hide stop button and re-enable user input
function enableUserInput() {
    userInput.disabled = false;
    stopButton.style.display = "none"; // Hide stop button
}

// Stop button click event listener
stopButton.addEventListener("click", () => {
    if (abortController) {
        abortController.abort(); // Abort the fetch request
    }

    clearTimeout(typingTimeout); // Clear the typing timeout
    enableUserInput(); // Re-enable user input

    // Remove the typing indicator if it exists
    const typingIndicator = document.querySelector(".typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }

    // Update the bot response text to indicate the response was stopped
    const responseText = document.querySelector(".bot-response-container p");
    if (responseText) {
        responseText.innerHTML = "Response stopped";
        responseText.style.color = "#fff";
    }
});

// Handle send button click
sendButton.addEventListener("click", () => {
    if (!userInput.disabled) {
        handleMessageSubmit();
    }
});

// Handle Enter key for submission
userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Prevent newline
        handleMessageSubmit();
    }
});

// Scroll to bottom
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Monitor chat box scrolling
chatBox.addEventListener("scroll", () => {
    const isAtBottom =
        chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 5;

    if (isAtBottom) {
        scrollButton.style.display = "none";
        isAutoScrolling = true;
    } else {
        scrollButton.style.display = "block";
        isAutoScrolling = false;
    }
});

// Scroll button click event
scrollButton.addEventListener("click", () => {
    isAutoScrolling = true;
    scrollToBottom();
});

let conversationHistory = ""; // Store the entire conversation as a single string

// Function to handle message submission
function handleMessageSubmit() {
    const userInputValue = userInput.value.trim();
    if (!userInputValue) return; // Ignore empty messages

    disableUserInput(); // Disable input and show stop button

    // Append user's message to the conversation history
    conversationHistory += `User: ${userInputValue}\n`;

    // Display user's message in the chat box
    const userMessageContainer = document.createElement("div");
    userMessageContainer.classList.add("user-prompt-container-main");
    const userMessage = document.createElement("p");
    userMessage.classList.add("user-prompt-container");
    userMessage.textContent = userInputValue;
    userMessageContainer.appendChild(userMessage);
    chatBox.appendChild(userMessageContainer);

    userInput.value = ""; // Clear input field

    fetchBotResponse();
}

// Function to fetch and display bot response
async function fetchBotResponse() {
    try {
        // Add typing indicator
        const typingIndicator = document.createElement("div");
        typingIndicator.className = "typing-indicator";
        typingIndicator.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;
        chatBox.appendChild(typingIndicator);

        if (isAutoScrolling) scrollToBottom();

        abortController = new AbortController();

        // Send the conversation history as the single input
        const response = await fetch("https://flask-app1-1.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: conversationHistory }),
            signal: abortController.signal,
        });

        const data = await response.json();
        let botResponse = data.response.trim();

        // Remove 'Bot :' if it exists in the response
        botResponse = botResponse.replace(/^Bot :/, '').trim();

        // Process the bot response for formatting
        const formattedResponse = processResponse(botResponse);

        // Append only the message (without 'Bot:') to the conversation history
        conversationHistory += `${botResponse}\n`; // No 'Bot:'

        // Remove typing indicator
        typingIndicator.remove();

        // Display the processed response in the chat box
        const botMessageContainer = document.createElement("div");
        botMessageContainer.classList.add("bot-response-container");
        botMessageContainer.innerHTML = formattedResponse;
        chatBox.appendChild(botMessageContainer);

        // Apply fade-in effect
        botMessageContainer.style.opacity = 0;
        setTimeout(() => {
            botMessageContainer.style.transition = "opacity 1s ease-in-out";
            botMessageContainer.style.opacity = 1;
        }, 10);

        if (isAutoScrolling) scrollToBottom();

        enableUserInput(); // Re-enable input when done
    } catch (error) {
        if (error.name === "AbortError") {
            console.log("Typing stopped by user.");
        } else {
            console.error("Error communicating with Bot:", error);
        }
        enableUserInput();
    }
}


// Utility function to process bot response
function processResponse(response) {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const tableRowRegex = /^\|.*?\|.*?\|.*?\|.*?\|/; // Detects Markdown table rows
    let codeBlocks = [];
    let processedResponse = response.replace(codeBlockRegex, (match, code) => {
        let lines = code.split("\n");
        let firstLine = lines.shift().trim();  // Get and remove the first line
        let remainingCode = lines.join("\n").trim();  // Join the rest of the code

        // Add <br> or \n before the second line if it starts with space
        remainingCode = remainingCode.replace(/^\s+/gm, (match) => {
            return "\n" + match;  // Add a line break before spaces
        });

        // Store the remaining code after replacing < and > with their HTML entities
        codeBlocks.push(remainingCode.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"));

        // Return the placeholder with the first line and code block reference
        return `__FIRST_LINE__${firstLine}__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Process tables with markdown-like syntax
    processedResponse = processedResponse.replace(/^\|([\s\S]+?)\|\n\|[-\s|]+\|\n((?:\|.+?\|\n)+)/gm, (match, headerRow, bodyRows) => {
        const headers = headerRow.split("|").map(header => header.trim()).filter(Boolean);
        const rows = bodyRows.split("\n").filter(line => line.trim() !== "").map(row => {
            const cells = row.split("|").map(cell => cell.trim()).filter(Boolean);
            while (cells.length < headers.length) {
                cells.push(""); // Fill missing columns with empty cells
            }
            return `<tr>${cells.map(cell => `<td class="table-response-cells">${cell}</td>`).join("")}</tr>`;
        }).join("");

        return `
            <table class="table-response">
                <thead class="table-response-head">
                    <tr class="table-response-rows">
                        ${headers.map(header => `<th>${header}</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    });

    // Apply other formatting (bold, italic, inline code)
    processedResponse = processedResponse
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
        .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
        .replace(/`([^`]+)`/g, '<code class="code-part">$1</code>') // Inline code
        .replace(/\n/g, "<br>"); // New lines

    const containerDiv = document.createElement("div");
    containerDiv.innerHTML = processedResponse;

    // Replace placeholders for code blocks
    containerDiv.innerHTML = containerDiv.innerHTML.replace(/__FIRST_LINE__(.*?)__CODE_BLOCK_(\d+)__/g, (match, firstLine, index) => {
        let codeBlock = codeBlocks[index];
        return `
            <div class="main-code-container">
                <div class="code-lang-and-copy-btn">
                    <p class="code-lang">${firstLine}</p>
                    <button class="copy-code-container" onclick="copyCodeToClipboard(this)">
                        Copy Code
                    </button>
                </div>
                <div class="code-container">
                    <pre style="margin: 0; background-color: #272822; color: #f8f8f2; padding: 10px; border-radius: 5px;">
                        <br>${codeBlock} <!-- Add <br> to make the first line start on a new line -->
                    </pre>
                </div>
            </div>
        `;
    });

    return containerDiv.outerHTML;
}


function copyCodeToClipboard(button) {
    try {
        // Find the closest <pre> element containing the code block
        const preElement = button.closest('.main-code-container').querySelector('pre');
        let codeContent = preElement.innerText.trim(); // Use innerText for plain text (preserves formatting)

        // Create a temporary textarea element to copy the content
        const tempTextArea = document.createElement("textarea");
        tempTextArea.style.position = "fixed";
        tempTextArea.style.opacity = "0";
        tempTextArea.value = codeContent;

        document.body.appendChild(tempTextArea);
        tempTextArea.select();

        // Use the modern Clipboard API
        navigator.clipboard.writeText(codeContent)
            .then(() => {
                const originalText = button.textContent;
                button.textContent = "Copied!";
                button.disabled = true;

                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 2000);
            })
            .catch(err => {
                console.error("Failed to copy: ", err);
                alert("Failed to copy content. Please try again.");
            })
            .finally(() => {
                document.body.removeChild(tempTextArea);
            });
    } catch (error) {
        console.error("Error copying to clipboard:", error);
        alert("An error occurred while copying. Please try again.");
    }
}
