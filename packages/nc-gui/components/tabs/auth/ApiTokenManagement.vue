<script setup lang="ts">
import type { ApiTokenType } from 'nocodb-sdk'
import { message } from 'ant-design-vue'
import { extractSdkResponseErrorMsg, useClipboard, useI18n } from '#imports'
import KebabIcon from '~icons/ic/baseline-more-vert'
import MdiPlusIcon from '~icons/mdi/plus'
import CloseIcon from '~icons/material-symbols/close-rounded'
import ReloadIcon from '~icons/mdi/reload'
import VisibilityOpenIcon from '~icons/material-symbols/visibility'
import VisibilityCloseIcon from '~icons/material-symbols/visibility-off'
import MdiDeleteOutlineIcon from '~icons/mdi/delete-outline'
import MdiContentCopyIcon from '~icons/mdi/content-copy'

interface ApiToken extends ApiTokenType {
  show?: boolean
}

const { t } = useI18n()

const { $api, $e } = useNuxtApp()

const { project } = $(useProject())

const { copy } = useClipboard()

let tokensInfo = $ref<ApiToken[] | undefined>([])

let showNewTokenModal = $ref(false)

let showDeleteTokenModal = $ref(false)

let selectedTokenData = $ref<ApiToken>({})

const loadApiTokens = async () => {
  if (!project?.id) return

  tokensInfo = await $api.apiToken.list(project.id)
}

const openNewTokenModal = () => {
  showNewTokenModal = true
  $e('c:api-token:generate')
}

const copyToken = (token: string | undefined) => {
  if (!token) return

  copy(token)
  // Copied to clipboard
  message.info(t('msg.info.copiedToClipboard'))

  $e('c:api-token:copy')
}

const generateToken = async () => {
  try {
    if (!project?.id) return

    await $api.apiToken.create(project.id, selectedTokenData)
    showNewTokenModal = false
    // Token generated successfully
    message.success(t('msg.success.tokenGenerated'))
    selectedTokenData = {}
    await loadApiTokens()
  } catch (e: any) {
    message.error(await extractSdkResponseErrorMsg(e))
  }

  $e('a:api-token:generate')
}

const deleteToken = async () => {
  try {
    if (!project?.id || !selectedTokenData.token) return

    await $api.apiToken.delete(project.id, selectedTokenData.token)

    // Token deleted successfully
    message.success(t('msg.success.tokenDeleted'))
    await loadApiTokens()
    showDeleteTokenModal = false
  } catch (e: any) {
    message.error(await extractSdkResponseErrorMsg(e))
  }

  $e('a:api-token:delete')
}

const openDeleteModal = (item: ApiToken) => {
  selectedTokenData = item
  showDeleteTokenModal = true
}

onMounted(() => {
  loadApiTokens()
})
</script>

<template>
  <a-modal
    v-model:visible="showNewTokenModal"
    :closable="false"
    width="28rem"
    centered
    :footer="null"
    wrap-class-name="nc-modal-generate-token"
  >
    <div class="relative flex flex-col h-full">
      <a-button type="text" class="!absolute top-0 right-0 rounded-md -mt-2 -mr-3" @click="showNewTokenModal = false">
        <template #icon>
          <CloseIcon class="flex mx-auto" />
        </template>
      </a-button>
      <!-- Generate Token -->
      <div class="flex flex-row justify-center w-full -mt-1 mb-3">
        <a-typography-title :level="5">{{ $t('title.generateToken') }}</a-typography-title>
      </div>
      <!-- Description -->
      <a-form
        ref="form"
        :model="selectedTokenData"
        name="basic"
        layout="vertical"
        class="flex flex-col justify-center space-y-6"
        no-style
        autocomplete="off"
        @finish="generateToken"
      >
        <a-input v-model:value="selectedTokenData.description" :placeholder="$t('labels.description')" />

        <!-- Generate -->
        <div class="flex flex-row justify-center">
          <a-button type="primary" html-type="submit">
            {{ $t('general.generate') }}
          </a-button>
        </div>
      </a-form>
    </div>
  </a-modal>
  <a-modal
    v-model:visible="showDeleteTokenModal"
    :closable="false"
    width="28rem"
    centered
    :footer="null"
    wrap-class-name="nc-modal-delete-token"
  >
    <div class="flex flex-col h-full">
      <div class="flex flex-row justify-center mt-2 text-center w-full text-base">This action will remove this API Token</div>
      <div class="flex mt-6 justify-center space-x-2">
        <a-button @click="showDeleteTokenModal = false"> {{ $t('general.cancel') }} </a-button>
        <a-button type="primary" danger @click="deleteToken()"> {{ $t('general.confirm') }} </a-button>
      </div>
    </div>
  </a-modal>
  <div class="flex flex-col px-10 mt-6">
    <div class="flex flex-row justify-end">
      <div class="flex flex-row space-x-1">
        <a-button size="middle" type="text" @click="loadApiTokens()">
          <div class="flex flex-row justify-center items-center caption capitalize space-x-1">
            <ReloadIcon class="text-gray-500" />
            <div class="text-gray-500">{{ $t('general.reload') }}</div>
          </div>
        </a-button>
        <!--        Add New Token -->
        <a-button size="middle" type="primary" ghost @click="openNewTokenModal">
          <div class="flex flex-row justify-center items-center caption capitalize space-x-1">
            <MdiPlusIcon />
            <div>{{ $t('activity.newToken') }}</div>
          </div>
        </a-button>
      </div>
    </div>
    <div v-if="tokensInfo" class="w-full flex flex-col mt-2 px-1">
      <div class="flex flex-row border-b-1 text-gray-600 text-xs pb-2 pt-2">
        <div class="flex w-4/10 pl-2">{{ $t('labels.description') }}</div>
        <div class="flex w-4/10 justify-center">{{ $t('labels.token') }}</div>
        <div class="flex w-2/10 justify-end pr-2">{{ $t('labels.action') }}</div>
      </div>
      <div v-for="(item, index) in tokensInfo" :key="index" class="flex flex-col">
        <div class="flex flex-row border-b-1 items-center px-2 py-2">
          <div class="flex flex-row w-4/10 flex-wrap overflow-ellipsis">
            {{ item.description }}
          </div>
          <div class="flex w-4/10 justify-center flex-wrap overflow-ellipsis">
            <span v-if="item.show">{{ item.token }}</span>
            <span v-else>****************************************</span>
          </div>
          <div class="flex flex-row w-2/10 justify-end">
            <a-tooltip placement="bottom">
              <template #title>
                <span v-if="item.show"> {{ $t('general.hide') }} </span>
                <span v-else> {{ $t('general.show') }} </span>
              </template>
              <a-button type="text" class="!rounded-md" @click="item.show = !item.show">
                <template #icon>
                  <VisibilityCloseIcon v-if="item.show" class="flex mx-auto h-[1.1rem]" />
                  <VisibilityOpenIcon v-else class="flex mx-auto h-[1rem]" />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip placement="bottom">
              <template #title> {{ $t('general.copy') }} </template>
              <a-button type="text" class="!rounded-md" @click="copyToken(item.token)">
                <template #icon>
                  <MdiContentCopyIcon class="flex mx-auto h-[1rem]" />
                </template>
              </a-button>
            </a-tooltip>

            <a-dropdown :trigger="['click']" class="flex" placement="bottomRight" overlay-class-name="nc-dropdown-api-token-mgmt">
              <div class="flex flex-row items-center">
                <a-button type="text" class="!px-0">
                  <div class="flex flex-row items-center h-[1.2rem]">
                    <KebabIcon />
                  </div>
                </a-button>
              </div>
              <template #overlay>
                <a-menu>
                  <a-menu-item>
                    <div class="flex flex-row items-center py-3 h-[1rem]" @click="openDeleteModal(item)">
                      <MdiDeleteOutlineIcon class="flex" />
                      <div class="text-xs pl-2">{{ $t('general.remove') }}</div>
                    </div>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
