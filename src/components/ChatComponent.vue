<template>
    <div class="chat-wrapper">
      <!-- Name Prompt -->
      <div v-if="!username">
        <input 
          v-model="tempName" 
          placeholder="Enter your name to start chatting" 
          @keyup.enter="setUsername"
        />
        <button @click="setUsername">Start Chatting</button>
      </div>
  
      <!-- Chat Window -->
      <div v-else>
        <div class="chat-window">
          <div v-for="(msg, index) in messages" :key="index" class="message">
            <strong>{{ msg.name }}:</strong> {{ msg.text }}
          </div>
        </div>
  
        <!-- Message Input -->
        <div class="input-wrapper">
          <input 
            v-model="newMessage" 
            placeholder="Type your message here..." 
            @keyup.enter="sendMessage"
          />
          <button @click="sendMessage">Send</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { initializeApp } from "firebase/app";
  import { getDatabase, ref, push, onValue } from "firebase/database";

  const firebaseConfig = {
    apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
    authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VUE_APP_FIREBASE_APP_ID,
  };
  
  // Initialize Firebase
  const firebaseApp = initializeApp(firebaseConfig);
  const database = getDatabase(firebaseApp);
  
  export default {
    data() {
      return {
        username: null,
        tempName: "",
        newMessage: "",
        messages: [],
      };
    },
    methods: {
      setUsername() {
        if (this.tempName.trim()) {
          this.username = this.tempName.trim();
          this.fetchMessages();
        }
      },
      fetchMessages() {
        const messagesRef = ref(database, "messages");
        onValue(messagesRef, (snapshot) => {
          const data = snapshot.val();
          this.messages = data ? Object.values(data) : [];
        });
      },
      sendMessage() {
        if (this.newMessage.trim()) {
          const messagesRef = ref(database, "messages");
          push(messagesRef, {
            name: this.username,
            text: this.newMessage.trim(),
            timestamp: Date.now(),
          });
          this.newMessage = ""; // Clear the input
        }
      },
    },
  };
  </script>
  
  <style>
  /* Basic styles */
  .chat-wrapper {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    border: 1px solid #ccc;
    padding: 10px;
  }
  .chat-window {
    height: 300px;
    overflow-y: auto;
    border: 1px solid #ccc;
    margin-bottom: 10px;
  }
  .input-wrapper {
    display: flex;
  }
  input {
    flex: 1;
    padding: 5px;
  }
  button {
    padding: 5px 10px;
  }
  </style>