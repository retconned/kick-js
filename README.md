# 🟢 KickChat Client

## **What is Kick Chat Client ?**

The KickChat Client is a small, TypeScript-based wrapper for [kick.com](https://kick.com)'s chat system. It uses WebSocket connections to communicate with the chat servers and can automatically create new connections when the current ones reach their maximum capacity.

This wrapper is designed to simplify the process of building chat bots and other chat-related applications for the Kick platform. With its WebSocket-based architecture, it provides a fast and efficient way to communicate with the chat servers and handle incoming messages.

If you're looking to build a chat bot or other chat-based applications, the Kick Chat Wrapper is a great place to start. Its lightweight design and basic handler make it a good choice for for starting developers trying to build chat bots.

# Installation

1. Clone the repo

   ```sh
   git clone https://github.com/retconned/kickchat-client
   ```

2. Change directory to the project folder

   ```sh
   cd kickchat-client
   ```

3. Install dependencies using pnpm ([Get it here](https://pnpm.io/installation))

   ```sh
   pnpm install
   ```

4. Run the app locally

   ```sh
   pnpm dev
   ```

# R&D Notes

- Sending messages, replies, and reactions are now possible via unofficial v2 API endpoints & require x-csrf-token & other headers.

- There is currently no official API documentations from the Kick team, and attempting to access the public endpoint will mostly result in 403 or cloudflare related errors.

# Future Todos

- Add role-based access control to the chat features (e.g. moderation actions, pinning messages, etc.)

- Implement sending messages, replies & reactions.

