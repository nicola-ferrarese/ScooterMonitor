<template>
  <header class="header">
    <div class="container">
      <div class="logo" @click="navigateToMap">Scooter Monitoring</div>
      <nav>
        <button v-if="!isAuthenticated" class="btn" @click="navigateToLogin">Log In</button>
        <button v-if="!isAuthenticated" class="btn" @click="navigateToSignUp">Sign Up</button>
        <button v-if="isAuthenticated" class="btn" @click="logout">Log Out</button>
      </nav>
    </div>
  </header>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'HeaderComponent',
  setup() {
    const router = useRouter();
    const isAuthenticated = ref(!!localStorage.getItem('token'));

    const navigateToLogin = () => {
      router.push('/login');
    };

    const navigateToSignUp = () => {
      router.push('/signup');
    };

    const navigateToMap = () => {
      router.push('/map');
    };

    const logout = () => {
      localStorage.removeItem('token');
      isAuthenticated.value = false;
      router.push('/login');
    };

    return {
      isAuthenticated,
      navigateToLogin,
      navigateToSignUp,
      navigateToMap,
      logout
    };
  },
  watch: {
    '$route'() {
      this.isAuthenticated = !!localStorage.getItem('token');
    },

  }
};
</script>

<style scoped>
.header {
  background-color: #333;
  color: white;
  padding: 10px 0;
}
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
.logo {
  font-size: 1.5em;
  cursor: pointer;
}
nav {
  display: flex;
  gap: 10px;
}
.btn {
  background-color: #444;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}
.btn:hover {
  background-color: #555;
}
@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: flex-start;
  }
  nav {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
