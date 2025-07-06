<template>
    <div>
        <!-- Login Prompt for the whole page -->
        <div v-if="!user && showAuthPrompt" class="auth-prompt">
            <h3>Please login to access Live TV</h3>

            <!-- First time login prompt -->
            <p v-if="firstTimeLogin" class="first-time-login-prompt">
                First time logging in? Check your email for a temporary password.
            </p>

            <input v-model="email" placeholder="Email" type="email" class="login-input" />
            <input v-model="password" placeholder="Password" type="password" class="login-input" @keyup.enter="login" />
            <button @click="login" class="login-button">Login</button>
            <button @click="register" class="register-button">Register</button>
            <button @click="resetPassword" class="reset-password-button">Reset Password</button>

            <!-- Reset Password Modal -->
            <div v-if="resetPasswordMode" class="modal-overlay">
                <div class="modal-content">
                    <h3>Reset Password</h3>
                    <input v-model="emailForReset" placeholder="Enter your email address" type="email"
                        class="login-input" />
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
                        <BroadcasterView role="viewer" ref="liveStreamViewer" class="full-size"
                            @request-login="handleLoginRequest" />
                    </div>
                </div>
                <!-- Bottom Small Box (1/3 Height of First Column) -->
                <div class="row">
                    <div v-if="isMobile" ref="mobileContainer" :class="{ 'scoped-mobile-container': isMobile }">
                        <TabbedComponent :parentWidth="parentWidthMobile" :parentHeight="parentHeightMobile" />
                    </div>
                    <div v-else class="desktop-layout">
                        <div class="box-left">
                            Top News
                        </div>
                        <div class="split-container">
                            <div class="rss-widget-wrapper">
                                <iframe ref="rssWidgetIframe" src="https://rss.app/embed/v1/list/tMxZaYsazbSxiR4r"
                                    frameborder="0" scrolling="no"
                                    style="width: 100%; height: 100%; box-sizing: border-box;">
                                </iframe>
                            </div>
                            <div class="right-half" ref="chatContainer">
                                <LiveStreamViewer :width="parentWidth" :height="parentHeight" role="viewer"
                                    @request-login="handleLoginRequest" ref="liveStreamViewer" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Second Column -->
            <div class="column second-column">
                <!-- Top Large Box (4/5 Height of Second Column) -->
                <div class="box-wrapper center-large">
                    <div class="tradingview-widget-container" ref="tradingViewWidget"
                        style="width: 100%; height: 100%;"></div>
                </div>
                <!-- Bottom Small Box (1/5 Height of Second Column) -->
                <div class="box-wrapper center-small">
                    <div class="tradingview-widget-container" ref="tradingViewEventsWidget"></div>
                </div>
            </div>

            <!-- Third Column -->
            <div class="column third-column">
                <!-- Grid container for widgets -->
                <div class="scroll-container" ref="scrollContainer" @mouseenter="stopAutoScroll"
                    @mouseleave="startAutoScroll">
                    <div class="grid-container">
                        <div v-for="(widget, index) in widgetSymbols" :key="index" class="grid-item">
                            <div class="tradingview-widget-container" :ref="'tradingViewWidget' + index"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import LiveStreamViewer from "./LiveStreamViewer.vue";
import TabbedComponent from "./TabbedComponent.vue";
import BroadcasterView from "./BroadcasterView.vue"

export default {
    name: "LiveTv",
    components: {
        LiveStreamViewer,
        TabbedComponent,
        BroadcasterView
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
            emailForReset: "",
            resetPasswordMode: false,
            showMenu: false,
            parentHeightMobile: 0,
            showAuthPrompt: false,
            widgetLoadingStates: {},
            scrollPaused: false,
            widgetInitQueue: [],
            isProcessing: false,
            widgetsInitialized: false,
        };
    },
    // watch: {
    //     user: {
    //         handler(newUser, oldUser) {
    //             if (newUser && !oldUser && !this.widgetsInitialized) {
    //                 // User just logged in and widgets haven't been initialized yet
    //                 console.log("User logged in, initializing widgets...");
    //                 setTimeout(() => {
    //                     this.initializeAllWidgetsAfterLogin();
    //                 }, 300);
    //             }
    //         },
    //         immediate: false
    //     }
    // },
    computed: {
        liveStreamUrl() {
            return `https://www.youtube.com/embed/99xP-Cpe1z4?autoplay=1&controls=0&showinfo=0`;
        },
        widgetContainerDimensions() {
            const thirdColumnWidth = this.viewportWidth * (1 / 7);
            const rows = Math.min(this.maxWidgets, Math.floor(this.viewportHeight / 200));
            const widgetHeight = this.viewportHeight / rows;
            const widgetWidth = thirdColumnWidth;
            return { widgetHeight, widgetWidth, rows };
        },
        visibleWidgets() {
            const rows = this.widgetContainerDimensions.rows;
            return this.widgetSymbols.slice(0, rows);
        },
    },
    methods: {
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        async initializeWidgetsSequentially() {
            console.log("Starting sequential widget initialization...");
            
            // 1. Initialize main trading view widget first
            await this.initializeTradingViewWidgetWithRetry();
            await this.delay(300);
            
            // 2. Initialize events widget
            await this.initializeTradingViewEventsWidgetWithRetry();
            await this.delay(300);
            
            // 3. Initialize mini chart widgets
            await this.initializeTradingViewMiniChartWidgetsWithRetry();
            await this.delay(500);
            
            // 4. Initialize RSS widget
            this.initializeRssWidget();
            this.updateChatDimensions();
            
            // 5. Handle mobile dimensions if needed
            if (this.isMobile()) {
                this.calculateMobileDimensions();
            }
            
            // 6. Finally, start the scrolling widgets
            await this.delay(1000);
            if (this.$refs.scrollContainer) {
                console.log("Starting preload clones after login...");
                await this.preloadClones();
                await this.delay(500);
                console.log("Starting auto-scroll after login...");
                this.startAutoScroll();
            }
        },
        async initializeTradingViewEventsWidgetWithRetry(retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    const container = this.$refs.tradingViewEventsWidget;
                    if (!container) {
                        throw new Error("TradingView events widget container not found");
                    }
                    
                    container.innerHTML = `<div class="tradingview-widget-container__widget"></div>`;
                    await this.$nextTick();
                    
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
                    script.async = true;
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
                    console.log("Events widget initialized successfully");
                    return;
                    
                } catch (error) {
                    console.error(`Events widget initialization attempt ${i + 1} failed:`, error);
                    if (i === retries - 1) throw error;
                    await this.delay(1000);
                }
            }
        },

        handleLoginRequest() {
            this.showAuthPrompt = true;
        },
        async login() {
            const auth = getAuth();
            try {
                const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
                this.user = userCredential.user;
                sessionStorage.setItem('user', JSON.stringify(this.user));
                this.firstTimeLogin = false;
                
                console.log("Login successful - widgets are already loaded!");
                // Widgets are already initialized, just hide the auth prompt
                
            } catch (error) {
                console.log("error 99231", error);
                console.error("Login Error:", error.message);
                alert("Login failed. Please check your credentials.");
            }
        },
        async initializeAllWidgets() {
            console.log("Starting widget initialization...");
            
            try {
                // Wait for DOM to be ready
                await this.$nextTick();
                await this.delay(500);
                
                // Initialize RSS and chat components
                this.initializeRssWidget();
                this.updateChatDimensions();
                
                if (this.isMobile()) {
                    this.calculateMobileDimensions();
                }
                
                // Initialize main TradingView widget
                console.log("Initializing main TradingView widget...");
                await this.initializeTradingViewWidget();
                await this.delay(1000);
                
                // Initialize events widget
                console.log("Initializing events widget...");
                await this.initializeTradingViewEventsWidget();
                await this.delay(1000);
                
                // Initialize mini widgets one by one
                console.log("Initializing mini widgets...");
                for (let index = 0; index < this.widgetSymbols.length; index++) {
                    await this.initializeSingleMiniWidget(index);
                    await this.delay(500); // Wait between each widget
                }
                
                // Start scrolling
                await this.delay(1000);
                if (this.$refs.scrollContainer) {
                    console.log("Starting scroll functionality...");
                    this.startAutoScroll();
                }
                
                this.widgetsInitialized = true;
                console.log("All widgets initialized!");
                
            } catch (error) {
                console.error("Error initializing widgets:", error);
            }
        },
        async initializeSingleMiniWidget(index) {
            const symbol = this.widgetSymbols[index];
            const widgetContainer = this.$refs[`tradingViewWidget${index}`]?.[0];
            
            if (!widgetContainer) {
                console.warn(`Widget container ${index} not found`);
                return;
            }
            
            console.log(`Initializing widget ${index} with symbol ${symbol}`);
            
            try {
                widgetContainer.innerHTML = "";
                await this.$nextTick();
                
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                script.async = true;
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
                console.log(`Widget ${index} (${symbol}) initialized`);
                
            } catch (error) {
                console.error(`Error initializing widget ${index} (${symbol}):`, error);
            }
        },
        async initializeAllWidgetsAfterLogin() {
            if (this.widgetsInitialized) {
                console.log("Widgets already initialized, skipping...");
                return;
            }

            console.log("Initializing widgets after login...");
            
            try {
                // Wait for layout to be fully rendered
                await this.$nextTick();
                await this.delay(200); // Give DOM time to stabilize
                
                // Initialize widgets in sequence to prevent conflicts
                await this.initializeWidgetsSequentially();
                
                this.widgetsInitialized = true;
                console.log("All widgets initialized successfully");
                
            } catch (error) {
                console.error("Error initializing widgets after login:", error);
                // Reset flag so user can try again
                this.widgetsInitialized = false;
            }
        },

        async initializeTradingViewWidgetWithRetry(retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    const container = this.$refs.tradingViewWidget;
                    if (!container) {
                        throw new Error("TradingView widget container not found");
                    }
                    
                    // Generate unique ID
                    const uniqueId = `tradingview-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Clear any existing content
                    container.innerHTML = `
                        <div style="height:100%;width:100%">
                            <div style="height:100%;width:100%" id="${uniqueId}"></div>
                        </div>`;
                    
                    await this.$nextTick();
                    await this.delay(100); // Give DOM time to update
                    
                    const widgetContainer = container.querySelector(`#${uniqueId}`);
                    
                    if (!widgetContainer) {
                        throw new Error("Widget container element not found after creation");
                    }
                    
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
                    script.async = true;
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
                        "studies": ["STD;VWAP"],
                        "hide_volume": true,
                        "support_host": "https://www.tradingview.com"
                    });
                    
                    widgetContainer.appendChild(script);
                    console.log("Main TradingView widget initialized successfully");
                    return;
                    
                } catch (error) {
                    console.error(`TradingView widget initialization attempt ${i + 1} failed:`, error);
                    if (i === retries - 1) throw error;
                    await this.delay(1000);
                }
            }
        },

        async initializeTradingViewMiniChartWidgetsWithRetry(retries = 3) {
            for (let i = 0; i < retries; i++) {
                try {
                    // Process widgets sequentially instead of in parallel
                    for (let index = 0; index < this.widgetSymbols.length; index++) {
                        const symbol = this.widgetSymbols[index];
                        const widgetContainer = this.$refs[`tradingViewWidget${index}`]?.[0];
                        
                        if (!widgetContainer) {
                            console.warn(`Widget container ${index} not found, skipping`);
                            continue;
                        }
                        
                        widgetContainer.innerHTML = "";
                        await this.$nextTick();
                        
                        const script = document.createElement("script");
                        script.type = "text/javascript";
                        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                        script.async = true;
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
                        
                        // Add delay between each widget to prevent overwhelming
                        await this.delay(150);
                    }
                    
                    console.log("Mini chart widgets initialized successfully");
                    return;
                    
                } catch (error) {
                    console.error(`Mini chart widgets initialization attempt ${i + 1} failed:`, error);
                    if (i === retries - 1) throw error;
                    await this.delay(1000);
                }
            }
        },

    // Enhanced widget initialization for clones
    async initializeTradingViewWidgetForClone(clonedElement, symbol, retries = 2) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const widgetContainer = clonedElement.querySelector(".tradingview-widget-container");
                
                if (!widgetContainer) {
                    throw new Error("Widget container not found in cloned element");
                }
                
                // Check if already initialized
                const existingSymbol = widgetContainer.getAttribute("data-symbol");
                if (existingSymbol === symbol) return;
                
                // Set loading state
                const widgetId = `widget-${Date.now()}-${Math.random()}`;
                this.widgetLoadingStates[widgetId] = 'loading';
                
                // Clear and prepare container
                widgetContainer.innerHTML = '<div class="widget-loading">Loading...</div>';
                widgetContainer.setAttribute("data-symbol", symbol);
                widgetContainer.setAttribute("data-widget-id", widgetId);
                
                // Wait for DOM to be ready
                await this.$nextTick();
                await this.delay(100);
                
                // Create script with proper error handling
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                script.async = true;
                
                // Add load/error handlers
                script.onload = () => {
                    this.widgetLoadingStates[widgetId] = 'loaded';
                    console.log(`Widget loaded successfully: ${symbol}`);
                };
                
                script.onerror = () => {
                    this.widgetLoadingStates[widgetId] = 'error';
                    console.error(`Failed to load widget: ${symbol}`);
                    widgetContainer.innerHTML = `<div class="widget-error">Failed to load ${symbol}</div>`;
                };
                
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
                
                // Clear loading state and append script
                widgetContainer.innerHTML = "";
                widgetContainer.appendChild(script);
                
                return; // Success, exit retry loop
                
            } catch (error) {
                console.error(`Widget initialization attempt ${attempt + 1} failed for ${symbol}:`, error);
                if (attempt === retries - 1) {
                    // Final attempt failed
                    const widgetContainer = clonedElement.querySelector(".tradingview-widget-container");
                    if (widgetContainer) {
                        widgetContainer.innerHTML = `<div class="widget-error">Error loading ${symbol}</div>`;
                    }
                    throw error;
                }
                await this.delay(500);
            }
        }
    },
        async register() {
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
            return window.innerWidth <= 768;
        },
        calculateMobileDimensions() {
            const parentElement = this.$refs.mobileContainer;
            if (parentElement) {
                this.parentWidthMobile = parentElement.offsetWidth;
                this.parentHeightMobile = parentElement.offsetHeight;
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
                container.innerHTML = `<div class="tradingview-widget-container__widget"></div>`;
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
                script.async = true;
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
        // Sequential preload version (recommended)
        async preloadClones() {
            const container = this.$refs.scrollContainer;
            const gridContainer = container.querySelector(".grid-container");

            if (!gridContainer) {
                console.error("Grid container not found");
                return;
            }

            const widgets = Array.from(gridContainer.children);

            if (widgets.length === 0) {
                console.warn("No widgets found to clone");
                return;
            }

            console.log(`Preloading ${widgets.length} widget clones...`);

            // Process widgets sequentially to avoid overwhelming the browser
            for (let index = 0; index < widgets.length; index++) {
                const widget = widgets[index];
                const clone = widget.cloneNode(true);
                const symbol = this.widgetSymbols[index % this.widgetSymbols.length];

                // Add clone to DOM first
                gridContainer.appendChild(clone);

                try {
                    // Wait for this widget to initialize before moving to the next
                    await this.initializeTradingViewWidgetForClone(clone, symbol);

                    // Small delay between widget initializations to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (error) {
                    console.error(`Failed to initialize clone for symbol ${symbol}:`, error);
                }
            }

            // Reset scroll position after all clones are loaded
            container.scrollTop = 0;
            console.log("Preload clones completed");
        },
        startAutoScroll() {
            if (this.scrollPaused) return;

            const container = this.$refs.scrollContainer;
            if (!container) return;

            let scrollSpeed = 0.5;
            let cumulativeScroll = 0;

            const scroll = () => {
                if (this.scrollPaused || this.isProcessing) {
                    this.scrollInterval = requestAnimationFrame(scroll);
                    return;
                }

                cumulativeScroll += scrollSpeed;

                if (cumulativeScroll >= 1) {
                    container.scrollTop += Math.floor(cumulativeScroll);
                    cumulativeScroll -= Math.floor(cumulativeScroll);
                }

                // Check if we need to cycle widgets
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
                    this.cycleWidgets();
                }

                this.scrollInterval = requestAnimationFrame(scroll);
            };

            scroll();
        },
        async cycleWidgets() {
            if (this.isProcessing) return;
            this.isProcessing = true;

            try {
                const container = this.$refs.scrollContainer;
                const gridContainer = container.querySelector(".grid-container");
                const firstWidget = gridContainer.firstElementChild;

                if (!firstWidget) {
                    this.isProcessing = false;
                    return;
                }

                // Create new widget first
                const clonedWidget = firstWidget.cloneNode(true);
                const symbolIndex = (this.currentSymbolIndex++) % this.widgetSymbols.length;
                const symbol = this.widgetSymbols[symbolIndex];

                // Add to DOM
                gridContainer.appendChild(clonedWidget);

                // Initialize the new widget
                await this.initializeTradingViewWidgetForClone(clonedWidget, symbol);

                // Wait a bit for the widget to start loading
                await new Promise(resolve => setTimeout(resolve, 100));

                // Adjust scroll position
                const widgetHeight = firstWidget.offsetHeight + 10;
                container.scrollTop -= widgetHeight;

                // Remove the old widget
                if (gridContainer.contains(firstWidget)) {
                    gridContainer.removeChild(firstWidget);
                }

            } catch (error) {
                console.error("Error cycling widgets:", error);
            } finally {
                this.isProcessing = false;
            }
        },
        stopAutoScroll() {
            this.scrollPaused = true;
            cancelAnimationFrame(this.scrollInterval);
        },
        pauseScrolling() {
            this.scrollPaused = true;
        },
        resumeScrolling() {
            this.scrollPaused = false;
        },
        disableScrolling() {
            document.body.style.overflow = "hidden";
        },
        enableScrolling() {
            document.body.style.overflow = "";
        },
        initializeRssWidget() {
            const iframe = this.$refs.rssWidgetIframe;
            const livestreamViewerComponent = this.$refs.liveStreamViewer;

            if (iframe && livestreamViewerComponent) {
                const parentWidth = iframe.parentElement.offsetWidth;
                const parentHeight = iframe.parentElement.offsetHeight;
                iframe.style.width = `${parentWidth}px`;
                iframe.style.height = `${parentHeight}px`;
                this.livestreamViewerComponentWidth = parentWidth;
                this.livestreamViewerComponentHeight = parentHeight;
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
                    widgetContainer.innerHTML = "";
                    const script = document.createElement("script");
                    script.type = "text/javascript";
                    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
                    script.async = true;
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
                container.innerHTML = `
                    <div style="height:100%;width:100%">
                        <div style="height:100%;width:100%" id="tradingview-widget"></div>
                    </div>`;
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
                script.async = true;
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
                    "studies": ["STD;VWAP"],
                    "hide_volume": true,
                    "support_host": "https://www.tradingview.com"
                });
                container.querySelector("#tradingview-widget").appendChild(script);
            }
        },
    },
    async mounted() {
        this.calculateHeights();
        this.updateViewportHeight();
        window.addEventListener("resize", this.calculateHeights);
        window.addEventListener("resize", this.updateChatDimensions);

        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            this.user = JSON.parse(storedUser);
        }

        await this.$nextTick();

        // ALWAYS initialize widgets on page load - regardless of login status
        console.log("Page loaded, initializing widgets...");
        
        try {
            // Give DOM time to stabilize
            await this.delay(500);
            
            // Initialize RSS and chat components
            this.initializeRssWidget();
            this.updateChatDimensions();
            
            if (this.isMobile()) {
                this.calculateMobileDimensions();
            }

            // Initialize TradingView widgets
            console.log("Initializing main TradingView widget...");
            await this.initializeTradingViewWidget();
            await this.delay(1000);
            
            console.log("Initializing events widget...");
            await this.initializeTradingViewEventsWidget();
            await this.delay(1000);
            
            console.log("Initializing mini chart widgets...");
            await this.initializeTradingViewMiniChartWidgets();
            await this.delay(1000);

            // Initialize scrolling widgets
            if (this.$refs.scrollContainer) {
                console.log("Starting preload clones...");
                await this.preloadClones();
                await this.delay(500);
                
                console.log("Starting auto-scroll...");
                this.startAutoScroll();
            }

            this.widgetsInitialized = true;
            console.log("All widgets initialized successfully!");

        } catch (error) {
            console.error("Error during widget initialization:", error);
        }

        // Handle URL auth parameter
        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');

        setTimeout(() => {
            if (!authParam || authParam !== '23901:kwpDFLQWK9102882913') {
                if (!this.user) {
                    this.showAuthPrompt = true;
                }
            }
        }, 10000);
    },


    beforeUnmount() {
        this.scrollPaused = true;
        this.stopAutoScroll();
        this.widgetLoadingStates = {};
        this.enableScrolling();
        window.removeEventListener("resize", this.calculateHeights);
        window.removeEventListener("resize", this.updateChatDimensions);
        window.removeEventListener("resize", this.handleResize);
    },
};
</script>

<style scoped>
:root {
    --available-height: 100vh;
}

.live-tv-layout {
    display: flex;
    width: 100%;
    height: var(--available-height);
    gap: 10px;
    box-sizing: border-box;
    padding: 10px;
}

.column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
}

.first-column {
    flex: 4;
    height: 100%;
}

.first-column .large {
    flex: 2;
}

.first-column .medium {
    flex: 1;
}

.second-column {
    flex: 2;
}

.second-column .center-large {
    flex: 3;
}

.second-column .center-small {
    flex: 2;
}

.third-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 10px;
    overflow: hidden;
}

.third-column .tall {
    flex: 1;
}

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
        flex: none;
    }

    .live-tv-layout .box-left {
        display: none !important;
    }
}

.box-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tv-box-wrapper {
    width: 100%;
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
    flex-direction: column;
    box-sizing: border-box;
}

.desktop-layout {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    height: 100%;
    width: 100%;
}

.row-tv {
    display: flex;
    box-sizing: border-box;
}

.box-left {
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-align: center;
    background-color: #001845;
    color: white;
    padding: 10px;
    font-weight: bold;
    width: 10px;
    height: auto;
    flex-shrink: 0;
    transform: rotate(180deg);
}

.scroll-container {
    overflow: hidden;
    height: 100%;
    width: 100%;
    position: relative;
}

.grid-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
}

.grid-item {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    max-height: 200px;
    width: 100%;
    box-sizing: border-box;
    background-color: #1e1e1e;
    border: 1px solid #333;
    overflow: hidden;
    transition: transform 0.3s ease;
}

.tradingview-widget-container {
    min-height: 100%;
    background-color: #1e1e1e;
}

.widget-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
    background-color: #1e1e1e;
}

.widget-loading::after {
    content: '';
    width: 20px;
    height: 20px;
    margin-left: 10px;
    border: 2px solid #333;
    border-top: 2px solid #666;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.widget-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #ff6b6b;
    font-size: 12px;
    background-color: #2a1f1f;
    text-align: center;
    padding: 10px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.rss-widget-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.rss-widget-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.left-half {
    width: 50%;
    height: 100%;
    overflow: hidden;
}

.rss-widget-wrapper,
.right-half {
    width: 50%;
    height: 100%;
}

.right-half {
    overflow-y: auto;
}

.split-container {
    width: 100%;
    height: 100%;
    display: flex;
}

.right-half>LiveStreamViewer {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    display: block;
    box-sizing: border-box;
}

.right-half>LiveStreamViewer>.chat-wrapper {
    height: 100%;
}

.right-half>LiveStreamViewer>.chat-wrapper>.chat-window {
    height: 100%;
    overflow-y: auto;
}

.chat-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.chat-window {
    flex-grow: 1;
    overflow-y: auto;
}

.input-wrapper {
    flex-shrink: 0;
}

.chat-bubble {
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 90%;
}

#mobile-container {
    flex: 1;
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

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
}

.login-input {
    width: 100%;
    padding: 12px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    box-sizing: border-box;
}

.login-button,
.register-button {
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

.login-button:hover,
.register-button:hover {
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

.reset-password-button:hover {
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
    background-color: #1976D2;
    color: white;
}

.reset-password-submit:hover {
    background-color: #1565C0;
    transform: translateY(-1px);
}

.reset-password-submit:active {
    transform: translateY(1px);
}

.modal-close {
    background-color: #E0E0E0;
    color: #333;
}

.modal-close:hover {
    background-color: #BDBDBD;
    color: #000;
    transform: translateY(-1px);
}

.modal-close:active {
    transform: translateY(1px);
}

.full-size {
    width: 100%;
    height: 100%;
    display: block;
}

.widgets-loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.widgets-loading {
    background: #1e1e1e;
    color: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #333;
    border-top: 4px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

.retry-button {
    margin-top: 15px;
    padding: 10px 20px;
    background-color: #162D5D;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.retry-button:hover {
    background-color: #315297;
}
</style>