<script setup lang="ts">
import { useSidebar } from '#imports'

const rightSidebar = useSidebar('nc-right-sidebar')
const leftSidebar = useSidebar('nc-left-sidebar')

const isSidebarsOpen = computed({
  get: () => rightSidebar.isOpen.value || leftSidebar.isOpen.value,
  set: (value) => {
    rightSidebar.toggle(value)
    leftSidebar.toggle(value)
  },
})
</script>

<template>
  <a-tooltip>
    <!-- todo: i18n -->
    <template #title> {{ isSidebarsOpen ? 'Full width' : 'Exit full width' }}</template>
    <div
      v-e="['c:toolbar:fullscreen']"
      class="nc-fullscreen-btn cursor-pointer flex align-center self-center px-2 py-2 mr-2"
      @click="isSidebarsOpen = !isSidebarsOpen"
    >
      <IcTwotoneWidthFull v-if="isSidebarsOpen" class="text-gray-300" />
      <IcTwotoneWidthNormal v-else class="text-gray-300" />
    </div>
  </a-tooltip>
</template>
