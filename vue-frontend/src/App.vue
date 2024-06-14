<template>
  <div id="app">
    <HeaderCmp />
    <div class="main-content">
      <router-view />
      <MapComponent />
    </div>
  </div>
</template>

<script>

import MapComponent from "@/components/MapComponent.vue";
import HeaderCmp from "@/components/HeaderCmp.vue";

export default {
  name: 'App',
  components: {
    HeaderCmp,
    MapComponent
  }
}
</script>

<style>
body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f0f0f0;
}
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>