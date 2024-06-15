<template>
  <div id="map" ></div>
  <button v-if="showBottomBar" class="back-button" @click="hideBottomBar">Back</button>
  <BottomBar
      :visible="showBottomBar"
      :scooterData="selectedScooter"
  />
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import "l.movemarker";
import BottomBar from './BottomBar.vue'; // Import the BottomBar component


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

var orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


const scooterMap = new Map();
const socket = io('http://localhost:3000');

const setProperIcons = () => {
  setUserScooter();
  scooterMap.forEach(markerState => {
    const marker = markerState.marker;
    let icon = markerState.inUse ? redIcon : greenIcon;
    if (markerState.belongsToUser) {
      console.log('Setting orange icon');
      icon = orangeIcon;
    }
    icon = markerState.clicked ? violetIcon : icon;
    marker.getMarker().setIcon(icon);
  });

}

const setUserScooter = () => {
  if (!localStorage.getItem('token')) {
    return;
  }
  socket.emit('getData', localStorage.getItem('token'), (response) => {
    if (response.success) {
      console.log('User data:', response.data);
      if (response.data) {
        const markerState = scooterMap.get(response.data.scooter_id);
        console.log('User scooter:', markerState);
        if (markerState) {
          scooterMap.set(response.data.scooter_id, {
            ...markerState,
            belongsToUser: true
          });
        }
      }
    }

  });
}

export default {
  name: 'MapComponent',
  components: {
    BottomBar
  },
  data() {
    return {
      map: null,
      markers: {},
      showBottomBar: false,
      selectedScooter: {}
    };
  },
  mounted() {
    this.initMap();
    this.addListeners();
    this.initSocket();
  },
  methods: {
    initMap() {
      this.map = L.map('map').setView([44.14, 12.23], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    },
    initSocket() {

      console.log('Connected to socket server.');
      socket.on('positionUpdate', this.updateScooterPosition);
      socket.on('tripUpdate', this.updateScooterTrip);
      socket.on('allScooters', this.updateAllScooters );
      // Request all scooters from the server
      socket.emit('requestAllScooters');
    },
    addListeners() {
      this.map.on('dragstart', () => {
        scooterMap.forEach(instance => instance.clicked = false);
        scooterMap.forEach(instance => instance.marker.getMarker().activeFollowMarker(false));
        this.showBottomBar = false;
        this.$router.push('/header');
        setProperIcons();
      });
      this.map.on('click', () => {
        this.$router.push('/header');
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
          marker.getMarker().activeFollowMarker(true)
          // TODO retrieve the path and print it on map
          this.showBottomBar = true;
          this.selectedScooter = {
            id: id,
            lat: lat,
            lon: lon,
            inUse: markerState.inUse
          };
        }
      });
      marker.hidePolylines(true)

      scooterMap.set(id, {
        marker: marker,
        inUse: false,
        clicked: false,
        belongsToUser: false
      });

      return scooterMap.get(id);
    },
    updateScooterPosition(data) {
      console.log('Received position data:', data);

      let markerState = scooterMap.get(data.id);
      let scooter = {id : data.id, lat : data.location.latitude, lon : data.location.longitude, inUse : data.inUse};

      if (!markerState) {
        markerState = this.createMarker(scooter.id, scooter.lat, scooter.lon);
        //console.log('Created new marker:', markerState);
        scooterMap.set(data.id, markerState);
      }

      // Update position
      console.log('Moving marker:', markerState);
      markerState.marker.addMoreLine([scooter.lat, scooter.lon], {
        animate: true,
        duration: 3000,
      });
      if (data.inUse) {
        markerState.inUse = data.inUse;
      }


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
        console.log('Trip ended:', data);
        markerState.inUse = false;
        markerState.belongsToUser = false;
      }

      setProperIcons();
    },
    updateAllScooters(data) {
      console.log('Received all scooters data:', data);

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
    }
  }
};


</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
  position: relative;
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
  z-index: 1100;
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

