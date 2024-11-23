<template>
    <div>
        <!-- Tabs Row -->
        <header class="tabs-row" v-if="!isMobile">
            <div class="tabs-content">
                <a href="#" class="tab-link live-tv" @click.prevent="selectTab('live-tv')"><span>Live TV</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('markets')"><span>Markets</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('economics')"><span>Economics</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('industries')"><span>Industries</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('tech')"><span>Tech</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('politics')"><span>Politics</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('businessweek')"><span>Businessweek</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('opinion')"><span>Opinion</span></a>
                <a href="#" class="tab-link" @click.prevent="selectTab('more')"><span>More</span></a>
            </div>
        </header>

        <!-- Hamburger Menu for Mobile -->
        <!-- <header class="mobile-header" v-else>
            <div class="hamburger" @click="toggleMenu">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <nav class="nav" :class="{ open: isMenuOpen }">
                <div class="tabs-content">
                    <a href="#" class="tab-link live-tv" @click.prevent="selectTab('live-tv')"><span>Live TV</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('markets')"><span>Markets</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('economics')"><span>Economics</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('industries')"><span>Industries</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('tech')"><span>Tech</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('politics')"><span>Politics</span></a>
                    <a href="#" class="tab-link"
                        @click.prevent="selectTab('businessweek')"><span>Businessweek</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('opinion')"><span>Opinion</span></a>
                    <a href="#" class="tab-link" @click.prevent="selectTab('more')"><span>More</span></a>
                </div>
            </nav>
        </header> -->

        <!-- Tab Content -->
        <div class="tab-content">
            <RssWall :visible="selectedTab === 'markets'" />
        </div>
    </div>
</template>

<script>
import RssWall from "./RssWall.vue";

export default {
    name: "AppTabsRow",
    components: {
        RssWall,
    },
    data() {
        return {
            isMobile: window.innerWidth <= 768,
            isMenuOpen: false,
            selectedTab: "websites",
        };
    },
    methods: {
        selectTab(tabName) {
            this.selectedTab = tabName;

            // Disable vertical scrolling when "markets" tab is selected
            if (tabName === "markets") {
                document.body.style.overflowY = "hidden";
            } else {
                document.body.style.overflowY = ""; // Restore default scrolling
            }

            this.isMenuOpen = false; // Close the menu after selecting a tab
        },
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        },
        handleResize() {
            this.isMobile = window.innerWidth <= 768;
            if (!this.isMobile) {
                this.isMenuOpen = false; // Ensure the menu is closed on desktop
            }
        },
    },
    mounted() {
        window.addEventListener("resize", this.handleResize);
    },
    beforeUnmount() {
        window.removeEventListener("resize", this.handleResize);
    },
};
</script>

<style scoped>
/* Tabs row styles */
.tabs-row {
    display: flex;
    background-color: #333;
    padding: 10px 0;
    width: 100vw;
    justify-content: center;
}

.tabs-content {
    max-width: 90%;
    max-width: 1400px;
    width: 100%;
    padding: 0 20px;
    display: flex;
    justify-content: space-around;
}

.tab-link {
    position: relative;
    text-decoration: none;
    color: #fff;
    padding: 10px 20px;
    font-size: 14px;
    overflow: hidden;
}

/* Rectangle under the tab on hover */
.tab-link::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    background-color: #555;
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
    z-index: 1;
}

.tab-link:hover::after {
    transform: scaleY(1);
}

.tab-link span {
    position: relative;
    z-index: 2;
}

.tab-link.live-tv {
    color: red;
    font-weight: bold;
}

.tab-link.live-tv::before {
    content: "•";
    color: red;
    font-size: 14px;
    margin-right: 5px;
    position: relative;
    top: -1px;
}

.tab-link.live-tv::after {
    height: 5px;
    background-color: red;
}

.tab-link.live-tv:hover::after {
    transform: scaleY(1);
}

.tab-content {
    /* padding: 20px; */
    max-width: 1200px;
    margin: 0 auto;
}

/* Hamburger Menu */
.mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #333;
    padding: 10px 20px;
}

.hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
}

.hamburger span {
    background-color: #fff;
    height: 3px;
    width: 30px;
    border-radius: 3px;
    transition: all 0.3s ease;
}

/* Open menu animation */
.hamburger.open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.open span:nth-child(2) {
    opacity: 0;
}

.hamburger.open span:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
}

/* Mobile Navigation */
.nav {
    display: none;
    flex-direction: column;
    background-color: #222;
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    z-index: 100;
    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    transform: translateY(-20px);
    opacity: 0;
}

.nav.open {
    display: flex;
    transform: translateY(0);
    opacity: 1;
}

@media (max-width: 768px) {
    .tabs-row {
        display: none;
    }
}
</style>