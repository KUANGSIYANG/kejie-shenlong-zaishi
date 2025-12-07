<template>
  <div class="right-sidebar">
    <GameStats />
    <AISuggestions />
    <GameTheoryChart />
  </div>
</template>

<script setup>
import GameStats from './GameStats.vue'
import AISuggestions from './AISuggestions.vue'
import GameTheoryChart from './GameTheoryChat.vue'
</script>

<style scoped>
.right-sidebar {
  width: 380px;
  min-width: 350px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
