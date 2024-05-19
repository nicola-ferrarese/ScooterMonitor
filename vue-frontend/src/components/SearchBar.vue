<template>
  <div class="search-bar">
    <div class="search-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>
    </div>
    <input type="text" placeholder="Search..." />
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  background-color: #f5f5f5; /* Light grey background */
  padding: 5px 10px;
  border-radius: 25px; /* Fully rounded borders */
  max-width: 50%; /* Max width for larger screens */
  width: 100%; /* Full width by default */
  margin: 10px auto /* Centered on the left */
}

.search-bar input {
  border: none;
  outline: none;
  padding: 10px;
  width: 100%;
  font-size: 16px;
  background-color: transparent; /* Ensure input background matches the search bar */
}

.search-icon svg {
  height: 20px;
  width: 20px;
  margin-right: 10px; /* Space between icon and input field */
}

/* Media query for mobile devices */
@media (max-width: 768px) {
  .search-bar {
    max-width: 100%; /* Full width on smaller screens */
  }
}
</style>
