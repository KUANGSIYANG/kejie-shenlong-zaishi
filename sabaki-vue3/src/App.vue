<template>
  <div class="app-container">
    <MainMenu />
    <div class="main-content">
      <LeftSidebar />
      <MainView />
      <RightSidebar />
    </div>
  </div>
</template>

<script setup>
import MainMenu from './components/MainMenu.vue'
import MainView from './components/MainView.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #1a1a1a;
  color: #e0e0e0;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
