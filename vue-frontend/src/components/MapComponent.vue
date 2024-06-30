<template>
  <div id="map" @click="mapClicked"> </div>
  <button v-if="showBottomBar" class="back-button" @click="hideBottomBar">Back</button>
  <BottomBar
      v-if="showBottomBar"
      :visible="showBottomBar"
      :scooterData="selectedScooter"
      :key="bottomBarKey"
  />
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import "l.movemarker";
import BottomBar from './BottomBar.vue';
import { redIcon, greenIcon, violetIcon, orangeIcon } from '../assets/icons.js';
import { mapActions, mapGetters, mapState } from 'vuex';
import {useStore} from "vuex";
import {useRouter} from "vue-router";

const scooterMap = new Map();
const socket = io('http://localhost:3000');

export default {
  name: 'MapComponent',
  components: {
    BottomBar,
  },
  setup() {
    const store = useStore();
    if (localStorage.getItem('token')) {
      const token = localStorage.getItem('token');


      console.log('[Setup] setting token, ' + token);
      store.dispatch('setToken', { token: token });
      store.dispatch('fetchUserScooter', token);
    }
    const mapClicked = () => {
      store.commit('setMapClicked', true);

    };
    return {
      store,
      mapClicked,
    };
  },
  data() {
    return {
      map: null,
      showBottomBar: false,
      selectedScooter: {},
      bottomBarKey: 0,
    };
  },
  computed: {
    ...mapState(['token', 'socket', 'scooterId']),
    ...mapGetters(['tripId', 'isRiding', 'token', "isAuthenticated"]),
    ...mapActions([ 'updateTripId'])
  },
  watch: {
    showBottomBar(newValue) {
      if (newValue) {
        this.bottomBarKey++; // Increment the key to force a reload of the BottomBar component
      }
    },
  },
  mounted() {
    console.log('mounted');
    this.initMap();
    this.addListeners();
    this.initSocket();
    this.setProperIcons();
  },
  methods: {
    initMap() {
      this.map = L.map('map').setView([44.14, 12.23], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);
    },
    initSocket() {
      socket.on('positionUpdate', this.updateScooterPosition);
      socket.on('tripUpdate', this.updateScooterTrip);
      socket.on('allScooters', this.updateAllScooters);
      socket.emit('requestAllScooters');
    },
    addListeners() {
      const router = useRouter();
      this.map.on('dragstart', () => {
        scooterMap.forEach(instance => instance.clicked = false);
        scooterMap.forEach(instance => instance.marker.getMarker().activeFollowMarker(false));
        this.showBottomBar = false;
        this.setProperIcons();
        router.push('/');
        this.mapClicked();
      });
      this.map.on('click', () => {
        this.setProperIcons();
        router.push('/');
        this.mapClicked();
      });
      this.map.on('change', () => {
        this.setProperIcons();
        router.push('/');
        this.mapClicked();
      });
    },
    createMarker(id, lat, lon) {
      const marker = new L.MoveMarker([[lat, lon]], {
        animate: true,
        duration: 3000,
      }).addTo(this.map);

      marker.getMarker().on('click', () => {
        const markerState = scooterMap.get(id);
        if (markerState) {
          scooterMap.forEach(markerState => markerState.clicked = false);
          markerState.clicked = !markerState.clicked;
          this.setProperIcons();
          marker.getMarker().activeFollowMarker(true);
          this.showBottomBar = true;
          this.selectedScooter = {
            id: id,
            lat: lat,
            lon: lon,
            inUse: markerState.inUse,
          };
        }
      });
      marker.hidePolylines(true);

      scooterMap.set(id, {
        marker: marker,
        inUse: false,
        clicked: false,
        belongsToUser: false,
      });

      return scooterMap.get(id);
    },
    updateScooterPosition(data) {
      if(this.isAuthenticated){
        this.setUserScooter();
      }
      let markerState = scooterMap.get(data.id);
      if (!markerState) {
        markerState = this.createMarker(data.id, data.location.latitude, data.location.longitude);
        scooterMap.set(data.id, markerState);
      }
      markerState.marker.addMoreLine([data.location.latitude, data.location.longitude], {
        animate: true,
        duration: 3000,
      });
      if (data.inUse) {
        markerState.inUse = data.inUse;
      }
      this.setProperIcons();
    },
    updateScooterTrip(data) {
      if (!data.id || !data.event) {
        return;
      }

      let markerState = scooterMap.get(data.id);
      if (!markerState) {
        markerState = this.createMarker(data.id, data.start.lat, data.start.lon);
      }

      // Update the tripId in the store
      if(this.store.getters.tripId !== data.tripId){
        this.store.dispatch('updateTripId', data.tripId);
      }

      // Update scooterMap
      if (data.event === 'update' || data.event === 'start') {
        markerState.inUse = true;
      } else if (data.event === 'end') {
        markerState.inUse = false;
        markerState.belongsToUser = false;
      }

      this.setProperIcons();
    },
    updateAllScooters(data) {
      if (!data) {
        return;
      }
      data.forEach(scooter => {
        this.updateScooterPosition(scooter);
      });
    },
    hideBottomBar() {
      this.showBottomBar = false;
      this.selectedScooter = null;
    },
    setProperIcons() {
      this.setUserScooter();
      scooterMap.forEach(markerState => {
        const marker = markerState.marker;
        let icon = markerState.inUse ? redIcon : greenIcon;
        if (markerState.belongsToUser) {
          icon = orangeIcon;
        }
        icon = markerState.clicked ? violetIcon : icon;
        marker.getMarker().setIcon(icon);
      });
    },
    setUserScooter() {
      //use vuex store getter
      console.log('[frontend] setting user scooter')

      this.store.dispatch('fetchUserScooter', this.token);

      console.log("authenticated: " + this.isAuthenticated);
      if (!this.isAuthenticated) {
        scooterMap.forEach(markerState => {
          markerState.belongsToUser = false;
        });
        return;
      }
      if (!this.scooterId) {
          console.log('scooterId is null');
          this.store.dispatch('updateTripId', null);
          scooterMap.forEach(markerState => {
            if(!markerState){
              console.log('markerState is null');
            }
            markerState.belongsToUser = false;
          });
      }

      if (this.scooterId) {
        const markerState = scooterMap.get(this.scooterId);

        if (markerState) {
          markerState.belongsToUser = true;
        }
      }

    },
  },
};
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 0;
}

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

.back-button {
  position: fixed; /* Use fixed positioning to place it relative to the screen */
  top: 130px; /* Adjust as necessary */
  left: 10px; /* Adjust as necessary */
  z-index: 11;
  background-color: #fff;
  border: 1px solid #ccc;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 50%; /* Make the button round */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  width: 40px; /* Set a fixed width */
  height: 40px; /* Set a fixed height */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
</style>

