import { createStore } from 'vuex';
import io from 'socket.io-client';

let socket = io('http://localhost:3000');
const store = createStore({
    state: {
        username: null,
        token: localStorage.getItem('token') || null,
        tripId: null,
        isRiding: false,
        socket: socket,
        scooterId: null,
    },
    mutations: {
        setUser(state, user) {
            state.username = user.username;
            state.token = user.token;
            state.tripId = user.tripId;
            state.isRiding = user.isRiding;
            state.scooterId = user.scooterId;
        },
        clearUser(state) {
            state.username = null;
            state.token = null;
            state.tripId = null;
            state.isRiding = false;
        },
        setTripId(state, tripId) {
            state.tripId = tripId;
            state.isRiding = !!tripId;
        },
    },
    actions: {
        fetchUserData({ commit }, token) {
            // Replace with actual API call
            if (!this.socket) {
                this.socket = io('http://localhost:3000');
            }
            this.socket.emit('getData', token, (response) => {
                if (response.success) {
                    commit('setUser', {
                        username: response.data.username,
                        token: token,
                        tripId: response.data.scooter_id,
                        isRiding: !!response.data.scooter_id,
                        scooterId: response.data.scooter_id,
                    });
                } else {
                    commit('clearUser');
                }
            });
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
        getToken: state => state.token,
    },
});

export default store;
