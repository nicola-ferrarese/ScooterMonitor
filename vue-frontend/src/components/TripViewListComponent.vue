<template>

    <div v-if="visible" class="popup" id="popup" :class="{ 'popup-general': general }">
    <div class="popup-content">
      <h2>Trip Views</h2>
      <div class="controls">
        <label for="sort">Sort by:</label>
        <select v-model="sortOption" @change="sortTrips">
          <option value="totalDistance">Total Distance</option>
          <option value="date">Date</option>
        </select>
        <button @click="toggleOrder">{{ sortOrder === 'asc' ? 'Ascending' : 'Descending' }}</button>
      </div>
      <div class="trip-list">
        <div v-for="trip in sortedTrips" :key="trip.tripId" class="trip-item">
          <p>Scooter ID: {{ trip.scooterId }}</p>
          <p>Total Distance: {{ trip.totalDistance }}</p>
          <p>Date: {{ new Date(trip.date).toLocaleDateString() }}</p>
        </div>
      </div>
      <button @click="closePopup">Close</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { io } from 'socket.io-client';

export default {
  name: 'TripViewList',
  props: {
    visible: Boolean,
    showPopup: Boolean,
    scooterId: String,
    general: Boolean
  },
  setup(props, { emit }) {
    const socket = io('http://localhost:3000');
    const trips = ref([]);
    const sortOption = ref('date');
    const sortOrder = ref('desc');

    const fetchTrips = () => {

      console.log('Fetching trips for scooter ID:', props.scooterId);
      socket.emit('getTripViews', props.scooterId , (response) => {
        if (response.success) {
          trips.value = response.trips;
        } else {
          console.error('Error fetching trip views:', response.message);
        }
      });

    };

    watch(() => props.scooterId, fetchTrips, { immediate: true });

    const sortedTrips = computed(() => {
      return trips.value.slice().sort((a, b) => {
        let compareA = a[sortOption.value];
        let compareB = b[sortOption.value];

        if (sortOption.value === 'date') {
          compareA = new Date(compareA);
          compareB = new Date(compareB);
        }

        if (sortOrder.value === 'asc') {
          return compareA > compareB ? 1 : -1;
        } else {
          return compareA < compareB ? 1 : -1;
        }
      });
    });

    const sortTrips = () => {
      sortedTrips.value; // Trigger recomputation
    };

    const toggleOrder = () => {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      sortTrips();
    };

    const closePopup = () => {
      emit('close');
    };

    return {
      trips,
      sortOption,
      sortOrder,
      sortedTrips,
      sortTrips,
      toggleOrder,
      closePopup
    };
  }
};
</script>

<style scoped>
#popup.popup-general {
  top: 0;
}
.popup {
  position: fixed;
  z-index: 1;
  top: -45vh;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  color: #721c24;
}

.popup-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 66.66vw; /* 2/3 of the viewport width */
  height: 66.66vh; /* 2/3 of the viewport height */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.trip-list {
  flex-grow: 1; /* Make the list take up remaining space */
  overflow-y: auto;
}

.trip-item {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}

button {
  margin-top: 10px;
}
</style>
