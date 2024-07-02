<template>
  <div id="app">
    <header  :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" class="header title" >Scooter Monitoring
        <button class=" toggle-button" @click="toggleTheme">{{ buttonText }}</button>

    </header>
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
import {useStore}   from "vuex";

export default {
  name: 'App',
  components: {
    HeaderCmp,
    MapComponent,
  },
  setup() {
    const store = useStore();
    //store.dispatch('fetchUserData', localStorage.getItem('token'));
    //set the theme in the store
    return {
      store
    };
    },
  data() {
    return {
      isDarkMode: false,
    };
  },
  computed: {
    buttonText() {
      return this.isDarkMode ? 'Light Mode' : 'Dark Mode';
    }
  },
  methods: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
      this.store.dispatch('darkMode', this.isDarkMode);
      document.body.style.backgroundColor = this.isDarkMode
          ? this.$scss.darkPrimaryColor
          : this.$scss.lightPrimaryColor;
      document.body.style.color = this.isDarkMode
          ? this.$scss.darkSecondaryColor
          : this.$scss.lightSecondaryColor;
    }
  }
}
</script>



<style lang="scss">
@import '@/assets/scss/globals';

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.title{
  font-family: 'EuclidSemiBold';
  font-size: 4vh;
  margin-left: 20px
}

</style>