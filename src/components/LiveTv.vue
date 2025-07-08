<template>
    <div>
        <!-- If user is logged in, show the Live TV page -->
        <div class="live-tv-layout">
            <!-- First Column -->
            <div class="column first-column">
                <!-- Top Large Box (2/3 Height of First Column) -->
                <div class="row-tv">
                    <div class="box-left">
                        Tradeklub Television
                    </div>
                    <div class="tv-box-wrapper large" style="position:relative;">
                        <BroadcasterView 
                            role="viewer" 
                            ref="liveStreamViewer" 
                            class="full-size"
                            :is-authenticated="isUserAuthenticated"
                            @request-login="redirectToLoginPage" 
                        />
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
                                <LiveStreamViewer 
                                    :width="parentWidth" 
                                    :height="parentHeight" 
                                    role="viewer"
                                    :is-authenticated="isUserAuthenticated"
                                    @request-login="redirectToLoginPage" 
                                    ref="liveStreamViewer" 
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
                <div class="scroll-container" 
                    ref="scrollContainer" 
                    @mouseenter="onMouseEnterScrollContainer"
                    @mouseleave="onMouseLeaveScrollContainer">
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
            widgetLoadingStates: {},
            scrollPaused: false,
            widgetInitQueue: [],
            isProcessing: false,
        };
    },
    computed: {
        isUserAuthenticated() {
            // Check both component's user state and sessionStorage
            const sessionUser = sessionStorage.getItem('user');
            return !!(this.user || sessionUser);
        },
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
        async login() {
            const auth = getAuth();
            try {
                const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
                this.user = userCredential.user;
                sessionStorage.setItem('user', JSON.stringify(this.user));
                this.firstTimeLogin = false;
            } catch (error) {
                console.log("error 99231", error);
                console.error("Login Error:", error.message);
                alert("Login failed. Please check your credentials.");
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
        
        redirectToLoginPage() {
            console.log('Login requested from child component');
            // Store current path for redirect after login
            sessionStorage.setItem('redirectAfterLogin', this.$route.fullPath);
            // Redirect to login page
            this.$router.push('/login');
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
            console.log('🚀 Starting auto scroll...', { scrollPaused: this.scrollPaused });
            
            // ⭐ FIX: Don't check scrollPaused here, let the caller control it
            // The old logic was: if (this.scrollPaused) return; ❌
            
            // Clear any existing animation frame first
            if (this.scrollInterval) {
                console.log('⚠️ Clearing existing scroll interval');
                cancelAnimationFrame(this.scrollInterval);
                this.scrollInterval = null;
            }

            const container = this.$refs.scrollContainer;
            if (!container) {
                console.error('❌ Scroll container not found');
                return;
            }

            let scrollSpeed = 0.5;
            let cumulativeScroll = 0;
            // let frameCount = 0;

            const scroll = () => {
                // frameCount++;
                
                // ⭐ FIX: Check scrollPaused inside the animation loop, not at start
                if (this.scrollPaused || this.isProcessing) {
                    this.scrollInterval = requestAnimationFrame(scroll);
                    return;
                }

                // Health check logging
                // if (frameCount % 300 === 0) {
                //     console.log(`🔄 Scroll health: frame ${frameCount}, paused: ${this.scrollPaused}, processing: ${this.isProcessing}`);
                // }

                // Check if container still exists
                if (!container || !container.parentNode) {
                    console.error('❌ Container no longer exists, stopping scroll');
                    return;
                }

                cumulativeScroll += scrollSpeed;

                if (cumulativeScroll >= 1) {
                    const scrollAmount = Math.floor(cumulativeScroll);
                    container.scrollTop += scrollAmount;
                    cumulativeScroll -= scrollAmount;
                }

                // Check if we need to cycle widgets
                const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
                
                if (isAtBottom) {
                    console.log('📍 Reached bottom, cycling widgets...');
                    this.cycleWidgets().catch(error => {
                        console.error('❌ Error in cycleWidgets:', error);
                        this.isProcessing = false;
                    });
                }

                this.scrollInterval = requestAnimationFrame(scroll);
            };

            console.log('✅ Auto scroll animation started');
            scroll();
        },

    async cycleWidgets() {
        console.log('🔄 Starting widget cycle...');
        
        if (this.isProcessing) {
            console.log('⚠️ Already processing, skipping cycle');
            return;
        }
        
        this.isProcessing = true;
        // const startTime = Date.now();

        try {
            const container = this.$refs.scrollContainer;
            const gridContainer = container?.querySelector(".grid-container");
            
            if (!container || !gridContainer) {
                console.error('❌ Container or grid container not found');
                return;
            }

            const firstWidget = gridContainer.firstElementChild;
            if (!firstWidget) {
                console.error('❌ No first widget found');
                return;
            }

            console.log(`📊 Widgets before cycle: ${gridContainer.children.length}`);

            // Create new widget first
            const clonedWidget = firstWidget.cloneNode(true);
            const symbolIndex = (this.currentSymbolIndex++) % this.widgetSymbols.length;
            const symbol = this.widgetSymbols[symbolIndex];

            console.log(`➕ Adding new widget with symbol: ${symbol} (index: ${symbolIndex})`);

            // Add to DOM
            gridContainer.appendChild(clonedWidget);

            // ⭐ FIX: Add timeout to widget initialization
            const initPromise = this.initializeTradingViewWidgetForClone(clonedWidget, symbol);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Widget initialization timeout')), 5000)
            );

            try {
                await Promise.race([initPromise, timeoutPromise]);
                console.log(`✅ Widget initialized: ${symbol}`);
            } catch (error) {
                console.warn(`⚠️ Widget initialization failed/timeout: ${symbol}`, error);
                // Continue anyway - don't let one widget break the cycle
            }

            // ⭐ FIX: Reduced wait time to prevent stalling
            await new Promise(resolve => setTimeout(resolve, 50));

            // Adjust scroll position
            const widgetHeight = firstWidget.offsetHeight + 10;
            const oldScrollTop = container.scrollTop;
            container.scrollTop = Math.max(0, container.scrollTop - widgetHeight);
            
            console.log(`📏 Adjusted scroll: ${oldScrollTop} -> ${container.scrollTop} (height: ${widgetHeight})`);

            // Remove the old widget
            if (gridContainer.contains(firstWidget)) {
                gridContainer.removeChild(firstWidget);
                console.log('➖ Removed old widget');
            }

            // console.log(`📊 Widgets after cycle: ${gridContainer.children.length}`);
            // console.log(`⏱️ Cycle completed in ${Date.now() - startTime}ms`);

        } catch (error) {
            console.error('❌ Error cycling widgets:', error);
            
            // ⭐ FIX: Reset scroll position if something goes wrong
            const container = this.$refs.scrollContainer;
            if (container) {
                container.scrollTop = Math.max(0, container.scrollTop - 50);
            }
        } finally {
            this.isProcessing = false;
            console.log('🏁 Widget cycle processing flag reset');
        }
    },

    stopAutoScroll() {
        console.log('🛑 Stopping auto scroll...');
        
        if (this.scrollInterval) {
            cancelAnimationFrame(this.scrollInterval);
            this.scrollInterval = null;
            console.log('✅ Animation frame cancelled');
        }
    },

    onMouseEnterScrollContainer() {
        console.log('🖱️ Mouse entered scroll container - pausing scroll');
        this.scrollPaused = true;
    },

    onMouseLeaveScrollContainer() {
        console.log('🖱️ Mouse left scroll container - resuming scroll');
        this.scrollPaused = false;
        
        // ⭐ FIX: Don't restart the entire animation, just unpause
        // The animation loop is still running, just unpaused
        
        // Only restart if the animation has actually stopped
        if (!this.scrollInterval) {
            console.log('🔄 Animation stopped, restarting...');
            this.startAutoScroll();
        }
    },


    // ⭐ NEW: Method to restart scrolling if it gets stuck
    restartScrolling() {
        console.log('🔄 Restarting scrolling...');
        this.stopAutoScroll();  // Stop animation
        this.scrollPaused = false;  // Unpause
        this.isProcessing = false;  // Reset processing
        
        // Small delay to ensure cleanup
        setTimeout(() => {
            this.startAutoScroll();
        }, 100);
    },

    // ⭐ NEW: Health check method to detect stuck scrolling
    checkScrollHealth() {
        const container = this.$refs.scrollContainer;
        if (!container) return;
        
        // Store last scroll position
        if (!this.lastScrollTop) this.lastScrollTop = 0;
        if (!this.scrollStuckCount) this.scrollStuckCount = 0;
        
        // Check if scroll position hasn't changed
        if (container.scrollTop === this.lastScrollTop && !this.scrollPaused && !this.isProcessing) {
            this.scrollStuckCount++;
            console.log(`⚠️ Scroll might be stuck (count: ${this.scrollStuckCount})`);
            
            if (this.scrollStuckCount > 10) { // 10 seconds of no movement
                console.log('🚨 Scroll appears stuck, restarting...');
                this.restartScrolling();
                this.scrollStuckCount = 0;
            }
        } else {
            this.scrollStuckCount = 0;
        }
        
        this.lastScrollTop = container.scrollTop;
    },

    // ⭐ ENHANCED: Better error handling for widget initialization
    async initializeTradingViewWidgetForClone(clonedElement, symbol) {
        const widgetContainer = clonedElement.querySelector(".tradingview-widget-container");

        if (!widgetContainer) {
            throw new Error("Widget container not found");
        }

        // Check if already initialized
        const existingSymbol = widgetContainer.getAttribute("data-symbol");
        if (existingSymbol === symbol) {
            console.log(`♻️ Widget already initialized for ${symbol}`);
            return;
        }

        // Set loading state
        const widgetId = `widget-${Date.now()}-${Math.random()}`;
        this.widgetLoadingStates[widgetId] = 'loading';

        try {
            // Clear and prepare container
            widgetContainer.innerHTML = '<div class="widget-loading">Loading...</div>';
            widgetContainer.setAttribute("data-symbol", symbol);
            widgetContainer.setAttribute("data-widget-id", widgetId);

            // Wait a bit to ensure DOM is ready
            await this.$nextTick();

            // ⭐ FIX: Add timeout to script loading
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
            script.async = true;

            // Create a promise that resolves when script loads or times out
            const loadPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Script load timeout for ${symbol}`));
                }, 3000);

                script.onload = () => {
                    clearTimeout(timeout);
                    this.widgetLoadingStates[widgetId] = 'loaded';
                    console.log(`✅ Widget script loaded: ${symbol}`);
                    resolve();
                };

                script.onerror = () => {
                    clearTimeout(timeout);
                    this.widgetLoadingStates[widgetId] = 'error';
                    reject(new Error(`Script load failed for ${symbol}`));
                };
            });

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

            // Wait for script to load
            await loadPromise;

        } catch (error) {
            console.error(`❌ Widget initialization failed for ${symbol}:`, error);
            this.widgetLoadingStates[widgetId] = 'error';
            widgetContainer.innerHTML = `<div class="widget-error">Failed to load ${symbol}</div>`;
            throw error; // Re-throw to be caught by caller
        }
    },
        pauseScrolling() {
            console.log('⏸️ Pausing scrolling (method call)');
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
            try {
                this.user = JSON.parse(storedUser);
                console.log('Restored user from session:', this.isUserAuthenticated);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                sessionStorage.removeItem('user'); // Clean up invalid data
            }
        }

        await this.$nextTick();

        try {
            this.initializeRssWidget();
            this.updateChatDimensions();

            if (this.isMobile()) {
                this.calculateMobileDimensions();
            }

            console.log("Initializing main TradingView widgets...");
            await this.initializeTradingViewWidget();
            await this.initializeTradingViewEventsWidget();
            await this.initializeTradingViewMiniChartWidgets();

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (this.$refs.scrollContainer) {
                console.log("Starting preload clones...");
                await this.preloadClones();

                await new Promise(resolve => setTimeout(resolve, 500));

                console.log("Starting auto-scroll...");
                this.startAutoScroll();
            } else {
                console.error("Scroll container is not ready yet.");
            }

        } catch (error) {
            console.error("Error during component initialization:", error);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');

        // MODIFIED: Instead of showing overlay, redirect to login page after 10 seconds
        if (this.$route.path === '/live-tv') {
            setTimeout(() => {
                if (!authParam || authParam !== '23901:kwpDFLQWK9102882913') {
                    if (!this.user) {
                        console.log("10-second preview ended for live-tv, redirecting to login...");
                        this.redirectToLoginPage();
                    }
                }
            }, 10000);
        }
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
}
</style>