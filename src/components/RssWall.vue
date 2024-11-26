<template>
    <div class="rss-wall-layout">
        <!-- TradingView Ticker Tape Widget -->
        <div class="ticker-widget-container" ref="tickerWidgetContainer">
            <div class="tradingview-widget-container">
                <div style="width: 100%;" class="tradingview-widget-container__widget"></div>
            </div>
        </div>

        <!-- RSS Wall -->
        <div class="rss-wall">
            <!-- Loading Animation -->
            <div
                v-show="!fadeOutComplete"
                :class="{ 'fade-out': iframeLoaded }"
                class="loading-placeholder"
            >
                <div
                    v-for="(height, index) in loadingBoxHeights"
                    :key="index"
                    class="loading-box"
                    :style="{ height: height + 'px' }"
                ></div>
            </div>

            <!-- Iframe -->
            <iframe
                id="rss-widget"
                :class="{ 'fade-in': iframeLoaded }"
                width="100vw"
                :height="iframeHeight"
                src="https://rss.app/embed/v1/wall/tK9EXetq9sbcI2oz"
                frameborder="0"
                loading="lazy"
                @load="onIframeLoad"
                title="RSS Feed Wall"
            ></iframe>
        </div>
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
        };
    },
    methods: {
        calculateHeight() {
            const headerHeight = document.querySelector(".header")?.offsetHeight || 0;
            const tabsHeight = document.querySelector(".tabs-row")?.offsetHeight || 0;
            const tickerWidgetHeight = document.querySelector(".ticker-widget-container")?.offsetHeight || 0;
            const viewportHeight = window.innerHeight;

            this.iframeHeight = `${viewportHeight - headerHeight - tabsHeight - tickerWidgetHeight}px`;
        },
        initializeTickerWidget() {
            const container = this.$refs.tickerWidgetContainer;

            if (container) {
                container.innerHTML = `
                    <div class="tradingview-widget-container">
                        <div style="width: 100%;" class="tradingview-widget-container__widget"></div>
                    </div>`;

                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src =
                    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
                script.async = true;

                script.text = JSON.stringify({
                    symbols: [
                        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
                        { proName: "FOREXCOM:NSXUSD", title: "US 100 Cash CFD" },
                        { proName: "FX_IDC:EURUSD", title: "EUR to USD" },
                        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
                        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
                    ],
                    showSymbolLogo: true,
                    isTransparent: true,
                    displayMode: "adaptive",
                    colorTheme: "light",
                    locale: "en",
                });

                container.appendChild(script);
            }
        },
        generateBoxHeights() {
            const viewportHeight = window.innerHeight;
            const numberOfBoxes = 6; // Number of loading boxes

            // Generate random weights for each box
            const randomWeights = Array.from({ length: numberOfBoxes }, () => Math.random());
            const totalWeight = randomWeights.reduce((sum, weight) => sum + weight, 0);

            // Calculate heights proportional to the random weights
            this.loadingBoxHeights = randomWeights.map(weight => 
                Math.floor((weight / totalWeight) * viewportHeight)
            );
        },
        onIframeLoad() {
            this.iframeLoaded = true; // Start the fade-out animation

            // Wait for the fade-out animation to complete before fully hiding the loading placeholder
            setTimeout(() => {
                this.fadeOutComplete = true; // Hides the loading placeholder
            }, 1000); // Match the CSS fade-out duration (1 second)
        },
    },
    mounted() {
        this.calculateHeight(); // Set height on mount
        this.generateBoxHeights();
        this.initializeTickerWidget(); // Initialize the TradingView widget

        document.body.style.overflow = "hidden";
    },
    beforeUnmount() {
        // Re-enable scrolling on the body when the component is destroyed
        document.body.style.overflow = "auto";
    },
};
</script>

<style scoped>
.rss-wall-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

.ticker-widget-container {
    width: 100%;
    background-color: #f0f0f0; /* Matches the light theme */
    border-bottom: 1px solid #ddd; /* Optional: visual separation */
    z-index: 100; /* Ensure it stays above other elements */
    padding: 5px 0;
}

.tradingview-widget-container {
    width: 100%;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 0;
}

.rss-wall {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
}

iframe {
    width: 100%;
    border: none;
    opacity: 0;
    transition: opacity 1s ease-in-out;
}

iframe.fade-in {
    opacity: 1;
}

.loading-placeholder {
    column-count: 3;
    column-gap: 20px;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    opacity: 1;
    transition: opacity 1s ease-in-out;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1;
}

.loading-placeholder.fade-out {
    opacity: 0;
    pointer-events: none;
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

@media (max-width: 768px) {
    .loading-placeholder {
        column-count: 1;
        column-gap: 0;
    }

    .loading-box {
        margin-bottom: 15px;
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