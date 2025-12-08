<template>
  <div class="app-container">
    <MainMenu />
    <div class="main-content">
      <LeftSidebar />
      <MainView />
      <div class="theory-panel" :class="{ collapsed: !showTheoryPanel }">
        <button class="toggle-btn" @click="toggleTheoryPanel">
          {{ showTheoryPanel ? '‹' : '›' }}
        </button>
        <GameTheoryChart v-if="showTheoryPanel" />
      </div>
      <RightSidebar />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MainMenu from './components/MainMenu.vue'
import MainView from './components/MainView.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import GameTheoryChart from './components/GameTheoryChat.vue'

const showTheoryPanel = ref(true)
const toggleTheoryPanel = () => {
  showTheoryPanel.value = !showTheoryPanel.value
}
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

.theory-panel {
  width: 360px;
  min-width: 320px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  padding: 10px 10px 10px 18px;
  margin-left: 12px;
  position: relative;
  transition: width 0.2s ease, min-width 0.2s ease, margin-left 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.theory-panel.collapsed {
  width: 28px;
  min-width: 28px;
  padding: 10px 4px;
  margin-left: 12px;
}

.toggle-btn {
  position: absolute;
  left: -18px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  padding: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  z-index: 10;
}

.toggle-btn:hover {
  background: var(--bg-secondary);
}
</style>
