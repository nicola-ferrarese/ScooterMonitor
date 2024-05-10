<template>
  <div id="app">
    <search-bar></search-bar>
    <map-component class="flex-grow"></map-component>
  </div>
</template>

<script>
// import HelloWorld from './components/HelloWorld.vue'
import MapComponent from "@/components/MapComponent.vue";
import SearchBar from "@/components/SearchBar.vue";

export default {
  name: 'App',
  components: {
    SearchBar,
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
.flex-grow {
  flex: 1;
}
</style>