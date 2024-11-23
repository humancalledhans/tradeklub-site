<template>
    <div class="live-tv-layout">
        <!-- First Column -->
        <div class="column first-column">
            <!-- Top Large Box (2/3 Height of First Column) -->
            <div class="box-wrapper large">
                <LiveTVBox />
            </div>
            <!-- Bottom Small Box (1/3 Height of First Column) -->
            <div class="box-wrapper medium">
                <LiveTVBox />
            </div>
        </div>

        <!-- Second Column -->
        <div class="column second-column">
            <!-- Top Large Box (4/5 Height of Second Column) -->
            <div class="box-wrapper center-large">
                <LiveTVBox />
            </div>
            <!-- Bottom Small Box (1/5 Height of Second Column) -->
            <div class="box-wrapper center-small">
                <LiveTVBox />
            </div>
        </div>

        <!-- Third Column -->
        <div class="column third-column">
            <!-- Full-Height Tall Box -->
            <div class="box-wrapper tall">
                <LiveTVBox />
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
        };
    },
    methods: {
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
    },
    mounted() {
        this.calculateHeights();
        window.addEventListener("resize", this.calculateHeights);
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
    flex: 1;
    /* 1/7 width */
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
</style>