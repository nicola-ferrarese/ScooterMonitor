import L from "leaflet";

const greenIcon11 = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon11 = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const violetIcon11 = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const orangeIcon11 = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

//use svg file as icon


const iconUrl = require('@/assets/img/Charging-station-GREEN.svg');
const greenIcon = new L.Icon({
    iconUrl,
    iconSize: [100, 100],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]

});

const redIcon = new L.Icon({
    iconUrl: require('@/assets/img/Charging-station-RED.svg'),
    iconSize: [100, 100],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const orangeIcon = new L.Icon({
    iconUrl: require('@/assets/img/Charging-station-YELLOW.svg'),
    iconSize: [100, 100],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const violetIcon = new L.Icon({
    iconUrl: require('@/assets/img/Charging-station-BLUE.svg'),
    iconSize: [100, 100],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

export { greenIcon, redIcon, violetIcon, orangeIcon, greenIcon11, redIcon11, orangeIcon11, violetIcon11 };