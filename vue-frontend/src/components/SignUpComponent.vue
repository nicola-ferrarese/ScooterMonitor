<template>
  <div class="signup">
    <h2>Sign Up</h2>
    <form @submit.prevent="signUp">
      <div>
        <label for="username">Username:</label>
        <input type="text" v-model="username" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <input type="password" v-model="password" required />
      </div>
      <button type="submit">Sign Up</button>
    </form>
    <p>{{ message }}</p>
  </div>
</template>

<script>
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useRouter } from 'vue-router';

export default {
  name: 'SignUpComponent',
  setup() {
    const username = ref('');
    const password = ref('');
    const message = ref('');
    const router = useRouter();

    const signUp = () => {
      console.log('signUp');
      const socket = io('http://localhost:3000');
      socket.emit('signUp', { username: username.value, password: password.value }, (response) => {
        message.value = response.message;
        if (response.success) {
          router.push('/login');
        }
      });
    };

    return {
      username,
      password,
      message,
      signUp
    };
  }
};
</script>

<style scoped>
.signup {
  max-width: 400px;
  margin: 0 auto;
}
</style>
