<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { api } = useApi()

async function deleteCache() {
  try {
    await api.utils.cacheDelete()
    // Deleted Cache Successfully
    message.info(t('msg.info.deletedCache'))
  } catch (e: any) {
    message.error(e.message)
  }
}
</script>

<template>
  <a-tooltip placement="bottom">
    <template #title>
      <span> Delete Cache </span>
    </template>
    <mdi-delete class="cursor-pointer" @click="deleteCache" />
  </a-tooltip>
</template>
