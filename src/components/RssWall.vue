<template>
    <!-- <div class="rss-wall">
        <div v-if="!iframeLoaded" class="loading-placeholder">
            <div v-for="n in 5" :key="n" class="loading-box"></div>
        </div>
        <iframe v-else id="rss-widget" width="100vw" :height="iframeHeight"
            src="https://rss.app/embed/v1/wall/tK9EXetq9sbcI2oz" frameborder="0" loading="lazy"
            title="RSS Feed Wall"></iframe>
    </div> -->
    <div class="rss-wall">
        <!-- Loading Animation -->
        <div v-show="!fadeOutComplete" :class="{ 'fade-out': iframeLoaded }" class="loading-placeholder">
            <div v-for="(height, index) in loadingBoxHeights" :key="index" class="loading-box"
                :style="{ height: height + 'px' }"></div>
        </div>
        <!-- Iframe -->
        <iframe id="rss-widget" :class="{ 'fade-in': iframeLoaded }" width="100vw" :height="iframeHeight"
            src="https://rss.app/embed/v1/wall/tK9EXetq9sbcI2oz" frameborder="0" loading="lazy" @load="onIframeLoad"
            title="RSS Feed Wall"></iframe>
    </div>
</template>

<script>
export default {
    name: "RssWall",
    data() {
        return {
            iframeHeight: "500px", // Default iframe height
            iframeLoaded: false, // Whether the iframe is loaded
            fadeOutComplete: false, // Tracks when fade-out animation is done
            loadingBoxHeights: [], // Heights for the loading boxes
            iframeLoadCheckInterval: null, // Fallback interval
        };
    },
    methods: {
        calculateHeight() {
            const headerHeight = document.querySelector(".header")?.offsetHeight || 0;
            const tabsHeight = document.querySelector(".tabs-row")?.offsetHeight || 0;
            const viewportHeight = window.innerHeight;
            this.iframeHeight = `${viewportHeight - headerHeight - tabsHeight}px`;
        },
        generateBoxHeights() {
            const deviceWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minBoxWidth = 300; // Matches min-width in grid-template-columns
            const columns = Math.floor(deviceWidth / minBoxWidth); // Number of columns
            const rowsPerColumn = 3; // Number of boxes per column (adjust as needed)

            this.loadingBoxHeights = Array.from({ length: columns * rowsPerColumn }, () =>
                Math.floor(Math.random() * (viewportHeight / rowsPerColumn) * 0.7 + 100)
            );
        },
        onIframeLoad() {
            console.log("Iframe load event triggered.");
            this.iframeLoaded = true; // Start the fade-out animation

            // Wait for the fade-out animation to complete before fully hiding the loading placeholder
            setTimeout(() => {
                this.fadeOutComplete = true; // Hides the loading placeholder
            }, 1000); // Match the CSS fade-out duration (1 second)
        },
        fallbackIframeCheck() {
            const iframe = document.getElementById("rss-widget");
            if (iframe?.contentWindow) {
                try {
                    const readyState = iframe.contentWindow.document.readyState;
                    console.log(`Iframe readyState: ${readyState}`);
                    if (readyState === "complete") {
                        this.onIframeLoad(); // Call onIframeLoad for consistent behavior
                        clearInterval(this.iframeLoadCheckInterval);
                    }
                } catch (error) {
                    console.error("Cross-origin error while checking iframe state:", error);
                }
            }
        },
        debounceResize(callback, delay = 300) {
            let timeout;
            return () => {
                clearTimeout(timeout);
                timeout = setTimeout(callback, delay);
            };
        },
    },
    mounted() {
        this.calculateHeight(); // Set height on mount
        this.generateBoxHeights();

        // Start fallback interval for cross-origin check
        this.iframeLoadCheckInterval = setInterval(this.fallbackIframeCheck, 500);

        // Timeout fallback
        setTimeout(() => {
            if (!this.iframeLoaded) {
                console.log("Iframe load timeout. Removing placeholder.");
                this.onIframeLoad(); // Trigger fade-out and cleanup
            }
        }, 5000); // 5 seconds timeout

        // Handle window resize with debouncing
        const debouncedResize = this.debounceResize(() => {
            this.calculateHeight();
            this.generateBoxHeights();
        });
        window.addEventListener("resize", debouncedResize);
    },
    beforeUnmount() {
        window.removeEventListener("resize", this.calculateHeight); // Clean up listeners
        clearInterval(this.iframeLoadCheckInterval); // Clear fallback interval
        console.log("Component unmounted, resources cleaned.");
    },
};
</script>

<style scoped>
.rss-wall {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    /* Ensure proper stacking of loading boxes and iframe */
}

iframe {
    width: 100%;
    border: none;
    opacity: 0;
    /* Start fully transparent */
    transition: opacity 1s ease-in-out;
    /* Smooth fade-in */
}

iframe.fade-in {
    opacity: 1;
    /* Fully visible when iframeLoaded is true */
}

/* Loading Animation Placeholder */
.loading-placeholder {
    column-count: 3;
    column-gap: 20px;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    opacity: 1;
    /* Default state: fully visible */
    transition: opacity 1s ease-in-out;
    /* Smooth fade-out */
    position: absolute;
    /* Position over the iframe */
    top: 0;
    left: 0;
    right: 0;
    z-index: 1;
    /* Ensure it sits above the iframe */
}

.loading-placeholder.fade-out {
    opacity: 0;
    /* Fades out when iframeLoaded is true */
    pointer-events: none;
    /* Prevent interactions during fade-out */
}

.loading-box {
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    margin-bottom: 10px;
    display: inline-block;
    width: 100%;
}

/* Media Query for Mobile */
@media (max-width: 768px) {
    .loading-placeholder {
        column-count: 1;
        /* Single column layout */
        column-gap: 0;
        /* No gap for single column */
    }

    .loading-box {
        margin-bottom: 15px;
        /* Increase vertical spacing for mobile */
    }
}

@keyframes shimmer {
    from {
        background-position: 200% 0;
    }

    to {
        background-position: -200% 0;
    }
}
</style>