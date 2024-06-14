<template>
  <div class="bottom-bar" v-if="visible">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="scooter-info">
      <p>ID: {{ localScooterData.id }}</p>
      <div v-if="localScooterData.inUse">
        <p>Trip Distance: {{ tripData.totalDistance }}</p>
        <p>Trip Cost: {{ tripData.totalCost }}</p>
        <button @click="stopRide">Stop Ride</button>
      </div>
      <div v-else>
        <button @click="unlockScooter">Unlock Scooter</button>
      </div>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  name: 'BottomBar',
  props: {
    visible: Boolean,
    scooterData: Object
  },
  data() {
    return {
      socket: null,
      localScooterData: {},
      tripData: {
        totalDistance: '',
        totalCost: ''
      },
      loading: true
    };
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
    }
  },
  mounted() {
    this.socket = io('http://localhost:3000');

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
  },
  methods: {
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
    unlockScooter() {
      console.log("Scooter unlocked.");
      // TODO send start command, and update the localScooterData
      console.log("Starting ride for scooter ID:", this.localScooterData.id);

      this.socket.emit('startRide', {
        scooter_id: this.localScooterData.id,
        token: localStorage.getItem('token')
      }, (response) => {
        if (response.error) {
          console.error("Error starting ride:", response.error);
        } else {
          console.log("Ride started successfully.", response);
          // Update local state as needed
        }
      });
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

<style scoped>
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

button {
  margin-top: 1rem;
}
</style>
