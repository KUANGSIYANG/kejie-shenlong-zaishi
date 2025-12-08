<template>
  <div class="main-view">
    <Goban />
  </div>
</template>

<script setup>
import Goban from './Goban.vue'
</script>

<style scoped>
.main-view {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-primary);
  overflow: auto;
  min-height: 0;
  width: 100%;
  padding: 20px;
}
</style>
