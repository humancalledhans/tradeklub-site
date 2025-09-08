<template>
  <div id="app">
    <!-- Not Available Mode -->
    <div v-if="isNotAvailable" class="unavailable-container">
      <div class="unavailable-content">
        <h1>❌ Not Available</h1>
        <p>This service is currently not available.</p>
        <p>Thank you for your understanding.</p>
      </div>
    </div>

    <!-- Normal App -->
    <div v-else>
      <AppHeader />
      <AppTabs />
    </div>
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue';
import AppTabs from './components/AppTabs.vue';

export default {
  name: 'App',
  components: {
    AppHeader,
    AppTabs,
  },
  data() {
    return {
      isNotAvailable: true, // Set to true to show "Not Available" page
    };
  },
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#app {
  font-family: 'Arial', sans-serif;
  margin: 0px;
  padding: 0px;
}

/* Not Available Mode Styles */
.unavailable-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

.unavailable-content {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.unavailable-content h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.unavailable-content p {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
</style>