<template>
  <div class="app">
    <header class="app-header">
      <h1>围棋AI - Web前端</h1>
    </header>
    
    <main class="app-main">
      <div class="main-content">
        <div class="board-container">
          <Goban :showCoordinates="true" />
        </div>
        
        <div class="sidebar">
          <ControlPanel />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import Goban from './components/Goban.vue'
import ControlPanel from './components/ControlPanel.vue'

const gameStore = useGameStore()

// 组件卸载时清理
onUnmounted(() => {
  gameStore.quit()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 24px;
  font-weight: 600;
}

.app-main {
  flex: 1;
  padding: 20px;
  background: #f5f5f5;
}

.main-content {
  display: flex;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  align-items: flex-start;
}

.board-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 280px;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
  }
}
</style>


