<template>
  <div :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" class="login">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <div>
        <label for="username">Username: </label>
        <input type="text" v-model="username" required />
      </div>
      <div>
        <label for="password">Password:  </label>
        <input type="password" v-model="password" required />
      </div>
      <button class="toggle-button" type="submit">Log In</button>
    </form>
    <p>{{ message }}</p>
  </div>
</template>

<script>
import {computed, ref, watch} from 'vue';
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
    // TODO: add expiration time for the tokenR
    const login = () => {
      const socket = io('http://localhost:3000');
      socket.emit('login', { username: username.value, password: password.value }, (response) => {
        if (response.success) {
          localStorage.setItem('token', response.token);
          if (!store){
            console.log('store is null');
            store = useStore();
          }
          //store.dispatch('setToken', { token: response.token });
          store.dispatch('fetchUserScooter', response.token);
          //store.dispatch('fetchUserData', response.token);
          router.push('/');
        } else {
          message.value = response.message;
          localStorage.removeItem('token');
          store.dispatch('clearUserData');
        }
      });
    };
    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property

    // watch isDarkMode for changes
    watch(isDarkMode, (newVal) => {
      console.log('Dark mode changed to:', newVal);
    });
    return {
      isDarkMode,
      username,
      password,
      message,
      login
    };
  },

};
</script>

<style lang="scss" scoped>
@import "@/assets/scss/globals";
form {
  display: flex;
  flex-direction: column;
  align-items: stretch; /* This will make the input fields take up the full width of the form */
}

button {
  align-self: center; /* This will center the button horizontally */
  margin-top: 20px; /* Add some space above the button */
}

form div {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px; /* Add some space below each input field */
}

form div label {
  flex: 1;
  text-align: right;
  margin-right: 10px; /* Add some space to the right of the label */
}

form div input {
  flex: 2;
}
</style>
