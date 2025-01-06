<template>
    <div>
        <!-- Login Prompt for the whole page -->
        <div v-if="!user" class="auth-prompt">
            <h3>Please login to access Live TV</h3>

            <!-- First time login prompt -->
            <p v-if="firstTimeLogin" class="first-time-login-prompt">
                First time logging in? Check your email for a temporary password.
            </p>

            <input
                v-model="email"
                placeholder="Email"
                type="email"
                class="login-input"
            />
            <input
                v-model="password"
                placeholder="Password"
                type="password"
                class="login-input"
                @keyup.enter="login"
            />
            <button @click="login" class="login-button">Login</button>
            <button @click="register" class="register-button">Register</button>
            <button @click="resetPassword" class="reset-password-button">Reset Password</button>

            <!-- Reset Password Modal -->
            <div v-if="resetPasswordMode" class="modal-overlay">
                <div class="modal-content">
                    <h3>Reset Password</h3>
                    <input
                        v-model="emailForReset"
                        placeholder="Enter your email address"
                        type="email"
                        class="login-input"
                    />
                    <button @click="resetPassword" class="reset-password-submit">Send Reset Email</button>
                    <button @click="resetPasswordMode = false" class="modal-close">Cancel</button>
                </div>
            </div>
        </div>

        <!-- If user is logged in, show the Live TV page -->
        <div class="live-tv-layout" v-else>
            <!-- First Column -->
            <div class="column first-column">
                <!-- Top Large Box (2/3 Height of First Column) -->
                <div class="row-tv">
                    <div class="box-left">
                        Tradeklub Television
                    </div>
                    <div class="tv-box-wrapper large" style="position:relative;">
                        <iframe 
                            :src="liveStreamUrl"
                            allow="autoplay; fullscreen; microphone"
                            allowfullscreen 
                            frameborder="0" 
                            style="position:absolute;top:0;left:0;width:100%;height:100%;">
                        </iframe>
                    </div>
                </div>
                <!-- Bottom Small Box (1/3 Height of First Column) -->
                <div class="row">
                    <div v-if="isMobile" ref="mobileContainer" :class="{ 'scoped-mobile-container': isMobile }">
                        <TabbedComponent 
                        :parentWidth="parentWidthMobile" 
                        :parentHeight="parentHeightMobile" 
                        />
                    </div>
                    <div v-else class="desktop-layout">
                        <div class="box-left">
                        Top News
                        </div>
                        <div class="split-container">
                        <div class="rss-widget-wrapper">
                            <iframe 
                            ref="rssWidgetIframe" 
                            src="https://rss.app/embed/v1/list/tMxZaYsazbSxiR4r" 
                            frameborder="0"
                            scrolling="no"
                            style="width: 100%; height: 100%; box-sizing: border-box;">
                            </iframe>
                        </div>
                        <div class="right-half" ref="chatContainer">
                            <ChatComponent 
                            :width="parentWidth" 
                            :height="parentHeight" 
                            role="viewer" 
                            ref="chatComponent" 
                            />
                        </div>
                        </div>
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
    </div>
</template>

<script>
// import LiveTVBox from "./LiveTVBox.vue";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import ChatComponent from "./ChatComponent.vue"; 
import TabbedComponent from "./TabbedComponent.vue";

export default {
    name: "LiveTv",
    components: {
        // LiveTVBox,
        ChatComponent,
        TabbedComponent
    },
    data() {
        return {
            headerHeight: 0,
            tabsHeight: 0,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            maxWidgets: 6,
            scrollInterval: null,
            liveStreamToken: process.env.VUE_APP_LIVESTREAM_TOKEN,
            // widgetSymbols: ["FX:EURUSD", "NASDAQ:AAPL", "TSLA", "CRYPTO:BTCUSD", "GOLD", "MSTR"],
            widgetSymbols: ["PYTH:QQQ", "CBOE:VX1!", "CME_MINI:NQ1!", "CBOT_MINI:YM1!", "NYMEX:CL1!", "NYMEX:NG1!", "ASX24:GS1!", "CBOT:ZN1!", "CBOT:ZB1!", "CBOT:ZS1!", "CBOT:ZM1!", "CME:6J1!", "CME:6E1!", "OANDA:EURUSD", "CAPITALCOM:USDJPY", "AMEX:SPY", "COINBASE:ETHUSD", "MARKETSCOM:BITCOIN"],
            currentSymbolIndex: 0,
            parentWidth: null,
            parentHeight: null,
            parentWidthMobile: 0,
            parentWidthHeight: 0,
            user: null,
            firstTimeLogin: true,
            email: "",
            password: "",
            resetPasswordMode: false,
            showMenu: false,
            parentHeightMobile: 0,
        };
    },
    computed: {
        liveStreamUrl() {
            return `https://player.restream.io/?token=${this.liveStreamToken}`;
        },
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
        async login() {
            const auth = getAuth();
            try {
                const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
                this.user = userCredential.user;
                
                // Store user in sessionStorage after login
                sessionStorage.setItem('user', JSON.stringify(this.user));
                
                // Reset first time login state if successful login
                this.firstTimeLogin = false;

            } catch (error) {
                console.log("error 99231", error);
                console.error("Login Error:", error.message);
                alert("Login failed. Please check your credentials.");
            }
        },
        async register() {
            // Redirect the user to the course purchase URL
            const courseUrl = "https://www.tradelikethepros.com/offers/H9Vzg92f";
            window.location.href = courseUrl;
        },
        resetPassword() {
            if (this.resetPasswordMode) {
                const auth = getAuth();
                if (!this.emailForReset) {
                alert("Please enter your email address to reset your password.");
                return;
                }
                sendPasswordResetEmail(auth, this.emailForReset)
                .then(() => {
                    alert("Password reset email sent! Please check your inbox.");
                    this.resetPasswordMode = false;
                })
                .catch((error) => {
                    console.error("Password reset error", error);
                    alert("Error sending password reset email. Please try again.");
                });
            } else {
                this.resetPasswordMode = true;
            }
        },
        cancelResetPassword() {
            this.resetPasswordMode = false;
        },
        isMobile() {
            return window.innerWidth <= 768; // You can adjust the breakpoint as needed
        },
        calculateMobileDimensions() {
            const parentElement = this.$refs.mobileContainer; // Reference to the parent
            if (parentElement) {
                this.parentWidthMobile = parentElement.offsetWidth; // Dynamically calculate width
                this.parentHeightMobile = parentElement.offsetHeight; // Dynamically calculate height
            }
        },
        handleResize() {
            if (this.isMobile()) {
                this.calculateMobileDimensions();
            }
        },
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
            // console.log("initialize trading view widget for clone");
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
            const chatComponent = this.$refs.chatComponent; 

            if (iframe && chatComponent) {
                // Get parent dimensions
                const parentWidth = iframe.parentElement.offsetWidth;
                const parentHeight = iframe.parentElement.offsetHeight;

                // Set iframe dimensions dynamically
                iframe.style.width = `${parentWidth}px`;
                iframe.style.height = `${parentHeight}px`;

                this.chatComponentWidth = parentWidth;
                this.chatComponentHeight = parentHeight;

                // Ensure the iframe scales responsively
                iframe.setAttribute("width", "100%");
                iframe.setAttribute("height", "100%");
            }
        },
        updateChatDimensions() {
            const chatContainer = this.$refs.chatContainer;
            if (chatContainer) {
                this.parentWidth = chatContainer.offsetWidth;
                this.parentHeight = chatContainer.offsetHeight;
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
                    "autosize": true,
                    "symbol": "NASDAQ:AAPL",
                    "interval": "1",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1",
                    "locale": "en",
                    "allow_symbol_change": true,
                    "calendar": false,
                    "studies": [
                        "STD;VWAP"
                    ],
                    "hide_volume": true,
                    "support_host": "https://www.tradingview.com"
                });

                container.querySelector("#tradingview-widget").appendChild(script);
            }
        },
    },
    mounted() {
        // this.disableScroll bing();
        this.calculateHeights();
        this.updateViewportHeight();

        // Preload clones
        // this.preloadClones();

        window.addEventListener("resize", this.calculateHeights);
        this.$nextTick(() => {
            this.initializeRssWidget();
        });
        this.initializeTradingViewWidget();

        this.updateChatDimensions();

        if (this.isMobile()) {
            this.calculateMobileDimensions();
        }

        window.addEventListener("resize", this.updateChatDimensions);

        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            this.user = JSON.parse(storedUser); // Parse the stored user data from sessionStorage
        }

        this.$nextTick(() => {
            if (this.$refs.scrollContainer) {
                this.preloadClones(); // Call preloadClones when DOM is ready
            } else {
                console.error("Scroll container is not ready yet.");
            }
        });
        this.$nextTick(() => {
            this.initializeTradingViewWidget();
            this.initializeTradingViewEventsWidget();
            this.initializeTradingViewMiniChartWidgets();
        });

        setTimeout(() => {
            this.startAutoScroll();
        }, 2000); 
    },
    beforeUnmount() {
        this.enableScrolling();
        this.stopAutoScroll()
        window.removeEventListener("resize", this.calculateHeights);
        window.removeEventListener("resize", this.updateChatDimensions);
        window.removeEventListener("resize", this.handleResize);
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
    width: 100%;
    height: var(--available-height);
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
    height: 100%; /* Ensure it fills .live-tv-layout */
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
    height: 100%; /* Ensure this is set to a defined height */
    flex-direction: column; /* Layout children in a column */
    box-sizing: border-box;
}

.desktop-layout {
    display: flex;
    flex-direction: row; /* Align horizontally */
    align-items: stretch; /* Make children stretch to fill parent height */
    height: 100%; /* Match height of .row */
    width: 100%; /* Ensure full width */
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

/* Left half for RSS iframe */
.left-half {
    width: 50%; /* Half of the container */
    height: 100%;
    overflow: hidden; /* Prevent content from overflowing outside */
}
.rss-widget-wrapper, .right-half {
    width: 50%; /* Adjust based on your layout */
    height: 100%; /* Both should take up full height of split-container */
}

.right-half {
    overflow-y: auto; /* For ChatComponent, to manage overflow */
}

.split-container {
    width: 100%;
    height: 100%; /* Make sure this fills its parent */
    display: flex;
}

/* Adjusting the iframe */
.rss-widget-wrapper iframe {
    width: 100%; /* Ensure iframe scales to container */
    height: 100%;
    border: none; /* Remove iframe border */
}

/* Ensure ChatComponent fills its container but doesn't overflow */
.right-half > ChatComponent {
    width: 100%;
    height: 100%; /* Fill .right-half */
    overflow-y: auto; /* Allow scrolling when content overflows */
    display: block;
    box-sizing: border-box;
}

/* Ensure ChatComponent's internal scrollable area */
.right-half > ChatComponent > .chat-wrapper {
    height: 100%; /* Fill the ChatComponent */
}

.right-half > ChatComponent > .chat-wrapper > .chat-window {
    height: 100%; /* Ensure the chat window takes up all available space */
    overflow-y: auto; /* Internal scrolling for messages */
}

.chat-wrapper {
  height: 100%; /* Ensure it matches parent's height */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.chat-window {
  flex-grow: 1; /* Use remaining space within chat-wrapper */
  overflow-y: auto; /* Scroll for overflowing content */
}

.input-wrapper {
  flex-shrink: 0; /* Prevent input area from growing/shrinking */
}

.chat-bubble {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 90%; /* Limit to a percentage of the parent */
}


#mobile-container {
  flex: 1; /* Fills the remaining height of the row */
}

.scoped-mobile-container {
    height: 100%;
    width: 100%;
}

.auth-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.login-input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.login-button, .register-button {
  padding: 12px 20px;
  background-color: #162D5D;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 10px 0;
  width: 100%;
}

.login-button:hover, .register-button:hover {
  background-color: #315297;
}


.reset-password-button {
  padding: 12px 20px;
  background-color: #FF7043;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 10px 0;
  width: 100%;
}

.reset-password-button:hover,{
  background-color: #315297;
}


.first-time-login-prompt {
    color: #FF9800;
    font-size: 14px;
    margin-bottom: 10px;
}


.reset-password-submit,
.modal-close {
    padding: 10px 20px;
    font-size: 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease, color 0.3s ease, transform 0.1s ease;
    margin: 5px;
    outline: none;
}

.reset-password-submit {
    background-color: #1976D2; /* Deep Blue for the action */
    color: white;
}

.reset-password-submit:hover {
    background-color: #1565C0; /* Darker shade on hover */
    transform: translateY(-1px);
}

.reset-password-submit:active {
    transform: translateY(1px);
}

.modal-close {
    background-color: #E0E0E0; /* Light grey for cancel */
    color: #333;
}

.modal-close:hover {
    background-color: #BDBDBD; /* Slightly darker on hover */
    color: #000;
    transform: translateY(-1px);
}

.modal-close:active {
    transform: translateY(1px);
}
</style>