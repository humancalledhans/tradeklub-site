<template>
    <div class="live-tv-layout">
        <!-- Top Left Large Box (2/3 Height of the First Column) -->
        <div class="box-wrapper large">
            <LiveTVBox />
        </div>

        <!-- Bottom Left Small Box (1/3 Height of the First Column) -->
        <div class="box-wrapper medium">
            <LiveTVBox />
        </div>

        <!-- Center Top Box (4/5 Height of Second Column) -->
        <div class="box-wrapper center-large">
            <LiveTVBox />
        </div>

        <!-- Center Bottom Box (1/5 Height of Second Column) -->
        <div class="box-wrapper center-small">
            <LiveTVBox />
        </div>

        <!-- Right Tall Box (Full Height of Third Column) -->
        <div class="box-wrapper tall">
            <LiveTVBox />
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
    /* Default to full viewport height */
}

.live-tv-layout {
    display: grid;
    grid-template-columns: 4fr 2fr 1fr;
    /* 4/7, 2/7, and 1/7 column widths */
    grid-template-rows: 2fr 1fr;
    /* First column split: 2/3 and 1/3 */
    gap: 10px;
    width: 100%;
    height: var(--available-height);
    /* Full available height without scrolling */
    box-sizing: border-box;
    padding: 10px;
}

/* General Box Styling */
.box-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Left Large Box (Top Left, 2/3 of the first column) */
.box-wrapper.large {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
}

/* Left Medium Box (Bottom Left, 1/3 of the first column) */
.box-wrapper.medium {
    grid-column: 1 / 2;
    grid-row: 2 / 3;
}

/* Center Full Box (Second Column) */
.box-wrapper.wide {
    grid-column: 2 / 3;
    grid-row: 1 / 3;
    /* Spans the full height of the middle column */
}

/* Right Tall Box (Third Column) */
.box-wrapper.tall {
    grid-column: 3 / 4;
    grid-row: 1 / 3;
    /* Spans the full height of the third column */
}
</style>