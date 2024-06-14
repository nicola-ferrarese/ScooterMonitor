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

export default {
  name: 'LoginComponent',
  setup() {
    const username = ref('');
    const password = ref('');
    const message = ref('');
    const router = useRouter();
    // TODO: Implement the login as popup an same applies for sign in
    // TODO: add expiration time for the token
    const login = () => {
      const socket = io('http://localhost:3000');
      socket.emit('login', { username: username.value, password: password.value }, (response) => {
        if (response.success) {
          localStorage.setItem('token', response.token);
          router.push('/map');
        } else {
          message.value = response.message;
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
