<template>
  <header @map-click="handleMapClick" style="display: flex; justify-content: flex-end; align-content: center" class="header stats" id="stats" :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">

    <div v-if = "isAuthenticated" class="username">Welcome, {{username}}</div>
    <div class="header stats" :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">
        <button v-if="!isAuthenticated" class="toggle-button stats" @click="navigateToLogin">Log In</button>
        <button v-if="!isAuthenticated" class="toggle-button stats" @click="navigateToSignUp">Sign Up</button>
        <button v-if="isAuthenticated" class="toggle-button stats" @click="logout">Log Out</button>
        <button v-if="isAuthenticated" class="toggle-button stats" @click="showTripViewList()">Stats</button>
        <TripViewList v-if="showPopup" :visible="showPopup" :general="showPopup" @close="showPopup = false" />

    </div>
  </header>
</template>

<script>
import {computed, ref, watch} from 'vue';
import { useRouter} from 'vue-router';
import TripViewList from './TripViewListComponent.vue';
import { mapActions, mapGetters } from "vuex";
import { useStore } from 'vuex';
import {usage} from "browserslist";
export default {
  name: 'HeaderComponent',
  computed: {
    mapClicked() {
      return this.$store.state.mapClicked;
    },
    username() {
      return this.$store.getters.user;
    },
    usage() {
      return usage
    }
  },
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
    handleMapClick() {

      this.showPopup = false;
    },
    ...mapActions(['fetchUserData', 'clearUserData']),
    ...mapGetters(['darkMode']),


  },
  watch: {
    mapClicked(newVal, oldVal) {
      if (newVal !== oldVal && newVal === true) {
        this.handleMapClick();
        this.$store.commit('setMapClicked', false); // reset the state
      }
    },
    '$route'() {
      this.isAuthenticated = !!localStorage.getItem('token');
    },
  }
};
</script>

<style scoped>


.username {
  margin-top: auto;
  margin-bottom: auto;
}

@media (max-width: 768px) {
  .stats{
    margin: 2px;
    padding: 1px;
  }
  nav {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
