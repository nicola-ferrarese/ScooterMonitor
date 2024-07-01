import { createStore } from 'vuex';
import io from 'socket.io-client';

let socket = io('http://localhost:3000');
const store = createStore({
    state: {
        username: null,
        token: localStorage.getItem('token') || null,
        mapClicked: false,
        isAuthenticated: !!localStorage.getItem('token'),
        tripId: null,
        isRiding: false,
        socket: socket,
        scooterId: null,
        darkMode: false,
    },
    mutations: {
        setUser(state, user) {
            console.log('Setting user: ', user);
            state.username = user.username;
            state.token = user.token;
            state.tripId = user.tripId;
            state.isRiding = user.isRiding;
            state.scooterId = user.scooterId;
        },
        setScooterId(state, scooterId) {
            console.log('Setting scooterId: ', scooterId);
            state.scooterId = scooterId;
        },
        setMapClicked(state, value) {
            state.mapClicked = value;
        },
        setToken(state, data) {
            console.log('Setting token: ', data);
            state.token = data.token;
        },
        clearUser(state) {
            console.log('Clearing user');
            state.username = null;
            state.token = null;
            state.tripId = null;
            state.isRiding = false;
            state.scooterId = null;
        },
        setRiding(state, value) {
            state.isRiding = value;
        },
        setTripId(state, tripId) {
            state.tripId = tripId;
            state.isRiding = !!tripId;
            if(!tripId) {
                state.scooterId = null;
            }
            socket.emit('getScooterId', {tripId: state.tripId, token: state.token} , (response) => {
                console.log('[TRIP ID]ScooterId: ', response);
                if (response){
                    state.scooterId = response.scooterId;
                }

            });
            console.log('Setting tripId: ', tripId);
        },
        darkMode(state) {
            state.darkMode = !state.darkMode;
        }
    },
    actions: {
        setToken({ commit }, data) {
            console.log('Setting token: ', data);
            commit('setToken', data);
        },
        fetchUserScooter({ commit }, token) {
            console.log('Fetching user data ' + token);
            if (!this.socket) {
                this.socket = io('http://localhost:3000');
            }
            this.socket.emit('getData', token, (response) => {
                console.log('Response data: ', response.data);
                console.log('Response message: ', response.message);
                console.log('Response success: ', response.success);
                console.log('isRiding: ', !!response.data.tripId);
                if (response.success) {
                    let user = {
                        username: response.data.user,
                        token: token,
                        tripId: response.data.tripId,
                        isRiding: !!response.data.tripId,
                    };
                    commit('setUser', user);
                    if (response.data.tripId) {
                        commit('setTripId', response.data.tripId);
                    }
                }
                if (response.success && response.data.tripId) {
                    commit('setTripId', response.data.tripId);
                }
                else {
                    console.log('-->No active ride? ' +   response.message);
                }
            });
        },
        darkMode({ commit }) {
            console.log('Dark mode ' + store.state.darkMode);
            commit('darkMode');
        },
        updateTripId({ commit }, tripId) {
            commit('setTripId', tripId);
        },
        clearUserData({ commit }) {
            commit('clearUser');
        }
    },
    getters: {
        isAuthenticated: state => !!state.token,
        user: state => state.username,
        tripId: state => state.tripId,
        isRiding: state => state.isRiding,
        token: state => state.token,
        scooterId: state => state.scooterId,
        darkMode: state => state.darkMode,
    },
});

export default store;
