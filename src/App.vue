<template>
  <div id="app">
    <AppHeader />
    <AppTabs />
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue'; // Updated import for Header
import AppTabs from './components/AppTabs.vue';     // Updated import for Tabs

export default {
  name: 'App', // Add a name for this component
  components: {
    AppHeader, // Updated component name
    AppTabs,   // Updated component name
  },
};
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  /* Optional: Ensures proper height usage */
}


#app {
  font-family: 'Arial', sans-serif;
  margin: 0px;
  padding: 0px;
}
</style>