<template>
  <div id="map" style="height: 500px;"></div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import "l.movemarker";

// Fixing icon paths
delete L.Icon.Default.prototype._getIconUrl;

var greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

var redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

var violetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});



// Icons initialization and setting as before

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const scooterMap = new Map();


L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


const setProperIcons = () => {
  scooterMap.forEach(markerState => {
    const marker = markerState.marker;
    let icon = markerState.inUse ? redIcon : greenIcon;
    icon = markerState.clicked ? violetIcon : icon;
    marker.getMarker().setIcon(icon);
  });
}

export default {
  name: 'MapComponent',
  data() {
    return {
      map: null,
      markers: {} // This remains to store the marker references
    };
  },
  mounted() {
    this.initMap();
    this.initSocket();
    this.addListeners();

  },
  methods: {

    initMap() {
      this.map = L.map('map').setView([44.14, 12.23], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    },
    initSocket() {
      const socket = io('http://localhost:3000');
      console.log('Connected to socket server.');
      socket.on('scooterUpdate', this.updateScooterMarker);
    },
    addListeners() {
      this.map.on('dragstart', () => {
        scooterMap.forEach(markerState => markerState.clicked = false);
        setProperIcons();
      });
    },
    updateScooterMarkers(data) {
      if (data.event === 'update' || data.event === 'start'){
        scooterMap.get(data.id).inUse = true;
      }
      if (data.event === 'end'){
        scooterMap.get(data.id).inUse = false;
      }
    },
    updateScooterMarker(data) {
      console.log('Received data:', data);

      if (!data.id || !data.lat || !data.lon) {
          if (data.event){
            this.updateScooterMarkers(data)
            return;
          }
          return;
        }

      const markerState = scooterMap.get(data.id) || {
        marker: new L.MoveMarker([[data.lat, data.lon]], {
          animate: true,
          duration: 3000,
        }).addTo(this.map),
        inUse: false,
        clicked: false
      };
      console.log('Marker state:', markerState);
      console.log(scooterMap);

      // Update position
      markerState.marker.addMoreLine([data.lat, data.lon], {
        animate: true,
        duration: 3000,
      });



      // Click event
      markerState.marker.getMarker().off('click').on('click', () => {
        markerState.clicked = !markerState.clicked; // Toggle clicked state
        setProperIcons();
        markerState.marker.bindPopup(`Marker ${data.id} clicked.`).openPopup();
      });
      // Update map and state
      scooterMap.set(data.id, markerState);
      setProperIcons();
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
