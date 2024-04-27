<template>
  <div id="map" style="height: 500px;"></div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';

// Fixing icon paths
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default {
  name: 'MapComponent',
  data() {
    return {
      map: null,
      markers: {} // Array to keep track of markers
    };
  },
  mounted() {
    this.initMap();
    this.initSocket();
  },
  methods: {
    initMap() {
      // Initialize the map
      this.map = L.map('map').setView([51.505, -0.09], 13);  // Coordinates for London
      console.log('Map initialized');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors NicoFerraSpacca'
      }).addTo(this.map);
    },
    initSocket() {
      // Initialize the socket connection
      console.log('Connecting to socket.io server');
      const socket = io('http://localhost:3000');
      console.log('Connected to socket.io server');
      socket.on('scooterUpdate', (data) => {
        // Example: Update the marker position
        this.updateScooterMarker(data);
      });
    },
    updateScooterMarker(data) {
      console.log('Updating scooter marker');
      console.log(data);
      if (!data.id || !data.x || !data.y) {
        console.error('Invalid data received:', data);
        return;
      }
      const id = data.id;
      const lat = data.y;
      const lon = data.x;
      if (this.markers[id]) {
        this.markers[id].setLatLng([lat, lon]);

      } else {
        // If the marker doesn't exist, create it and add it to the map
        const marker = L.marker([lat, lon]).addTo(this.map);
        this.markers[id] = marker;
      }
    }
  }
};
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
