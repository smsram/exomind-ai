let fileType = ""; // Variable to store file type
let fileUrl = ""; // Variable to store file URL
let imageUrls = []; // Array to store image URLs

// Handle PDF Upload
document.getElementById('fileInput').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    fileType = "file"; // Set fileType to "file"

    if (!file) {
        alert("Please select a PDF file.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('PDF upload failed');
        }

        const data = await response.json();

        if (data.success) {
            fileUrl = data.link; // Store file URL
            const fileResultDiv = document.getElementById('fileResult');
            const fileLink = document.getElementById('fileLink');
            
            fileLink.href = data.link;
            fileLink.textContent = data.link;

            //fileResultDiv.style.display = 'block';
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// Handle Image Upload
document.getElementById('imageInput').addEventListener('change', async function(event) {
    const image = event.target.files[0];
    fileType = "image"; // Set fileType to "image"

    if (!image) {
        alert("Please select an image.");
        return;
    }

    const formData = new FormData();
    formData.append('file', image);

    try {
        const response = await fetch('https://file.io', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const data = await response.json();

        if (data.success) {
            imageUrls = [data.link]; // Store image URL in an array
            const imageResultDiv = document.getElementById('imageResult');
            const imageLink = document.getElementById('imageLink');
            
            imageLink.href = data.link;
            imageLink.textContent = data.link;

            //imageResultDiv.style.display = 'block';
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// Handle Enter key press for user input
document.getElementById('user-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior (form submission, etc.)
        document.getElementById('send-button').click(); // Trigger click on the Send button
    }
});

// Submit Button Click Handler
document.getElementById('send-button').addEventListener('click', async function () {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const stopButton = document.getElementById('stop-button');
    const userPrompt = userInput.value;

    if (!userPrompt) {
        alert("Please enter a user prompt before submitting.");
        return;
    }

    if (!fileType || (!fileUrl && imageUrls.length === 0)) {
        alert("Please upload a file or image before submitting.");
        return;
    }

    // Disable user input and button
    userInput.disabled = true;
    sendButton.disabled = true;

    // Show the stop button
    stopButton.style.display = 'block';

    let abortController = new AbortController(); // Create an AbortController instance
    let isStopped = false; // Flag to track if the process was stopped
    let stopMessageShown = false; // Flag to track if the "Response is stopped" message has been shown

    // Add event listener to stop the fetch process
    stopButton.addEventListener('click', function stopFetching() {
        if (!isStopped) {
            abortController.abort(); // Abort the fetch request
            isStopped = true; // Set the flag to true
            stopButton.style.display = 'none'; // Hide the stop button

            // Remove typing indicator if it exists
            const typingIndicator = document.querySelector('.typing-indicator');
            if (typingIndicator) typingIndicator.remove();

            // Display "response is stopped" in the chat exactly once
            if (!stopMessageShown) {
                const responseMessageDiv = document.createElement('div');
                responseMessageDiv.classList.add('chat-message', 'response-message');
                responseMessageDiv.textContent = "Response is stopped.";
                chatMessagesDiv.appendChild(responseMessageDiv);
                stopMessageShown = true; // Set flag to true after showing the message
            }

            // Re-enable input and buttons
            userInput.disabled = false;
            sendButton.disabled = false;

            stopButton.removeEventListener('click', stopFetching); // Clean up the event listener
        }
    });

    // Display user prompt in the chat
    const chatMessagesDiv = document.getElementById('chat-messages');
    const userMessageContainer = document.createElement("div");
    userMessageContainer.classList.add("user-prompt-container-main");
    const userMessage = document.createElement("p");
    userMessage.classList.add("user-prompt-container");
    userMessage.classList.add('chat-message', 'user-prompt-container-main');
    userMessage.textContent = userPrompt;
    chatMessagesDiv.appendChild(userMessage);

    // Add typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = ` <span class="dot"></span> <span class="dot"></span> <span class="dot"></span>`;
    chatMessagesDiv.appendChild(typingIndicator);

    // Prepare the payload for the request
    const payload = {
        fileType: fileType,
        userPrompt: userPrompt,
    };

    // Add imageUrls or fileUrl to payload based on fileType
    if (fileType === "image") {
        payload.imageUrls = imageUrls.filter(url => url !== "");
    } else if (fileType === "file") {
        payload.fileUrl = fileUrl.trim();
    }

    try {
        const response = await fetch('https://flask-app2-fileai.onrender.com/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: abortController.signal, // Pass the AbortController signal
        });

        if (isStopped) return; // If stopped, do nothing further

        const result = await response.json();

        // Remove typing indicator
        typingIndicator.remove();

        // Extract the result text
        const resultText = result.result || "No response from server";

        // Process the response with the `processResponse` function
        const processedResponse = processResponse(resultText);

        // Display the response in the chat with a fade-in animation
        const responseMessageDiv = document.createElement('div');
        responseMessageDiv.classList.add('chat-message', 'response-message');
        responseMessageDiv.innerHTML = processedResponse;
        responseMessageDiv.style.opacity = 0; // Start with 0 opacity
        chatMessagesDiv.appendChild(responseMessageDiv);

        // Fade-in animation
        setTimeout(() => {
            responseMessageDiv.style.transition = "opacity 0.5s ease-in-out";
            responseMessageDiv.style.opacity = 1;
        }, 50);

        // Scroll to the bottom of the chat
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

        // Show the scroll to bottom button if needed
        const scrollButton = document.querySelector('.scroll-button');
        const isAtBottom = chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop === chatMessagesDiv.clientHeight;
        if (chatMessagesDiv.scrollHeight > chatMessagesDiv.clientHeight && !isAtBottom) {
            scrollButton.style.display = 'block';
        } else {
            scrollButton.style.display = 'none';
        }

    } catch (error) {
        if (!abortController.signal.aborted) {
            console.error('Error:', error);
        }
    } finally {
        // Re-enable user input and button
        userInput.disabled = false;
        sendButton.disabled = false;
        stopButton.style.display = 'none'; // Hide the stop button
    }
});

// Scroll to bottom when the button is clicked
document.querySelector('.scroll-button').addEventListener('click', function() {
    const chatMessagesDiv = document.getElementById('chat-messages');
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

    // Hide the scroll button once the user has scrolled to the bottom
    document.querySelector('.scroll-button').style.display = 'none';
});

// Automatically hide the scroll button if the user is already at the bottom
const chatMessagesDiv = document.getElementById('chat-messages');
chatMessagesDiv.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-button');
    const isAtBottom = chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop === chatMessagesDiv.clientHeight;

    if (isAtBottom) {
        scrollButton.style.display = 'none';
    } else {
        scrollButton.style.display = 'block';
    }
});

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

/* Enable File inputs when clicking '+' */
const clickDiv = document.querySelector('.bx-link');
const targetDiv = document.querySelector('.show-input-files');

targetDiv.style.display = 'none';
targetDiv.style.position = 'absolute';
targetDiv.style.width = '4rem';

clickDiv.addEventListener('click', function(event) {
    if (targetDiv.style.display === 'none' || targetDiv.style.display === '') {
        targetDiv.style.display = 'flex';
    } else {
        targetDiv.style.display = 'none';
    }
    event.stopPropagation();
});

document.addEventListener('click', function(event) {
    if (targetDiv.style.display === 'flex') {
        targetDiv.style.display = 'none';
    }
});

targetDiv.addEventListener('click', function(event) {
    event.stopPropagation();
});

// Typing Animation
var typed = new Typed('#typed1', {
    strings: ['File To Response'],
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
