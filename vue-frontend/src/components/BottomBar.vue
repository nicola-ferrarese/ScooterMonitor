<template>
  <div class="box--centered" v-if="visible">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="scooter-info">
      <p>ID: {{ localScooterData.id }}</p>
      <div v-if="localScooterData.inUse">
        <p>Trip Distance: {{ tripData.totalDistance }}</p>
        <p>Trip Cost: {{ tripData.totalCost }}</p>
        <p>Trip Duration: {{ tripData.duration }} minutes </p>
        <div v-if="showLoginPrompt">
          Please log in to unlock a scooter.
        </div>
        <div v-else>
          <button v-if="userLogged" @click="stopRide">Stop Ride</button>
        </div>
      </div>
      <div v-else>
        <button v-if="userLogged" @click="unlockScooter">Unlock Scooter</button>
      </div>
    </div>
    <div>
      <button @click="showTripViewList(localScooterData.id)">Show Trip Views</button>
      <TripViewList v-if="showPopup" :visible="showPopup" :scooterId="localScooterData.id" @close="showPopup = false" />
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
import { ref } from 'vue';
import TripViewList from './TripViewListComponent.vue';

export default {
  name: 'BottomBar',
  components: {
    TripViewList
  },
  props: {
    visible: Boolean,
    scooterData: Object
  },
  setup() {
    const showPopup = ref(false);
    const scooterId = ref(null);

    const showTripViewList  = (id) => {
        scooterId.value = id;
        showPopup.value = true;
    };
    return {
      showPopup,
      showTripViewList,
      scooterId
    };
  },
  data() {
    return {
      socket:  io('http://localhost:3000'),
      localScooterData: {},
      tripData: {
        totalDistance: '',
        totalCost: '',
        duration: ''
      },
      loading: true,
      errorMessage: '',
      showLoginPrompt: false,
      userLogged: !!localStorage.getItem('token')
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
        if (newVal && newVal.inUse) {
          this.fetchScooterData();
        }
      },
      immediate: true,
      deep: true
    },


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
    updateUserLogged() {
      console.log('User logged:', !!localStorage.getItem('token'));
      this.userLogged = !!localStorage.getItem('token');
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
            this.loading = false;
          }
        });
      }
    },
    unlockScooter() {if (!localStorage.getItem('token')) {
        this.showLoginPrompt = true;
      } else {
      console.log("Scooter unlocked.");
      // TODO send start command, and update the localScooterData
      console.log("Starting ride for scooter ID:", this.localScooterData.id);

      this.socket.emit('startRide', {
        scooter_id: this.localScooterData.id,
        token: localStorage.getItem('token')
      }, (response) => {
        if (response.error) {
          if (response.status !== null) {
            if (response.status === "Already riding") {
              this.errorMessage = 'You are already riding a scooter. Please stop the current ride first.';
              this.$router.push('/map');
            } else {
              this.errorMessage = response.error;
            }
          }
          else {
            console.error("Error starting ride:", response.error);
            localStorage.removeItem('token');
            this.$router.push('/map');
            this.errorMessage = 'Session expired. Please log in again.';
          }
          // display error message


        } else {
          console.log("Ride started successfully.", response);
          // Update local state as needed
        }
      });
    }
    },
    stopRide() {
      console.log("Ride stopped.");
      this.socket.emit('stopRide', {
        scooter_id: this.localScooterData.id,
        token: localStorage.getItem('token')
      }, (response) => {
        if (response.error) {
          console.error("Error stopping ride:", response.error);
        } else {
          console.log("Ride stopped successfully.", response);
          // Update local state as needed
          this.localScooterData.inUse = false;
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import '@/assets/scss/components';
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
}
</style>