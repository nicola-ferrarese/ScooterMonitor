<template>
  <div :class="{ 'dark-mode': isDarkMode, 'light-mode': !isDarkMode }" v-if="showForm" class="form-popup">
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
      <button class="toggle-button" type="submit">Sign Up</button>
    </form>
    <p v-if="message" class="message fade-out">{{ message }}</p>
  </div>


</template>

<script>
import {ref, computed, watch} from 'vue';
import { io } from 'socket.io-client';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'SignUpComponent',
  setup() {
    const username = ref('');
    const password = ref('');
    const message = ref('');
    const showForm = ref(true);
    const store = useStore();
    const router = useRouter();
    const socket_endpoint = process.env.VUE_APP_SOCKET_ENDPOINT
    const signUp = () => {
      console.log('signUp');
      const socket = io(socket_endpoint);
      console.log('username:', username.value);
      socket.emit('signUp', { username: username.value, password: password.value }, (response) => {
        message.value = response.message;
        console.log('response:', response);
        if (response.success) {
          message.value = 'User registered successfully';
          setTimeout(() => {
            router.push('/')
          }, 5000);
        }
      });
    };
    const isDarkMode = computed(() => store.getters.darkMode); // make isDarkMode a computed property
    watch(isDarkMode, (newVal) => {
      console.log('Dark mode changed to:', newVal);
    });
    return {
      isDarkMode,
      password,
      username,
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
  animation-duration: 3s;
  animation-fill-mode: forwards;
}

.message {
  transition: all 0.3s ease; /* Add a transition */
  text-align: center; /* Center the text */
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
