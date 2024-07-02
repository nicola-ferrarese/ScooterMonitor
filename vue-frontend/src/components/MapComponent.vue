<template>
  <div id="map" @click="mapClicked"> </div>
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
import { MAP_TOKEN } from '@/assets/secrets';
import {computed, watch} from "vue";
const scooterMap = new Map();

const socket_endpoint = process.env.VUE_APP_SOCKET_ENDPOINT ;
const socket = io(socket_endpoint);

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

    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property
    // watch isDarkMode for changes
    watch(isDarkMode, () => {

      console.log('Dark mode changed to:');

    });
    };
    return {
      store,
      mapClicked,
    };
  },
  data() {
    return {
      router: useRouter(),
      map: null,
      showBottomBar: false,
      selectedScooter: {},
      bottomBarKey: 0,
    };
  },
  computed: {
    ...mapState(['token', 'socket', 'scooterId', "darkMode"]),
    ...mapGetters(['tripId', 'isRiding', 'token', "isAuthenticated"]),
    ...mapActions([ 'updateTripId'])
  },
  watch: {
    showBottomBar(newValue) {
      if (newValue) {
        this.bottomBarKey++;
      }
    },
    darkMode(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.initMap();
        scooterMap.forEach(markerState => {
          markerState.marker.getMarker().addTo(this.map);
        });
        this.addListeners();
        this.setUserScooter();
      }
    },
    token(newVal, oldVal) {
      if (newVal !== oldVal) {
        console.log('token changed');
        if (newVal) {
          this.store.dispatch('fetchUserScooter', newVal);
        }
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
      if (this.map) {
        this.map.remove();
      }
      // Define the map provider based on the darkMode flag
      const mapProvider = this.darkMode
          ? "https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=" + MAP_TOKEN
          : "https://tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token=" + MAP_TOKEN;

      this.map = L.map('map').setView([44.140026, 12.242754], 15);

      L.tileLayer(mapProvider, {
        attribution: '<a href="https://www.jawg.io?utm_medium=map&utm_source=attribution" target="_blank">&copy; Jawg</a> - <a href="https://www.openstreetmap.org?utm_medium=map-attribution&utm_source=jawg" target="_blank">&copy; OpenStreetMap</a>&nbsp;contributors'
      }).addTo(this.map);
    },
    initSocket() {
      socket.on('positionUpdate', this.updateScooterPosition);
      socket.on('tripUpdate', this.updateScooterTrip);
      socket.on('allScooters', this.updateAllScooters);
      socket.emit('requestAllScooters');
    },
    addListeners() {

      this.map.on('dragstart', () => {
        scooterMap.forEach(instance => instance.clicked = false);
        scooterMap.forEach(instance => instance.marker.getMarker().activeFollowMarker(false));
        this.setProperIcons();
        this.showBottomBar = false;
        this.router.push('/');
        this.mapClicked();
      });
      this.map.on('click', () => {
        scooterMap.forEach(instance => instance.clicked = false);
        scooterMap.forEach(instance => instance.marker.getMarker().activeFollowMarker(false));
        this.setProperIcons();
        this.router.push('/');
        this.mapClicked();
      });
      this.map.on('change', () => {
        scooterMap.forEach(instance => instance.clicked = false);
        scooterMap.forEach(instance => instance.marker.getMarker().activeFollowMarker(false));
        this.setProperIcons();
        this.router.push('/');
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
          scooterMap.forEach(markerState => markerState.marker.getMarker().activeFollowMarker(false));
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
      console.log('updateScooterPosition');
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
      // add marker to map

    },
    updateScooterTrip(data) {
      if (!data.id || !data.event) {
        return;
      }
      console.log('[dasasdasd] '+ JSON.stringify(data));
      let markerState = scooterMap.get(data.id);
      if (!markerState) {
        markerState = this.createMarker(data.id, data.start.lat, data.start.lon);
      }

      // Update the tripId in the store
      if(this.store.getters.tripId === data.tripId  ){
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
      console.log('[frontend] setting user scooter')

      //this.store.dispatch('fetchUserScooter', this.token);

      console.log("authenticated: " + this.isAuthenticated);
      if (!this.isAuthenticated) {
        scooterMap.forEach(markerState => {
          markerState.belongsToUser = false;
        });
        return;
      }
      if (!this.store.getters.scooterId || !this.store.getters.isRiding) {
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

