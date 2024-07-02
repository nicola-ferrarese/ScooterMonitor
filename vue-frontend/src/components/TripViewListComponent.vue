<template>
  <div v-if="visible" class="popup popup-general" id="popup" :class="{ 'popup-general': general, 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">
    <div class="popup-content">
      <h2>Trip Views</h2>
      <div class="controls">
          <h3 @click="sortTrips">
            <label for="sort" class="sort">Sort by:</label>
          </h3>
        <select v-model="sortOption" class="toggle-button" @change="sortTrips">
          <option value="totalDistance">Total Distance</option>
          <option value="date">Date</option>
          <option value="duration">Duration</option>
        </select>
        <button :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" class="toggle-button" @click="toggleOrder">{{ sortOrder === 'asc' ? 'Ascending' : 'Descending' }}</button>
      </div>
      <div class="trip-list">
        <div v-for="trip in sortedTrips" :key="trip.tripId" class="trip-item" :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }">
            <div class="left-column">
              <div class="item-id">
                Scooter: {{ trip.scooterId }}
              </div>
              <div class="item-image">
                <img :src="getImage()" alt="Scooter Image" class="scooter-image">
              </div>
            </div>
            <div class="right-column">
              <div class="item-details">
                Cost: {{ Math.round(trip.totalCost) }} Eur <br>
                Duration: {{ (trip.duration / 1000 / 60).toFixed(0) }} minutes<br>
                Total Distance: {{ (Math.round(trip.totalDistance)/1009).toFixed(2)  }} Km<br>
                Date: {{ new Date(trip.end).toLocaleDateString() }}<br>
                Start Time: {{ new Date(trip.start).toLocaleTimeString() }}<br>
                End Time: {{ new Date(trip.end).toLocaleTimeString() }}<br>
              </div>
            </div>
          </div>
      </div>
      <button @click="closePopup" :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" class="toggle-button">Close</button>
    </div>
  </div>
</template>
<script>
import { ref, computed, watch } from 'vue';
import { io } from 'socket.io-client';
import { useStore } from 'vuex';

export default {
  name: 'TripViewList',
  props: {
    visible: Boolean,
    showPopup: Boolean,
    scooterId: String,
    general: Boolean
  },
  methods: {
    getImage(){
      return require('@/assets/img/lime.webp');
    }
  },
  setup(props, { emit }) {
    const socket = io('http://localhost:3000');
    const trips = ref([]);
    const sortOption = ref('date');
    const sortOrder = ref('desc');
    const store = useStore();

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
            compareA = a.end;
            compareB = b.end;
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
    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property

    watch(isDarkMode, (newVal) => {
      console.log('Dark mode changed to:', newVal);
    });
    return {
      isDarkMode,
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
  position: fixed; /* Position the login form relative to the viewport */
  top: 50%; /* Center the form vertically */
  left: 50%; /* Center the form horizontally */
  transform: translate(-50%, 20%); /* Adjust the position so the center of the form is at the center of the viewport */
  border: #007bff 1px solid;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;

}
.toggle-button{
  margin-top: 10px;
  width: 20vh;
  align-self: flex-end;
}
.popup-content {
  padding: 10px;
  border-radius: 8px;
  width: 66.66vw; /* 2/3 of the viewport width */
  height: 66.66vh; /* 2/3 of the viewport height */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sort {
  margin-right: 10px;
  margin-top: auto;
  margin-bottom: auto;
  font-family: EuclidMedium;
  font-size: 16px;
}
.controls {
  display: flex;
  align-content: center;
  justify-content: flex-end;
  margin-bottom: 5px;
}

.trip-list {
  flex-grow: 1; /* Make the list take up remaining space */
  overflow-y: auto;
  border-radius: 8px
}



.trip-item {
  padding: 10px;
  height: fit-content;
  border-radius: 8px;
  background-color: #f8f9fa;
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.two-column-layout {
  display: flex;
  flex-direction: row;
  gap: 10px;
  /* Customize the height and width of the flexbox table */
  height: 100px;
}

.adjustable-text {
  max-height: 50px;
  font-size: clamp(0.5rem, 1vw, 1rem); /* Adjust the font size based on the viewport width */
  overflow: hidden;
  text-overflow: ellipsis;
}
h1 {
  font-size: 5.9vw;
}
h2 {
  font-size: 3.0vh;
}
h3 {
  font-size: 2.5vh;
}
p {
  font-size: 2vmin;

}
.left-column, .right-column {
  font-size: small;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.left-column {
}
.right-column {
  flex: 1;
}
.item-id {
  background-color: #ffa500; /* adjusted color */
  padding: 10px;
  border-radius: 8px;
}

.item-image {
  height: 10vh;
  background-color: #32cd32; /* adjusted color */
  padding: 10px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.item-details {
  flex:1;
  background-color: #1e90ff; /* adjusted color */
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  height: fit-content;
}

.scooter-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
}
</style>