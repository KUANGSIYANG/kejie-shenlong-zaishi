<template>
  <div class="right-sidebar">
    <GameStats />
    <AISuggestions />
  </div>
</template>

<script setup>
import GameStats from './GameStats.vue'
import AISuggestions from './AISuggestions.vue'
</script>

<style scoped>
.right-sidebar {
  width: 380px;
  min-width: 350px;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: transparent;
}
</style>
