<template>
  <button class="toggle-button" @click="$emit('toggle-theme')">{{ buttonText }}</button>
</template>

<script>
export default {
  name: 'ButtonComponent',
  props: {
    buttonText: {
      type: String,
      required: true,
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/assets/scss/components';
</style>
