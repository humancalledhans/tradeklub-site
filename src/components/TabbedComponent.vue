<template>
    <div class="tabbed-component">
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'top-news' }"
          @click="activeTab = 'top-news'"
        >
          Top News
        </button>
        <button
          :class="{ active: activeTab === 'live-chat' }"
          @click="activeTab = 'live-chat'"
        >
          Live Chat
        </button>
      </div>
      <div class="tab-content">
        <div v-if="showRssWidget" class="rss-widget-wrapper">
          <iframe 
            ref="rssWidgetIframe" 
            src="https://rss.app/embed/v1/list/tMxZaYsazbSxiR4r" 
            frameborder="0"
            scrolling="no"
            style="width: 100%; height: 100%; box-sizing: border-box;">
          </iframe>
        </div>
        <div v-else-if="activeTab === 'live-chat'" style="height: 100%; width: 100%;">
          <ChatComponent 
            :style="{ width: '100%', height: '100%' }"
            role="viewer" 
            ref="chatComponent" 
          />
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import ChatComponent from "./ChatComponent.vue"; 
  export default {
    name: "TabbedComponent",
    components: {
        ChatComponent,
    },
    props: {
      parentWidth: {
        type: [Number, String],
        required: true,
      },
      parentHeight: {
        type: [Number, String],
        required: true,
      },
    },
    data() {
      return {
        activeTab: "top-news", // Default to Top News tab
        showRssWidget: true,
      };
    },
    watch: {
      activeTab(newTab) {
        // Control the rendering of the RSS widget
        this.showRssWidget = newTab === "top-news";
      },
    },
  };
  </script>
  
  <style scoped>
  .tabbed-component {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    width: 100%;
  }
  
  .tabs {
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid #ccc;
  }
  
  .tabs button {
    flex: 1;
    padding: 10px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    text-align: center;
  }
  
  .tabs button.active {
    font-weight: bold;
    border-bottom: 2px solid #007BFF;
    color: #007BFF;
  }
  
  .tab-content {
    padding: 10px;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }

  .rss-widget-wrapper {
    height: 100%;
    width: 100%;
  }
  </style>