<template>
    <div class="rss-wall">
        <iframe id="rss-widget" width="100vw" :height="iframeHeight"
            src="https://rss.app/embed/v1/wall/tK9EXetq9sbcI2oz" frameborder="0" loading="lazy"
            title="RSS Feed Wall"></iframe>
    </div>
</template>

<script>
export default {
    name: "RssWall",
    data() {
        return {
            iframeHeight: "500px", // Default height before calculation
        };
    },
    methods: {
        calculateHeight() {
            const headerHeight = document.querySelector(".header")?.offsetHeight || 0;
            const tabsHeight = document.querySelector(".tabs-row")?.offsetHeight || 0;
            const viewportHeight = window.innerHeight;
            this.iframeHeight = `${viewportHeight - headerHeight - tabsHeight}px`;
        },
    },
    mounted() {
        this.calculateHeight(); // Set height on mount
        window.addEventListener("resize", this.calculateHeight); // Adjust height on window resize
    },
    beforeUnmount() {
        window.removeEventListener("resize", this.calculateHeight); // Clean up listener
    },
};
</script>

<style scoped>
.rss-wall {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
}

iframe {
    width: 100%;
    border: none;
}
</style>