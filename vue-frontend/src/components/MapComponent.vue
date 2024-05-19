<template>
  <div id="map" ></div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import "l.movemarker";

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

const scooterMap = new Map();

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
      markers: {}
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
      socket.on('positionUpdate', this.updateScooterPosition);
      socket.on('tripUpdate', this.updateScooterTrip);
    },
    addListeners() {
      this.map.on('dragstart', () => {
        scooterMap.forEach(markerState => markerState.clicked = false);
        setProperIcons();
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
          setProperIcons();
          //marker.bindPopup(`Marker ${id} clicked.`).openPopup();
        }
      });

      scooterMap.set(id, {
        marker: marker,
        inUse: false,
        clicked: false,
      });

      return scooterMap.get(id);
    },
    updateScooterPosition(data) {
      console.log('Received position data:', data);

      if (!data.id || !data.lat || !data.lon) {
        return;
      }

      let markerState = scooterMap.get(data.id);
      if (!markerState) {
        markerState = this.createMarker(data.id, data.lat, data.lon);
        markerState.inUse = true;
        scooterMap.set(data.id, markerState);
      }

      // Update position
      markerState.marker.addMoreLine([data.lat, data.lon], {
        animate: true,
        duration: 3000,
      });

      setProperIcons();
    },
    updateScooterTrip(data) {
      console.log('Received trip data:', data);

      if (!data.id || !data.event) {
        return;
      }

      let markerState = scooterMap.get(data.id);
      if (!markerState) {
        // create a new marker if the trip update arrives before the position update
        markerState = this.createMarker(data.id, data.start.lat, data.start.lon);
      }


      if (data.event === 'update' || data.event === 'start') {
        markerState.inUse = true;
      } else if (data.event === 'end') {
        markerState.inUse = false;
      }

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
