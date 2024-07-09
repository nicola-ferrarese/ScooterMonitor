<template @map-click="handleMapClick" >
  <div v-if="visible">
    <div v-if="loading" class="loading" >Loading...</div>
    <div v-else :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" class="popup scooterDetail">
      <p>ID: {{ localScooterData.id }}</p>
      <div v-if="localScooterData.inUse && belongsToUser">

        <p>Total Distance: {{ (Math.round(tripData.totalDistance)/1009).toFixed(2)  }} Km<br></p>
        <p>Trip Duration: {{ tripData.duration }} minutes </p>
        <p>Total Cost: {{ (tripData.totalCost / 140).toFixed(2) }} €<br></p>
        <div v-if="showLoginPrompt">
          Please log in to unlock a scooter.
        </div>
        <div v-else :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">
          <button v-if="userLogged && isRiding && belongsToUser" class="toggle-button" @click="stopRide">Stop Ride</button>
        </div>
      </div>
       <!-- {{userLogged}}
        {{store.getters.isAuthenticated}}
        {{belongsToUser}}
        {{isRiding}}
        {{localScooterData.inUse}} -->
        <button v-if="userLogged && !isRiding && !localScooterData.inUse"  class="toggle-button" @click="unlockScooter">Unlock Scooter</button>


      <button  class="toggle-button"  @click="showTripViewList(localScooterData.id)">Show trip info</button>
      <TripViewList id="detailView"  class="resp"  v-if="showPopup" :visible="showPopup" :scooterId="localScooterData.id" @close="showPopup = false" />
    </div>
  </div>

  <div v-if="errorMessage" class="error">
    {{ errorMessage }}
    <div class="close-error" @click="closeErrorMessage"></div>
  </div>

  <div v-if="showLoginPrompt" class="error">
    Please log in to unlock a scooter.
    <div class="close-error" @click="closeLoginPrompt"></div>
  </div>
</template>

<script>
import io from 'socket.io-client';

import {ref, computed, watch} from 'vue';
import TripViewList from './TripViewListComponent.vue';
import { useStore } from "vuex";

export default {
  name: 'BottomBar',
  components: {
    TripViewList
  },
  props: {

    scooterData: Object
  },
  setup() {
    const showPopup = ref(false);
    const scooterId = ref(null);
    const store = useStore();
    const visible = ref(true);

    const showTripViewList  = (id) => {
        scooterId.value = id;
        showPopup.value = true;
    };
    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property
    watch(isDarkMode, (newVal) => {
      console.log('Dark mode changed to:', newVal);
    });
    return {
      store,
      visible,
      isDarkMode,
      showPopup,
      showTripViewList,
      scooterId
    };
  },
  data() {
    const socket_endpoint = process.env.VUE_APP_SOCKET_ENDPOINT;
    return {
      socket:  io(socket_endpoint),
      localScooterData: {},
      tripData: {
        totalDistance: '',
        totalCost: '',
        duration: ''
      },
      loading: true,
      errorMessage: '',
      showLoginPrompt: false,
    };
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.updateUserLogged);
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.fetchScooterData();
      }
    },
    scooterData: {
      handler(newVal) {
        this.localScooterData = { ...newVal }; // Create a local copy of the prop
        if (newVal) {
          this.fetchScooterData();
        }
      },
      immediate: true,
      deep: true
    },


  },
  computed: {

    userLogged() {
      return  this.store.getters.isAuthenticated;
      //const isNotRiding = !store.getters.isRiding;
    },
    isRiding() {
      const isRiding = this.store.getters.isRiding;
      return isRiding;
    },
    belongsToUser() {

      console.log("store " + this.store.getters.scooterId)
      console.log("clicked " + this.localScooterData.id)
      if (!this.store.getters.scooterId) {
        return false;
      }
      return this.store.getters.scooterId === this.localScooterData.id;

    }
  },
  mounted() {
    //window.addEventListener('storage', this.updateUserLogged);


    // Listen for real-time updates
    this.socket.on('updateScooterData', (updatedData) => {
      if (updatedData.id === this.localScooterData.id) {
        this.tripData = updatedData.trip || {};
        this.localScooterData = {
          ...this.localScooterData,
          ...updatedData
        };
        this.loading = false;
      }
    });
    this.loading = false;
    this.socket.on('tripUpdate', (tripData) => {
      if (tripData.event === 'end') {
        this.localScooterData.inUse = false;
        this.tripData = {};
      }
    });
  },
  methods: {
    handleMapClick() {
      this.visible = false;
    },
    updateUserLogged() {

      this.userLogged = !!sessionStorage.getItem('token');
    },
    closeErrorMessage() {
      this.errorMessage = '';
    },
    closeLoginPrompt() {
      this.showLoginPrompt = false;
    },
    fetchScooterData() {
      if (this.localScooterData) {
        this.loading = true;
        console.log("Fetching scooter data..." + this.localScooterData.id);
        this.socket.emit('fetchScooterData', this.localScooterData.id, (response) => {
          if (response.error) {
            console.error("Error fetching scooter data:", response.error);
          } else {
            console.log("Scooter data fetched.", response);
            this.tripData = response.trip || {};
            this.localScooterData = response || {};
            if(this.localScooterData){
              this.localScooterData = { ...this.localScooterData,
                                        belongsToUser: this.belongsToUser, }
            }
            console.log("Local scooter data:", this.localScooterData);
            this.loading = false;

          }
        });
      }
    },
    unlockScooter() {if (!sessionStorage.getItem('token')) {
        this.showLoginPrompt = true;
      } else {
      console.log("Scooter unlocked.");
      // TODO send start command, and update the localScooterData
      console.log("Starting ride for scooter ID:", this.localScooterData.id);

      this.socket.emit('startRide', {
        scooter_id: this.localScooterData.id,
        token: sessionStorage.getItem('token')
      }, (response) => {
        if (response.error) {
          console.error("Error starting ride:", response.error);
          if (response.status !== null) {
            if (response.status === "Already riding") {
              this.errorMessage = 'You are already riding a scooter. Please stop the current ride first.';
            } else {
              this.errorMessage = response.error;
            }
          }
          else {
            console.error("Error starting ride:", response.error);
            sessionStorage.removeItem('token');
            this.errorMessage = 'Session expired. Please log in again.';
          }
          // display error message


        } else {
          console.log("Ride started successfully.", response);

          //this.store.dispatch('fetchUserScooter', sessionStorage.getItem('token'));
          this.store.commit('setScooterId', this.localScooterData.id);
          this.store.commit('setRiding', true);
        }
      });
    }
    },
    stopRide() {
      console.log("Ride stopped.");
      this.socket.emit('stopRide', {
        scooter_id: this.localScooterData.id,
        token: sessionStorage.getItem('token')
      }, (response) => {
        if (response.error) {
          console.error("Error stopping ride:", response.error);
        } else {
          console.log("Ride stopped successfully.", response);
          // Update local state as needed
          this.localScooterData.inUse = false;
          this.store.commit('setScooterId', null);

        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import '@/assets/scss/globals';

.scooterDetail {
  border: #007bff 1px solid;
  bottom: 10px;
  right: 10px;
  width: 50%;

}

@media (max-width: 768px) {
  #detailView {
    transform: translate(-10%, -0%);
    left: 16vw;
  }
  .scooterDetail {
    bottom: 10px;
    right: 10px;
    width: 50%;

  }
    .resp {
     right: 50vh;
      width: 80vw;
    }
    .toggle-button{
      max-width: 16vw;
      margin: 2px;
      padding: 0px;
      width: 100vw;
      right: -50vw
    }

    .toggle-button{
      width: 20vw;
    }



}


/*
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  max-width: 100%;
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  z-index: 1000;
}

.loading {
  text-align: center;
}

@media (min-width: 768px) {
  .bottom-bar {
    width: 66.66%;
    left: 50%;
    transform: translateX(-50%);
  }
}

.scooter-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.error {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background-color: #f8d7da;
  color: #721c24;
  padding: 20px;
  border: 1px solid #f5c6cb;
  border-radius: 5px;
  text-align: center;
  width: 80%;
  max-width: 500px;
}

.close-error {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  background-color: #bf2222;
  border-radius: 50%;
  cursor: pointer;
}

button {
  margin-top: 1rem;
}*/

</style>