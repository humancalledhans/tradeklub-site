<template>
    <header class="header">
        <div class="header-content">
            <!-- Logo -->
            <div class="logo">TradeKlub</div>

            <!-- Hamburger Menu -->
            <div class="hamburger" @click="toggleMenu" :class="{ open: isMenuOpen }">
                <span></span>
                <span></span>
                <span></span>
            </div>

            <!-- Overlay -->
            <div class="overlay" :class="{ active: isMenuOpen }" @click="closeMenu"></div>

            <!-- Mobile Navigation -->
            <nav class="nav" :class="{ open: isMenuOpen }">
                <div class="tabs-content">
                    <!-- Call closeMenu in a wrapper function -->
                    <router-link to="/live-tv" class="tab-link live-tv" @click="handleLinkClick">
                        <span>Live TV</span>
                    </router-link>
                    <router-link to="/markets" class="tab-link" @click="handleLinkClick">
                        <span>Markets</span>
                    </router-link>
                    <router-link to="/economics" class="tab-link" @click="handleLinkClick">
                        <span>Economics</span>
                    </router-link>
                    <router-link to="/industries" class="tab-link" @click="handleLinkClick">
                        <span>Industries</span>
                    </router-link>
                    <router-link to="/tech" class="tab-link" @click="handleLinkClick">
                        <span>Tech</span>
                    </router-link>
                    <router-link to="/politics" class="tab-link" @click="handleLinkClick">
                        <span>Politics</span>
                    </router-link>
                    <router-link to="/businessweek" class="tab-link" @click="handleLinkClick">
                        <span>Businessweek</span>
                    </router-link>
                    <router-link to="/opinion" class="tab-link" @click="handleLinkClick">
                        <span>Opinion</span>
                    </router-link>
                    <router-link to="/more" class="tab-link" @click="handleLinkClick">
                        <span>More</span>
                    </router-link>
                </div>
            </nav>
        </div>
    </header>
</template>

<script>
export default {
    name: "AppHeader",
    data() {
        return {
            isMenuOpen: false, // Tracks if the mobile menu is open
        };
    },
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
            document.body.style.overflow = this.isMenuOpen ? "hidden" : ""; // Disable/enable scrolling
        },
        closeMenu() {
            this.isMenuOpen = false; // Close the menu
            document.body.style.overflow = ""; // Re-enable scrolling
        },
        handleLinkClick() {
            // Handles link clicks by closing the menu
            this.closeMenu();
        },
    },
};
</script>


<style scoped>
/* General Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Full-width header */
.header {
    width: 100%;
    background-color: #000;
    color: #fff;
    padding: 10px 0;
    position: relative;
    display: flex;
    justify-content: center;
    z-index: 2000;
    /* Ensure header is above overlay */
}

/* Header Content */
.header-content {
    width: 100%;
    max-width: 1400px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    position: relative;
    z-index: 2001;
    /* Ensure header content is clickable */
}

/* Logo */
.logo {
    font-size: 36px;
    font-weight: bold;
    color: #fff;
}

/* Hamburger Menu */
.hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
    position: relative;
    z-index: 2002;
    /* Ensure hamburger is above overlay */
}

.hamburger span {
    background-color: #fff;
    height: 3px;
    width: 30px;
    border-radius: 3px;
    transition: all 0.3s ease;
}

/* Rotate hamburger lines on menu open */
.hamburger.open span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.open span:nth-child(2) {
    opacity: 0;
}

.hamburger.open span:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
}

/* Overlay to freeze background */
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    /* Semi-transparent background */
    z-index: 1000;
    /* Ensure it's below the header */
    display: none;
    pointer-events: none;
    /* Pass pointer events to underlying elements */
}

.overlay.active {
    display: block;
    pointer-events: all;
    /* Activate only when needed */
}

/* Mobile Navigation */
.nav {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #111;
    z-index: 1500;
    padding: 20px;
    border-top: 1px solid #444;
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
    /* Add a slight scale effect along with translation */
    transition: opacity 0.4s ease, transform 0.4s ease;
    /* Smoother transition */
    pointer-events: none;
    /* Prevent interaction when hidden */
}

.nav.open {
    opacity: 1;
    transform: scale(1) translateY(0);
    /* Reset scale and translation */
    pointer-events: all;
    /* Allow interaction */
}

.tabs-content {
    display: flex;
    flex-direction: column;
    /* Stack items vertically */
    align-items: flex-start;
    /* Align items to the left */
    gap: 15px;
    /* Add spacing between items */
    padding: 0;
    width: 100%;
}


/* Rectangle Hover Effect */
.tab-link {
    position: relative;
    text-decoration: none;
    color: #fff;
    padding: 10px 20px;
    font-size: 16px;
    width: 100%;
    overflow: hidden;
    z-index: 0;
    transition: background-color 0.3s ease, color 0.3s ease;
}

.tab-link::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100%;
    background-color: #555;
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.3s ease;
    z-index: -1;
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
    content: '•';
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

/* Responsive Styles */
@media (max-width: 768px) {
    .hamburger {
        display: flex;
    }
}
</style>