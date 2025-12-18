<template>
  <div class="app-shell">
    <div class="background-glow"></div>
    <MainMenu :active-page="activePage" @switch-page="handleSwitchPage" />

    <div v-if="activePage === 'board'" class="main-content">
      <LeftSidebar class="panel glass subtle-scrollbar" />
      <MainView />
      <div class="theory-panel panel glass" :class="{ collapsed: !showTheoryPanel }">
        <button class="toggle-btn" @click="toggleTheoryPanel">
          {{ showTheoryPanel ? '收起' : '展开' }}
        </button>
        <GameTheoryChart v-if="showTheoryPanel" />
      </div>
      <RightSidebar class="panel glass subtle-scrollbar" />
    </div>

    <div v-else class="lab-content">
      <GameTheoryLab @back="handleSwitchPage('board')" />
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
import GameTheoryLab from './pages/GameTheoryLab.vue'

const showTheoryPanel = ref(true)
const activePage = ref('board')

const toggleTheoryPanel = () => {
  showTheoryPanel.value = !showTheoryPanel.value
}

const handleSwitchPage = (page) => {
  activePage.value = page
}
</script>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow: hidden;
}

.background-glow {
  position: fixed;
  inset: 0;
  background: var(--bg-glow);
  pointer-events: none;
  opacity: 0.65;
  z-index: 0;
}

.main-content {
  position: relative;
  display: flex;
  flex: 1;
  gap: 12px;
  padding: 16px 16px 20px;
  min-height: 0;
  z-index: 1;
}

.lab-content {
  position: relative;
  flex: 1;
  z-index: 1;
  padding: 12px 16px 20px;
}

.theory-panel {
  width: 360px;
  min-width: 320px;
  padding: 14px 14px 14px 20px;
  margin-left: 4px;
  position: relative;
  transition: width 0.2s ease, min-width 0.2s ease, padding 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.theory-panel.collapsed {
  width: 34px;
  min-width: 34px;
  padding: 12px 6px;
  justify-content: center;
  align-items: center;
}

.toggle-btn {
  position: absolute;
  left: -11px;
  top: 10px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
  transition: all 0.2s;
}

.toggle-btn:hover {
  transform: translateY(-1px);
  border-color: var(--accent-color);
}
</style>
