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