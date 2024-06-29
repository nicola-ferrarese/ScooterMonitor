<template>
  <header class="header">
    <div class="container" :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">
        <button v-if="!isAuthenticated" class="toggle-button" @click="navigateToLogin">Log In</button>
        <button v-if="!isAuthenticated" class="toggle-button" @click="navigateToSignUp">Sign Up</button>
        <button v-if="isAuthenticated" class="toggle-button" @click="logout">Log Out</button>
        <button v-if="isAuthenticated" class="toggle-button" @click="showTripViewList()">Stats</button>
        <TripViewList v-if="showPopup" :visible="showPopup" :general="showPopup" @close="showPopup = false" />

    </div>
  </header>
</template>

<script>
import {computed, ref, watch} from 'vue';
import { useRouter } from 'vue-router';
import TripViewList from './TripViewListComponent.vue';
import { mapActions, mapGetters } from "vuex";
import { useStore } from 'vuex';
export default {
  name: 'HeaderComponent',
  components: {
    TripViewList
  },
  setup() {
    const router = useRouter();
    const isAuthenticated = ref(!!localStorage.getItem('token'));
    const store = useStore();
    const navigateToLogin = () => {
      router.push('/login');
    };

    const navigateToSignUp = () => {
      router.push('/signup');
    };

    const navigateToMap = () => {
      router.push('/map');
    };

    const logout = () => {
      localStorage.removeItem('token');
      isAuthenticated.value = false;
      store.dispatch('clearUserData')
    };

    const showPopup = ref(false);
    const showTripViewList  = () => {
      showPopup.value = true;
    };
    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property

    // watch isDarkMode for changes
    watch(isDarkMode, (newVal) => {
      console.log('Dark mode changed to:', newVal);
    });
    return {
      isDarkMode,
      isAuthenticated,
      navigateToLogin,
      navigateToSignUp,
      navigateToMap,
      logout,
      showPopup,
      showTripViewList
    };
  },
  methods: {
  ...mapActions(['fetchUserData', 'clearUserData']),
    ...mapGetters(['darkMode'])
  },
  watch: {
    '$route'() {
      this.isAuthenticated = !!localStorage.getItem('token');
    },
  }
};
</script>

<style scoped>


.container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  gap: 10px;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: flex-start;
  }
  nav {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

reference light-mode.btn in scss
