<template>
    <div class="live-tv-layout">
        <!-- First Column -->
        <div class="column first-column">
            <!-- Top Large Box (2/3 Height of First Column) -->
            <div class="row-tv">
                <div class="box-left">
                    Tradeklub Television
                </div>
                <div class="box-wrapper large">
                    <LiveTVBox />
                </div>
            </div>
            <!-- Bottom Small Box (1/3 Height of First Column) -->
            <div class="row">
                <div class="box-left">
                    Top News
                </div>
                <div class="box-wrapper medium rss-widget-wrapper">
                    <div class="rssapp-widget-container" ref="rssWidgetContainer"></div>
                </div>
            </div>
        </div>

        <!-- Second Column -->
        <div class="column second-column">
            <!-- Top Large Box (4/5 Height of Second Column) -->
            <div class="box-wrapper center-large">
                <div
                    class="tradingview-widget-container"
                    ref="tradingViewWidget"
                    style="width: 100%; height: 100%;"
                ></div>
            </div>
            <!-- Bottom Small Box (1/5 Height of Second Column) -->
            <div class="box-wrapper center-small">
                <LiveTVBox />
            </div>
        </div>

        <!-- Third Column -->
        <div class="column third-column">
            <!-- Grid container for widgets -->
            <div class="grid-container">
                <div
                    v-for="(widget, index) in visibleWidgets"
                    :key="index"
                    class="grid-item"
                    :style="{
                        height: widgetContainerDimensions.widgetHeight + 'px',
                        width: widgetContainerDimensions.widgetWidth + 'px',
                    }"
                >
                    <div
                        class="tradingview-widget-container"
                        :ref="'tradingViewWidget' + index"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import LiveTVBox from "./LiveTVBox.vue";

export default {
    name: "LiveTv",
    components: {
        LiveTVBox,
    },
    data() {
        return {
            headerHeight: 0,
            tabsHeight: 0,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            maxWidgets: 6,
            widgetSymbols: ["FX:EURUSD", "NASDAQ:AAPL", "TSLA", "CRYPTO:BTCUSD", "GOLD", "MSTR"], // Different widget symbols
        };
    },
    computed: {
        widgetContainerDimensions() {
            // Get third column width dynamically by assuming its proportional flex (1/7 in layout)
            const thirdColumnWidth = this.viewportWidth * (1 / 7); // Adjust based on `flex: 1` for `.third-column`
            
            // Calculate rows based on available height (200px per widget minimum)
            const rows = Math.min(this.maxWidgets, Math.floor(this.viewportHeight / 200));
            
            // Dynamically calculate widget dimensions
            const widgetHeight = this.viewportHeight / rows; // Height divided equally
            const widgetWidth = thirdColumnWidth; // Full width of the third column

            return { widgetHeight, widgetWidth, rows };
        },
        visibleWidgets() {
            // Ensure the number of widgets matches the height constraint and available symbols
            const rows = this.widgetContainerDimensions.rows;
            return this.widgetSymbols.slice(0, rows); // Use only as many symbols as rows
        },
    },
    methods: {
        initializeRssWidget() {
            const container = this.$refs.rssWidgetContainer;

            if (container) {
                // Clear previous content
                container.innerHTML = `
                    <rssapp-list id="tMxZaYsazbSxiR4r" style="width: 100%; height: 100%; display: block;"></rssapp-list>
                `;

                // Dynamically add the RSS app script
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://widget.rss.app/v1/list.js";
                script.async = true;

                container.appendChild(script);
            }
        },
        updateDimensions() {
        // Calculate 16:9 aspect ratio for LiveTVBox
        const liveTVBoxWidth = this.$refs.liveTVBox.offsetWidth;
        const liveTVBoxHeight = liveTVBoxWidth * (9 / 16);
        this.$refs.liveTVBox.style.height = `${liveTVBoxHeight}px`;

        // Calculate remaining height for RSS widget
        const columnHeight = this.$refs.liveTVBox.parentElement.offsetHeight;
        const rssWidgetHeight = columnHeight - liveTVBoxHeight;
        this.$refs.rssWidgetWrapper.style.height = `${rssWidgetHeight}px`;

        // Adjust RSS widget container to fill its parent
        const rssContainer = this.$refs.rssWidgetContainer;
        rssContainer.style.width = "100%";
        rssContainer.style.height = "100%";
    },
        updateViewportHeight() {
            this.viewportHeight = window.innerHeight;
            this.viewportWidth = window.innerWidth;
        },
        calculateHeights() {
            const header = document.querySelector(".header");
            const tabs = document.querySelector(".tabs-row");

            this.headerHeight = header?.offsetHeight || 0;
            this.tabsHeight = tabs?.offsetHeight || 0;
            this.viewportHeight = window.innerHeight;
            document.documentElement.style.setProperty(
                "--available-height",
                `${this.viewportHeight - this.headerHeight - this.tabsHeight}px`
            );
        },
        initializeTradingViewMiniChartWidgets() {
            this.visibleWidgets.forEach((symbol, index) => {
                const widgetContainer = this.$refs[`tradingViewWidget${index}`]?.[0];

                if (widgetContainer) {
                    // Clear previous content
                    widgetContainer.innerHTML = ""; 

                    // Dynamically create the <script> tag
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                    script.async = true;

                    // Configuration for each mini widget
                    script.text = JSON.stringify({
                        symbol: symbol,
                        width: "100%",
                        height: "100%",
                        locale: "en",
                        dateRange: "12M",
                        colorTheme: "dark",
                        isTransparent: false,
                        autosize: true,
                        largeChartUrl: "",
                    });

                    widgetContainer.appendChild(script);
                }
            });
        },
        initializeTradingViewWidget() {
            const container = this.$refs.tradingViewWidget;

            if (container) {
                // Clear previous content
                container.innerHTML = `
                    <div style="height:100%;width:100%">
                        <div style="height:100%;width:100%" id="tradingview-widget"></div>
                    </div>`;

                // Dynamically create the <script> tag
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
                script.async = true;

                // Configuration for the advanced chart
                script.text = JSON.stringify({
                    autosize: true,
                    symbol: "NASDAQ:AAPL",
                    interval: "D",
                    timezone: "Etc/UTC",
                    theme: "dark",
                    style: "1",
                    locale: "en",
                    allow_symbol_change: true,
                    calendar: false,
                });

                container.querySelector("#tradingview-widget").appendChild(script);
            }
        },
    },
    mounted() {
        this.calculateHeights();
        this.updateViewportHeight();
        this.initializeTradingViewMiniChartWidgets();
        window.addEventListener("resize", this.calculateHeights);
        this.initializeRssWidget();
        this.initializeTradingViewWidget();
    },
    beforeUnmount() {
        window.removeEventListener("resize", this.calculateHeights);
    },
};
</script>

<style scoped>
:root {
    --available-height: 100vh;
    /* Default full viewport height */
}

.live-tv-layout {
    display: flex;
    /* Arrange columns side by side */
    width: 100%;
    height: var(--available-height);
    /* Use available height */
    gap: 10px;
    box-sizing: border-box;
    padding: 10px;
}

/* Column Styling */
.column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* Spacing between rows within each column */
    height: 100%;
}

/* First Column */
.first-column {
    flex: 4;
    /* 4/7 width */
}

.first-column .large {
    flex: 2;
    /* 2/3 height */
}

.first-column .medium {
    flex: 1;
    /* 1/3 height */
}

/* Second Column */
.second-column {
    flex: 2;
    /* 2/7 width */
}

.second-column .center-large {
    flex: 4;
    /* 4/5 height */
}

.second-column .center-small {
    flex: 1;
    /* 1/5 height */
}

/* Third Column */
.third-column {
    flex: 1; /* 1/7 width of layout */
    display: flex;
    flex-direction: column; /* Stack widgets vertically */
    height: 100%; /* Constrain to parent layout height */
    gap: 10px;
    overflow: hidden; /* Prevent overflowing of content */
}

.third-column .tall {
    flex: 1;
    /* Full height */
}

/* General Box Styling */
.box-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
}

.row {
    display: flex;
    width: 100%;
    height: 100%;
}

.row-tv {
    aspect-ratio: 16 / 9; 
    display: flex; /* Align children horizontally */
    box-sizing: border-box; /* Ensure padding/border is included in dimensions */
}


.box-left {
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl; /* Vertical text */
    text-align: center;
    background-color: #001845; /* Same blue as the content boxes */
    color: white;
    padding: 10px;
    font-weight: bold;
    width: 10px; /* Set fixed width for the left column */
    height: auto; /* Adjust height to match content */
    flex-shrink: 0; /* Prevent the left column from shrinking */
    transform: rotate(180deg);
}


/* Grid container for widgets */
.grid-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    height: 100%;
}

/* Individual grid item */
.grid-item {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background-color: #1e1e1e; /* Example background */
    border: 1px solid #333; /* Example border for clarity */
    overflow: hidden; /* Prevent any child overflow */
}

.rss-widget-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: auto;
    background-color: #f9f9f9; /* Optional: Adjust background */
    border: 1px solid #ddd; /* Optional: Add a border */
    overflow: hidden; /* Prevent content overflow */
}

.rssapp-widget-container {
    width: auto;
    height: auto;
    display: block;
    /* Ensure the container fully occupies the parent */
}
</style>