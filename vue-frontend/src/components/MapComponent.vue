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

const actionAnimation = (markers, type) => {
  if(!markers || Object.values(markers).length === 0) {
    console.log('No markers found')
    return
  }
  Object.values(markers).forEach(marker => {
    if(marker.getMarker()) {
      marker.getMarker().setIcon(greenIcon);
      marker = marker.getMarker()
      //type === 'hidePolylines' && item.instance.hidePolylines(hidePolylines)
      //type === 'hideMarkers' && item.instance.getMarker().hideMarker(hideMarker)
      type === 'stopAll' && marker.stop()
      type === 'disableAllFollowMarker' && marker.activeFollowMarker(false)
      //type === 'activeAnimMarker' && item.instance?.getMarker()?.activeAnimate(animateMarker)
      //type === 'activeAnimPolyline' && item.instance?.getCurrentPolyline()?.activeAnimate(animatePolyline)
    }
  });
}
// disable all follow marker when zoom and drag on map


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
    // add event listener for zoom and drag
    this.addListerners()
    this.map.on('click', this.logClick);
  },
  methods: {
    logClick(e) {
      console.log('Clicked on map at:', e.latlng);
    },
    initMap() {
      // Initialize the map
      this.map = L.map('map').setView([ 44.14, 12.23], 13);  // Coordinates for London
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
    addListerners() {
      this.map.on('click', () => {
        console.log('click');
        actionAnimation(this.markers, 'disableAllFollowMarker')
      });
      this.map.on('dragstart', () => {
        console.log('Drag start');
        actionAnimation(this.markers, 'disableAllFollowMarker')
      });
    },
    updateScooterMarker(data) {
      console.log('Updating scooter marker');
      console.log(data);
      if (!data.id || !data.lat || !data.lon) {
        console.error('Invalid data received:', data);
        return;
      }

      const id = data.id;
      const lat = data.lat;
      const lon = data.lon;
      if (this.markers[id]) {
        //this.markers[id].setLatLng([lat, lon]);
        console.log('Moving marker to ' + lon + ', ' + lat);
        this.markers[id].addMoreLine([lat, lon], {
          animatePolyline: true,
          hidePolylines: true,
          duration: 3000,
          maxLengthLines: 6,
        });

        //this.markers[id].getCurrentPolyline()

      } else {
        // If the marker doesn't exist, create it and add it to the map
        //const marker = L.marker([lat, lon]).addTo(this.map);
        const marker = new L.MoveMarker([[lat, lon]],{
          animate: true,
          color: 'red',
          weight: 5,
          hidePolylines: false,
          duration: 3000,
          removeFirstLines: false,
          maxLengthLines: 6,
        },).addTo(this.map);
        marker.getMarker().setIcon(greenIcon);

        this.markers[id] = marker;
        Object.values(this.markers).forEach((marker) => {
          console.log('Marker:', marker);
          if(marker) {
            marker.getMarker().on('click', () => {
              console.log('Marker clicked');
              actionAnimation(this.markers, 'disableAllFollowMarker')
              marker.getMarker().setIcon(violetIcon);
              marker.getMarker().activeFollowMarker(true)
            });
          }
        });
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

// https://github.com/pointhi/leaflet-color-markers

