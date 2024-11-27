<template>
    <div class="live-tv-layout">
        <!-- First Column -->
        <div class="column first-column">
            <!-- Top Large Box (2/3 Height of First Column) -->
            <div class="row-tv">
                <div class="box-left">
                    Tradeklub Television
                </div>
                <div class="tv-box-wrapper large">
                    <LiveTVBox />
                </div>
            </div>
            <!-- Bottom Small Box (1/3 Height of First Column) -->
            <div class="row">
                <div class="box-left">
                    Top News
                </div>
                <div class="box-wrapper medium rss-widget-wrapper">
                    <iframe 
                        ref="rssWidgetIframe" 
                        src="https://rss.app/embed/v1/list/tMxZaYsazbSxiR4r" 
                        frameborder="0"
                        scrolling="no"
                        style="width: 100%; height: 100%; box-sizing: border-box;">
                    </iframe>
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
                <div class="tradingview-widget-container" ref="tradingViewEventsWidget"></div>
            </div>
        </div>

        <!-- Third Column -->
        <div class="column third-column">
            <!-- Grid container for widgets -->
            <div 
                class="scroll-container"
                ref="scrollContainer"
                @mouseenter="stopAutoScroll"
                @mouseleave="startAutoScroll"
            >
                <div class="grid-container">
                    <div
                        v-for="(widget, index) in widgetSymbols"
                        :key="index"
                        class="grid-item"
                    >
                        <div
                            class="tradingview-widget-container"
                            :ref="'tradingViewWidget' + index"
                        ></div>
                    </div>
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
            scrollInterval: null,
            // widgetSymbols: ["FX:EURUSD", "NASDAQ:AAPL", "TSLA", "CRYPTO:BTCUSD", "GOLD", "MSTR"],
            widgetSymbols: ["PYTH:QQQ", "CBOE:VX1!", "TVC:VIX", "CME_MINI:NQ1!", "CBOT_MINI:YM1!", "NYMEX:CL1!", "NYMEX:NG1!", "ASX24:GS1!", "CBOT:ZN1!", "CBOT:ZB1!", "CBOT:ZS1!", "CBOT:ZM1!", "CME:6J1!", "CME:6E1!", "OANDA:EURUSD", "CAPITALCOM:USDJPY", "AMEX:SPY", "COINBASE:ETHUSD", "MARKETSCOM:BITCOIN"],
            currentSymbolIndex: 0,
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
        initializeTradingViewEventsWidget() {
            const container = this.$refs.tradingViewEventsWidget;

            if (container) {
                // Clear existing content
                container.innerHTML = `
                    <div class="tradingview-widget-container__widget"></div>
                `;

                // Dynamically create and append the script tag
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
                script.async = true;

                // Configure the widget
                script.text = JSON.stringify({
                    width: "100%",
                    height: "100%",
                    colorTheme: "dark",
                    isTransparent: false,
                    locale: "en",
                    importanceFilter: "-1,0,1",
                    countryFilter: "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
                });

                container.appendChild(script);
            } else {
                console.error("TradingView Events Widget container not found.");
            }
        },
        preloadClones() {
            const container = this.$refs.scrollContainer;
            const gridContainer = container.querySelector(".grid-container");

            if (gridContainer) {
                // Clone all widgets and append them to the container
                const widgets = Array.from(gridContainer.children);
                widgets.forEach((widget, index) => {
                    const clone = widget.cloneNode(true);
                    const symbol = this.widgetSymbols[index % this.widgetSymbols.length];
                    gridContainer.appendChild(clone);
                    this.initializeTradingViewWidgetForClone(clone, symbol);
                });

                container.scrollTop = 0; // Reset scroll to the top
            }
        },
        initializeTradingViewWidgetForClone(clonedElement, symbol) {
            const widgetContainer = clonedElement.querySelector(".tradingview-widget-container");

            if (widgetContainer) {
                // Skip reinitializing if the widget already exists with the correct symbol
                const existingSymbol = widgetContainer.getAttribute("data-symbol");
                if (existingSymbol === symbol) return;

                // Clear previous content and set the symbol attribute
                widgetContainer.innerHTML = "";
                widgetContainer.setAttribute("data-symbol", symbol);

                // Dynamically create the <script> tag
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src =
                    "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                script.async = true;

                // Configuration for the cloned widget
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
        },
        startAutoScroll() {
            const container = this.$refs.scrollContainer;

            if (container) {
                let scrollSpeed = 0.5; // Subpixel scrolling speed
                let cumulativeScroll = 0;

                const scroll = () => {
                    cumulativeScroll += scrollSpeed;

                    if (cumulativeScroll >= 1) {
                        container.scrollTop += Math.floor(cumulativeScroll);
                        cumulativeScroll -= Math.floor(cumulativeScroll);
                    }

                    // Handle scrolling past the last widget
                    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
                        const gridContainer = container.querySelector(".grid-container");
                        const firstWidget = gridContainer.firstElementChild;

                        if (firstWidget) {
                            const clonedWidget = firstWidget.cloneNode(true);

                            // Determine the next symbol
                            const symbolIndex = (this.currentSymbolIndex++) % this.widgetSymbols.length;
                            const symbol = this.widgetSymbols[symbolIndex];

                            // Append the cloned widget and initialize it with the correct symbol
                            gridContainer.appendChild(clonedWidget);
                            this.initializeTradingViewWidgetForClone(clonedWidget, symbol);

                            // Adjust scroll position to maintain smoothness
                            const widgetHeight = firstWidget.offsetHeight + 10; // Include gap
                            container.scrollTop -= widgetHeight;

                            // Safely remove the original first widget if it's still part of gridContainer
                            if (gridContainer.contains(firstWidget)) {
                                gridContainer.removeChild(firstWidget);
                            }
                        }
                    }

                    this.scrollInterval = requestAnimationFrame(scroll);
                };

                scroll();
            }
        },
        stopAutoScroll() {
            cancelAnimationFrame(this.scrollInterval); // Stop the scrolling loop
        },
        disableScrolling() {
            document.body.style.overflow = "hidden";
        },
        enableScrolling() {
            document.body.style.overflow = "";
        },
        initializeRssWidget() {
            const iframe = this.$refs.rssWidgetIframe;

            if (iframe) {
                // Get parent dimensions
                const parentWidth = iframe.parentElement.offsetWidth;
                const parentHeight = iframe.parentElement.offsetHeight;

                // Set iframe dimensions dynamically
                iframe.style.width = `${parentWidth}px`;
                iframe.style.height = `${parentHeight}px`;

                // Ensure the iframe scales responsively
                iframe.setAttribute("width", "100%");
                iframe.setAttribute("height", "100%");
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
            this.widgetSymbols.forEach((symbol, index) => {
                const widgetContainer = this.$refs[`tradingViewWidget${index}`]?.[0];

                if (widgetContainer) {
                    // Clear previous content
                    widgetContainer.innerHTML = "";

                    // Dynamically create the <script> tag
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src =
                        "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
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
        this.disableScrolling();
        this.calculateHeights();
        this.updateViewportHeight();
        this.initializeTradingViewMiniChartWidgets();
        
        this.initializeTradingViewEventsWidget();

        // Preload clones
        this.preloadClones();

        this.startAutoScroll();
        window.addEventListener("resize", this.calculateHeights);
        this.initializeRssWidget();
        this.initializeTradingViewWidget();
    },
    beforeUnmount() {
        this.enableScrolling();
        this.stopAutoScroll()
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
    flex: 3;
    /* 3/5 height */
}

.second-column .center-small {
    flex: 2;
    /* 2/5 height */
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

/* Mobile Styles */
@media (max-width: 768px) {
    .live-tv-layout {
        flex-direction: column;
    }

    .column {
        display: none;
    }

    .first-column {
        display: flex;
        width: 100%;
        flex: none; /* Remove flex grow/shrink */
    }

    .live-tv-layout .box-left {
        display: none !important;
    }
}

/* General Box Styling */
.box-wrapper {
    width: 100%; /* Inherit parent's width */
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tv-box-wrapper {
    width: 100%; /* Inherit parent's width */
    height: 100%;
    display: flex;
    align-items: center;
    aspect-ratio: 16 / 9; 
    justify-content: center;
}

.row {
    display: flex;
    width: 100%;
    height: 100%;
}

.row-tv {
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


.scroll-container {
    overflow: hidden; /* Hide scrollbars */
    height: 100%; /* Fit to parent height */
    width: 100%; /* Full width */
    position: relative;
}

.grid-container {
    display: flex;
    flex-direction: column; /* Stack widgets vertically */
    gap: 10px; /* Add spacing between widgets */
    width: 100%;
}

.grid-item {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px; /* Consistent widget height */
    width: 100%;
    box-sizing: border-box; /* Include padding and borders */
    transition: transform 0.3s ease; /* Smooth appearance for recycled widgets */
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
    width: 100%; /* Fill the parent container */
    height: 100%; /* Match parent's height */
    position: relative;
    overflow: hidden; /* Prevent content overflow */
}

.rss-widget-wrapper iframe {
    width: 100%; /* Ensure iframe scales to container */
    height: 100%;
    border: none; /* Remove iframe border */
}
</style>