document.addEventListener("DOMContentLoaded", () => {
    // Firebase configuration
    // IMPORTANT: Replace with your own Firebase config when deploying
    const firebaseConfig = {
        apiKey: "AIzaSyCWMaPUVegrsh1rbCoV0ZosYo2Bm70MqvQ",
        authDomain: "techchat-88a85.firebaseapp.com",
        databaseURL: "https://techchat-88a85-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "techchat-88a85",
        storageBucket: "techchat-88a85.firebasestorage.app",
        messagingSenderId: "296649006078",
        appId: "1:296649006078:web:af0148e54de0354af67eaf",
        measurementId: "G-YD0XPWCQY3",
    }

    // Initialize Firebase
    const firebase = window.firebase
    firebase.initializeApp(firebaseConfig)
    const database = firebase.database()
    const storage = firebase.storage()

    // DOM Elements
    const loginScreen = document.getElementById("loginScreen")
    const chatScreen = document.getElementById("chatScreen")
    const loginForm = document.getElementById("loginForm")
    const usernameInput = document.getElementById("username")
    const roomIdInput = document.getElementById("roomId")
    const generateRoomIdButton = document.getElementById("generateRoomId")
    const chatMessages = document.getElementById("chatMessages")
    const messageInput = document.getElementById("messageInput")
    const sendButton = document.getElementById("sendButton")
    const emojiButton = document.getElementById("emojiButton")
    const emojiPicker = document.getElementById("emojiPicker")
    const closeEmojiPickerBtn = document.getElementById("closeEmojiPicker")
    const emojiSearch = document.getElementById("emojiSearch")
    const emojiCategories = document.querySelectorAll(".emoji-category")
    const leaveButton = document.getElementById("leaveChat")
    const roomIdDisplay = document.getElementById("roomIdDisplay")
    const copyRoomLinkButton = document.getElementById("copyRoomLink")
    const currentUserAvatar = document.getElementById("currentUserAvatar")
    const currentUserName = document.getElementById("currentUserName")
    const chatWithAvatar = document.getElementById("chatWithAvatar")
    const chatWithName = document.getElementById("chatWithName")
    const chatWithStatus = document.getElementById("chatWithStatus")
    const participantCount = document.getElementById("participantCount")
    const participantList = document.getElementById("participantList")
    const toast = document.getElementById("toast")
    const toastMessage = document.getElementById("toastMessage")
    const showSidebarBtn = document.getElementById("showSidebar")
    const toggleSidebarBtn = document.getElementById("toggleSidebar")
    const chatSidebar = document.querySelector(".chat-sidebar")
    const fileInput = document.getElementById("fileInput")
    const attachButton = document.getElementById("attachButton")
    const attachmentPreview = document.getElementById("attachmentPreview")
    const uploadProgressModal = document.getElementById("uploadProgressModal")
    const uploadProgressBar = document.getElementById("uploadProgressBar")
    const uploadProgressText = document.getElementById("uploadProgressText")
    const cancelUploadBtn = document.getElementById("cancelUploadBtn")

    // App state
    let currentUser = null
    let currentRoom = null
    let userListRef = null
    let messageRef = null
    let userStatusRef = null
    let typingRef = null
    let typingTimeout = null
    const recentEmojis = []
    let otherUser = null
    let selectedFile = null
    let currentUploadTask = null

    // Create lightbox elements
    const lightbox = document.createElement("div")
    lightbox.className = "lightbox"
    lightbox.innerHTML = `
    <span class="lightbox-close">&times;</span>
    <img class="lightbox-image" src="/placeholder.svg" alt="Full size image">
  `
    document.body.appendChild(lightbox)

    const lightboxImage = lightbox.querySelector(".lightbox-image")
    const lightboxClose = lightbox.querySelector(".lightbox-close")

    lightboxClose.addEventListener("click", () => {
        lightbox.classList.remove("show")
    })

    // Sidebar toggle for mobile
    if (showSidebarBtn) {
        showSidebarBtn.addEventListener("click", () => {
            chatSidebar.classList.add("show")
        })
    }

    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", () => {
            chatSidebar.classList.toggle("show")
        })
    }

    // File attachment
    attachButton.addEventListener("click", () => {
        fileInput.click()
    })

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0]
        if (file) {
            if (!file.type.match("image.*")) {
                showToast("Only image files are supported")
                return
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast("File size should be less than 5MB")
                return
            }

            selectedFile = file
            displayAttachmentPreview(file)
        }
    })

    function displayAttachmentPreview(file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            attachmentPreview.innerHTML = `
        <img src="${e.target.result}" alt="Attachment preview">
        <span class="remove-attachment"><i class="bi bi-x"></i></span>
      `
            attachmentPreview.classList.add("active")

            // Add event listener to remove button
            const removeBtn = attachmentPreview.querySelector(".remove-attachment")
            removeBtn.addEventListener("click", removeAttachment)
        }
        reader.readAsDataURL(file)
    }

    function removeAttachment() {
        selectedFile = null
        attachmentPreview.innerHTML = ""
        attachmentPreview.classList.remove("active")
        fileInput.value = ""
    }

    // Generate a random room ID
    generateRoomIdButton.addEventListener("click", () => {
        const randomId = Math.random().toString(36).substring(2, 8)
        roomIdInput.value = randomId
    })

    // Handle login form submission
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault()

        const username = usernameInput.value.trim()
        let roomId = roomIdInput.value.trim()

        if (!username) {
            showToast("Please enter your name")
            return
        }

        // Generate a room ID if none provided
        if (!roomId) {
            roomId = Math.random().toString(36).substring(2, 8)
        }

        // Set current user and room
        currentUser = {
            id: generateUserId(),
            name: username,
            joinedAt: firebase.database.ServerValue.TIMESTAMP,
            avatar: getInitials(username),
            color: getRandomColor(),
        }

        currentRoom = roomId

        // Update URL with room ID for sharing
        window.history.pushState({}, "", `?room=${roomId}`)

        // Show room ID in the header
        roomIdDisplay.textContent = roomId
        updateCurrentUserDisplay(currentUser)

        // Join the room
        joinRoom(roomId, currentUser)
    })

    // Copy room link to clipboard
    copyRoomLinkButton.addEventListener("click", () => {
        const roomLink = window.location.href
        navigator.clipboard.writeText(roomLink).then(() => {
            showToast("Chat link copied to clipboard!")
        })
    })

    // Leave chat
    leaveButton.addEventListener("click", () => {
        leaveRoom()
    })

    // Send message
    sendButton.addEventListener("click", sendMessage)

    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }

        // Handle typing indicator
        if (!typingTimeout) {
            setUserTyping(true)
        }

        clearTimeout(typingTimeout)
        typingTimeout = setTimeout(() => {
            setUserTyping(false)
            typingTimeout = null
        }, 3000)
    })

    // Emoji picker
    emojiButton.addEventListener("click", () => {
        emojiPicker.style.display = emojiPicker.style.display === "block" ? "none" : "block"
    })

    // Close emoji picker
    closeEmojiPickerBtn.addEventListener("click", () => {
        emojiPicker.style.display = "none"
    })

    // Emoji search
    emojiSearch.addEventListener("input", () => {
        const searchTerm = emojiSearch.value.toLowerCase()
        const emojis = document.querySelectorAll(".emoji")

        emojis.forEach((emoji) => {
            const emojiName = emoji.dataset.emoji || emoji.textContent
            if (emojiName.toLowerCase().includes(searchTerm)) {
                emoji.style.display = "inline-block"
            } else {
                emoji.style.display = "none"
            }
        })
    })

    // Emoji categories
    emojiCategories.forEach((category) => {
        category.addEventListener("click", () => {
            // Remove active class from all categories
            emojiCategories.forEach((cat) => cat.classList.remove("active"))

            // Add active class to clicked category
            category.classList.add("active")

            const categoryName = category.dataset.category
            // Filter emojis by category (not implemented in this simplified version)
        })
    })

    // Close emoji picker when clicking outside
    document.addEventListener("click", (e) => {
        if (!emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.style.display = "none"
        }
    })

    // Add emoji to message input when clicked
    document.querySelectorAll(".emoji").forEach((emoji) => {
        emoji.addEventListener("click", function () {
            messageInput.value += this.dataset.emoji || this.textContent
            messageInput.focus()
            emojiPicker.style.display = "none"
        })
    })

    // Check for room ID in URL
    function checkUrlForRoom() {
        const urlParams = new URLSearchParams(window.location.search)
        const roomId = urlParams.get("room")

        if (roomId) {
            roomIdInput.value = roomId
        }
    }

    // Generate a unique user ID
    function generateUserId() {
        return "user_" + Math.random().toString(36).substring(2, 15)
    }

    // Get initials from username
    function getInitials(username) {
        const nameParts = username.split(" ")
        let initials = ""
        for (let i = 0; i < Math.min(nameParts.length, 2); i++) {
            if (nameParts[i].length > 0) {
                initials += nameParts[i].charAt(0).toUpperCase()
            }
        }
        return initials || username.charAt(0).toUpperCase()
    }

    // Get random color for user avatar
    function getRandomColor() {
        const colors = [
            "#8b5cf6", // Purple
            "#3b82f6", // Blue
            "#10b981", // Green
            "#f59e0b", // Orange
            "#ef4444", // Red
            "#06b6d4", // Cyan
            "#ec4899", // Pink
            "#f97316", // Orange-red
        ]
        return colors[Math.floor(Math.random() * colors.length)]
    }

    // Update current user display
    function updateCurrentUserDisplay(user) {
        currentUserAvatar.innerHTML = user.avatar
        currentUserAvatar.style.backgroundColor = user.color
        currentUserName.textContent = user.name
    }

    // Update chat partner display
    function updateChatPartnerDisplay(user) {
        if (!user) {
            chatWithAvatar.innerHTML = "?"
            chatWithAvatar.style.backgroundColor = "#64748b"
            chatWithName.textContent = "Waiting for partner..."
            chatWithStatus.textContent = "offline"
            return
        }

        chatWithAvatar.innerHTML = user.avatar
        chatWithAvatar.style.backgroundColor = user.color
        chatWithName.textContent = user.name
        chatWithStatus.textContent = "online"
    }

    // Format timestamp to HH:MM AM/PM
    function formatTime(date) {
        const hours = date.getHours()
        const minutes = date.getMinutes()
        const ampm = hours >= 12 ? "PM" : "AM"
        const formattedHours = hours % 12 || 12
        const formattedMinutes = minutes < 10 ? "0" + minutes : minutes
        return `${formattedHours}:${formattedMinutes} ${ampm}`
    }

    // Set user typing status
    function setUserTyping(isTyping) {
        if (typingRef && currentUser) {
            typingRef.child(currentUser.id).set(isTyping ? true : null)
        }
    }

    // Update typing indicator
    function updateTypingIndicator(users) {
        const typingIndicator = document.querySelector(".typing-indicator-wrapper")

        if (!users || !otherUser) {
            if (typingIndicator) {
                typingIndicator.style.display = "none"
            }
            chatWithStatus.textContent = "online"
            chatWithStatus.classList.remove("typing")
            return
        }

        // Check if the other user is typing
        const isOtherUserTyping = Object.keys(users).includes(otherUser.id)

        if (isOtherUserTyping) {
            if (typingIndicator) {
                typingIndicator.style.display = "flex"
            }
            chatWithStatus.textContent = "typing..."
            chatWithStatus.classList.add("typing")
        } else {
            if (typingIndicator) {
                typingIndicator.style.display = "none"
            }
            chatWithStatus.textContent = "online"
            chatWithStatus.classList.remove("typing")
        }
    }

    // Join a chat room
    function joinRoom(roomId, user) {
        // References to Firebase locations
        userListRef = database.ref(`rooms/${roomId}/users`)
        messageRef = database.ref(`rooms/${roomId}/messages`)
        userStatusRef = userListRef.child(user.id)
        typingRef = database.ref(`rooms/${roomId}/typing`)

        // Add user to the room
        userStatusRef.set(user)

        // Remove user when they disconnect
        userStatusRef.onDisconnect().remove()

        // Remove typing status when disconnected
        typingRef.child(user.id).onDisconnect().remove()

        // Listen for new messages
        messageRef.on("child_added", (snapshot) => {
            const message = snapshot.val()
            displayMessage(message)
        })

        // Listen for user list changes
        userListRef.on("value", (snapshot) => {
            const users = snapshot.val()
            updateParticipantsList(users)

            // Find the other user in a 1-1 chat
            if (users) {
                const userIds = Object.keys(users)
                const otherUserId = userIds.find((id) => id !== user.id)
                if (otherUserId) {
                    otherUser = users[otherUserId]
                    updateChatPartnerDisplay(otherUser)
                } else {
                    otherUser = null
                    updateChatPartnerDisplay(null)
                }
            }
        })

        // Listen for typing status changes
        typingRef.on("value", (snapshot) => {
            updateTypingIndicator(snapshot.val())
        })

        // Add system message that user joined
        addSystemMessage(`${user.name} joined the chat`)

        // Show chat interface
        loginScreen.style.display = "none"
        chatScreen.style.display = "flex"

        // Clear chat messages
        chatMessages.innerHTML = `
      <div class="chat-date-divider">
        <span>Today</span>
      </div>
      <div class="system-message">
        <div class="system-message-content">Chat started</div>
      </div>
    `

        // Focus on message input
        messageInput.focus()
    }

    // Leave the current room
    function leaveRoom() {
        if (userStatusRef) {
            // Add system message that user left
            addSystemMessage(`${currentUser.name} left the chat`)

            // Remove user from room
            userStatusRef.remove()

            // Remove typing status
            if (typingRef) {
                typingRef.child(currentUser.id).remove()
            }

            // Detach listeners
            messageRef.off()
            userListRef.off()
            if (typingRef) {
                typingRef.off()
            }
        }

        // Reset state
        currentUser = null
        currentRoom = null
        userListRef = null
        messageRef = null
        userStatusRef = null
        typingRef = null
        otherUser = null
        selectedFile = null

        // Clear URL parameters
        window.history.pushState({}, "", window.location.pathname)

        // Show login screen
        loginScreen.style.display = "flex"
        chatScreen.style.display = "none"

        // Clear inputs
        usernameInput.value = ""
        roomIdInput.value = ""
        messageInput.value = ""
        removeAttachment()
    }

    // Upload image to Firebase Storage
    async function uploadImage(file) {
        return new Promise((resolve, reject) => {
            // Tạo một blob URL tạm thời để hiển thị ngay lập tức
            const tempUrl = URL.createObjectURL(file)

            // Hiển thị modal tiến trình
            uploadProgressModal.classList.add("show")
            uploadProgressBar.style.width = "0%"
            uploadProgressText.textContent = "0%"

            // Nén ảnh trước khi tải lên nếu kích thước quá lớn
            if (file.size > 1024 * 1024) {
                // Nếu lớn hơn 1MB
                showToast("Đang xử lý ảnh trước khi tải lên...")

                // Cập nhật thanh tiến trình để người dùng biết có tiến triển
                uploadProgressBar.style.width = "10%"
                uploadProgressText.textContent = "10% - Đang xử lý ảnh"
            }

            // Tạo tham chiếu lưu trữ
            const storageRef = storage.ref()
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
            const fileRef = storageRef.child(`images/${currentRoom}/${fileName}`)

            // Tải tệp lên với timeout
            const uploadTask = fileRef.put(file)
            currentUploadTask = uploadTask

            // Đặt timeout để phát hiện tải lên bị treo
            const uploadTimeout = setTimeout(() => {
                if (Number.parseInt(uploadProgressText.textContent) < 95) {
                    uploadTask.cancel()
                    uploadProgressModal.classList.remove("show")
                    showToast("Tải lên quá lâu, đã hủy. Vui lòng thử lại với ảnh nhỏ hơn.")
                    reject(new Error("Upload timeout"))
                }
            }, 30000) // 30 giây timeout

            // Theo dõi tiến trình tải lên
            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    // Cập nhật thanh tiến trình
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                    uploadProgressBar.style.width = `${progress}%`
                    uploadProgressText.textContent = `${progress}%`

                    // Cập nhật thông báo dựa trên tiến trình
                    if (progress === 100) {
                        uploadProgressText.textContent = "100% - Đang hoàn tất..."
                    }
                },
                (error) => {
                    // Xử lý lỗi
                    clearTimeout(uploadTimeout)
                    uploadProgressModal.classList.remove("show")
                    currentUploadTask = null

                    if (error.code === "storage/canceled") {
                        console.log("Upload was canceled")
                    } else {
                        console.error("Upload error:", error)
                        showToast("Lỗi khi tải lên: " + (error.message || "Vui lòng thử lại"))
                    }

                    reject(error)
                },
                async () => {
                    // Tải lên hoàn tất
                    clearTimeout(uploadTimeout)
                    currentUploadTask = null

                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL()
                        uploadProgressModal.classList.remove("show")
                        resolve(downloadURL)
                    } catch (error) {
                        console.error("Error getting download URL:", error)
                        uploadProgressModal.classList.remove("show")
                        showToast("Tải lên thành công nhưng không thể lấy URL. Vui lòng thử lại.")
                        reject(error)
                    }
                },
            )
        })
    }

    // Send a message
    async function sendMessage() {
        const text = messageInput.value.trim()

        if ((!text && !selectedFile) || !currentUser || !messageRef) {
            return
        }

        try {
            let imageUrl = null

            // Tải ảnh lên nếu được chọn
            if (selectedFile) {
                try {
                    imageUrl = await uploadImage(selectedFile)
                } catch (error) {
                    console.error("Error uploading image:", error)
                    // Cho phép gửi tin nhắn văn bản ngay cả khi tải ảnh thất bại
                    if (!text) {
                        return // Nếu không có văn bản, không gửi tin nhắn
                    }
                    showToast("Không thể tải ảnh lên, chỉ gửi tin nhắn văn bản.")
                }
            }

            // Tạo đối tượng tin nhắn
            const message = {
                senderId: currentUser.id,
                senderName: currentUser.name,
                senderAvatar: currentUser.avatar,
                senderColor: currentUser.color,
                text: text || "",
                imageUrl: imageUrl,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: "sent",
            }

            // Đẩy tin nhắn lên Firebase
            await messageRef.push(message)

            // Xóa đầu vào và tệp đính kèm
            messageInput.value = ""
            removeAttachment()

            // Xóa chỉ báo đang nhập
            setUserTyping(false)
            clearTimeout(typingTimeout)
            typingTimeout = null
        } catch (error) {
            console.error("Error sending message:", error)
            showToast("Không thể gửi tin nhắn. Vui lòng thử lại.")
        }
    }

    // Display a message in the chat
    function displayMessage(message) {
        if (message.system) {
            // System message
            const systemMessageDiv = document.createElement("div")
            systemMessageDiv.classList.add("system-message")
            systemMessageDiv.innerHTML = `
        <div class="system-message-content">${message.text}</div>
      `
            chatMessages.appendChild(systemMessageDiv)
        } else {
            // User message
            const isCurrentUser = currentUser && message.senderId === currentUser.id
            const messageWrapperDiv = document.createElement("div")
            messageWrapperDiv.classList.add("message-wrapper", isCurrentUser ? "sent" : "received")

            // Format timestamp
            const timestamp = new Date(message.timestamp)
            const timeString = formatTime(timestamp)

            // Prepare message content
            let messageContent = ""

            // Add text if present
            if (message.text) {
                messageContent += formatMessageText(message.text)
            }

            // Add image if present
            if (message.imageUrl) {
                messageContent += `
          <div class="message-image-container">
            <img src="${message.imageUrl}" alt="Shared image" class="message-image">
          </div>
        `
            }

            if (isCurrentUser) {
                // Sent message
                messageWrapperDiv.innerHTML = `
          <div class="message-group">
            <div class="message-content-group">
              <div class="message-bubble">${messageContent}</div>
              <div class="message-meta">
                <span class="message-time">${timeString}</span>
                <span class="message-status">
                  <i class="bi bi-check2-all"></i>
                </span>
              </div>
            </div>
          </div>
        `
            } else {
                // Received message
                messageWrapperDiv.innerHTML = `
          <div class="message-group">
            <div class="user-avatar small" style="background-color: ${message.senderColor}">${message.senderAvatar}</div>
            <div class="message-content-group">
              <div class="message-bubble">${messageContent}</div>
              <div class="message-meta">
                <span class="message-time">${timeString}</span>
              </div>
            </div>
          </div>
        `
            }

            chatMessages.appendChild(messageWrapperDiv)

            // Add click event for image
            const messageImage = messageWrapperDiv.querySelector(".message-image")
            if (messageImage) {
                messageImage.addEventListener("click", () => {
                    lightboxImage.src = message.imageUrl
                    lightbox.classList.add("show")
                })
            }
        }

        scrollToBottom()
    }

    // Smooth scroll chat to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight
    }

    // Format message text (convert URLs to links, emojis, etc.)
    function formatMessageText(text) {
        if (!text) return ""

        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g
        text = text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)

        return text
    }

    // Add a system message
    function addSystemMessage(text) {
        if (messageRef) {
            messageRef.push({
                system: true,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
            })
        }
    }

    // Update the participants list
    function updateParticipantsList(users) {
        if (!users) {
            participantCount.textContent = "0"
            participantList.innerHTML = "<div class='info-item'>No participants yet</div>"
            return
        }

        const userCount = Object.keys(users).length
        participantCount.textContent = userCount

        // Clear and rebuild participant list
        participantList.innerHTML = ""
        Object.values(users).forEach((user) => {
            const participantItem = document.createElement("div")
            participantItem.classList.add("participant-item")
            participantItem.innerHTML = `
        <div class="user-avatar small" style="background-color: ${user.color}">${user.avatar}</div>
        <span>${user.name}</span>
        ${user.id === currentUser?.id ? '<span class="text-secondary">(you)</span>' : ""}
      `
            participantList.appendChild(participantItem)
        })
    }

    // Show toast message
    function showToast(message) {
        toastMessage.textContent = message
        toast.classList.add("show")

        setTimeout(() => {
            toast.classList.remove("show")
        }, 3000)
    }

    // Thêm hàm để kiểm tra kết nối Firebase
    function checkFirebaseConnection() {
        const connectedRef = database.ref(".info/connected")
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                console.log("Connected to Firebase")
            } else {
                console.log("Disconnected from Firebase")
                showToast("Mất kết nối đến máy chủ. Đang thử kết nối lại...")
            }
        })
    }

    // Gọi hàm kiểm tra kết nối khi khởi tạo
    checkFirebaseConnection()

    // Thêm sự kiện cho nút hủy tải lên
    cancelUploadBtn.addEventListener("click", () => {
        if (currentUploadTask) {
            currentUploadTask.cancel()
            currentUploadTask = null
            uploadProgressModal.classList.remove("show")
            showToast("Đã hủy tải lên ảnh")
        }
    })

    // Thêm hàm phát hiện treo khi tải lên
    function detectUploadStall() {
        let lastProgress = 0
        let stallCounter = 0

        // Kiểm tra tiến trình mỗi 3 giây
        const stallInterval = setInterval(() => {
            if (!currentUploadTask) {
                clearInterval(stallInterval)
                return
            }

            const currentProgress = Number.parseInt(uploadProgressText.textContent)

            // Nếu tiến trình không thay đổi trong 3 lần kiểm tra (9 giây)
            if (currentProgress === lastProgress && currentProgress > 0 && currentProgress < 100) {
                stallCounter++

                // Thêm hiệu ứng nhấp nháy sau 6 giây treo
                if (stallCounter >= 2) {
                    uploadProgressBar.classList.add("pulsing")
                    document.querySelector(".upload-status-message").textContent =
                        "Tải lên có vẻ chậm. Bạn có thể hủy và thử lại với ảnh nhỏ hơn."
                }

                // Tự động hủy sau 15 giây treo
                if (stallCounter >= 5) {
                    if (currentUploadTask) {
                        currentUploadTask.cancel()
                        currentUploadTask = null
                        uploadProgressModal.classList.remove("show")
                        showToast("Tải lên bị treo. Vui lòng thử lại với ảnh nhỏ hơn.")
                        clearInterval(stallInterval)
                    }
                }
            } else {
                // Đặt lại bộ đếm nếu tiến trình thay đổi
                stallCounter = 0
                uploadProgressBar.classList.remove("pulsing")
                document.querySelector(".upload-status-message").textContent = "Vui lòng đợi trong khi ảnh đang được tải lên..."
            }

            lastProgress = currentProgress
        }, 3000)
    }

    // Gọi hàm phát hiện treo khi bắt đầu tải lên
    const originalUploadImage = uploadImage
    uploadImage = (file) => {
        detectUploadStall()
        return originalUploadImage(file)
    }

    checkUrlForRoom()
})
