<script setup lang="ts">
import { dateFormats } from '~/utils'

interface Props {
  value: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits(['update:value'])
const vModel = useVModel(props, 'value', emit)

if (!vModel.value.meta?.date_format) {
  if (!vModel.value.meta) vModel.value.meta = {}
  vModel.value.meta.date_format = dateFormats[0]
}
</script>

<template>
  <a-form-item label="Date Format">
    <a-select v-model:value="vModel.meta.date_format">
      <a-select-option v-for="(format, i) of dateFormats" :key="i" :value="format">
        <div class="flex flex-row items-center">
          <div class="text-xs">
            {{ format }}
          </div>
        </div>
      </a-select-option>
    </a-select>
  </a-form-item>
</template>
