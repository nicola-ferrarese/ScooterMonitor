<template>
  <div class="login">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <div>
        <label for="username">Username:</label>
        <input type="text" v-model="username" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" v-model="password" required />
      </div>
      <button type="submit">Log In</button>
    </form>
    <p>{{ message }}</p>
  </div>
</template>

<script>
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';

export default {
  name: 'LoginComponent',
  setup() {
    const username = ref('');
    const password = ref('');
    const message = ref('');
    const router = useRouter();
    let store = useStore(); // Access the Vuex store
    // TODO: Implement the login as popup an same applies for sign in
    // TODO: add expiration time for the token
    const login = () => {
      const socket = io('http://localhost:3000');
      socket.emit('login', { username: username.value, password: password.value }, (response) => {
        if (response.success) {
          localStorage.setItem('token', response.token);
          if (!store){
            console.log('store is null');
            store = useStore();
          }
          store.dispatch('setToken', { // Dispatch an action to the store
            //username: response.data.username,
            token: response.token,
            //tripId: response.data.tripId,
            //isRiding: response.data.isRiding,
            //scooterId: response.data.scooterId,
          });
          router.push('/');
        } else {
          message.value = response.message;
          localStorage.removeItem('token');
        }
      });
    };

    return {
      username,
      password,
      message,
      login
    };
  }
};
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 0 auto;
}
</style>
