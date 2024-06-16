<template>
  <div v-if="showForm" class="signup">
    <h2 >Sign Up</h2>
    <form  @submit.prevent="signUp">
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
  </div>
  <p v-if="message" class="message fade-out">{{ message }}</p>

</template>

<script>
import { ref } from 'vue';
import { io } from 'socket.io-client';

export default {
  name: 'SignUpComponent',
  setup() {
    const username = ref('');
    const password = ref('');
    const message = ref('');
    const showForm = ref(true);

    const signUp = () => {
      console.log('signUp');
      const socket = io('http://localhost:3000');
      socket.emit('signUp', { username: username.value, password: password.value }, (response) => {
        message.value = response.message;
        if (response.success) {
          showForm.value = false;
        }
        setTimeout(() => {
          message.value = '';
        }, 10000); // Clear the message after 10 seconds
      });
    };

    return {
      username,
      password,
      message,
      signUp,
      showForm
    };
  },
};
</script>

<style scoped>
.signup {
  max-width: 400px;
  margin: 0 auto;
}

@keyframes fadeout {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.fade-out {
  animation-name: fadeout;
  animation-duration: 10s;
  animation-fill-mode: forwards;
}

.message {
  position: absolute;
  z-index: 3;
  /* Adjust the top and left properties as needed to position the message */
  top: 50px;
  left: 50px;
  background-color: #f8d7da;
}


.signup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  background-color: #f8d7da;
  color: #721c24;
  padding: 20px;
  border: 1px solid #f5c6cb;
  border-radius: 5px;
  text-align: center;
  width: 80%;
  max-width: 500px;
}

.close-error {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  background-color: #bf2222;
  border-radius: 50%;
  cursor: pointer;
}
</style>
