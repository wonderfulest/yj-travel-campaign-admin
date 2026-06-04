<template>
  <div class="country-multi-select" ref="rootRef">
    <div class="selected-chips" v-if="selectedCountries.length">
      <button
        v-for="country in selectedCountries"
        :key="country.id"
        type="button"
        class="chip"
        :disabled="disabled"
        @click="removeCountry(country.id)"
      >
        <span class="chip-main">{{ formatPrimary(country) }}</span>
        <span class="chip-sub">{{ formatSecondary(country) }}</span>
        <X :size="13" />
      </button>
    </div>
    <div class="combo">
      <input
        :value="query"
        type="search"
        placeholder="输入国家中文/英文名称搜索"
        :disabled="disabled || loading"
        autocomplete="off"
        @focus="openMenu"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <div v-if="menuOpen" class="combo-menu" role="listbox">
        <button
          v-if="query && filteredCountries.length === 0"
          type="button"
          class="combo-item combo-item-empty"
          disabled
        >
          未找到匹配国家
        </button>
        <button
          v-for="(country, index) in filteredCountries"
          :key="country.id"
          type="button"
          class="combo-item"
          :class="{ active: menuIndex === index, selected: isSelected(country.id) }"
          @mousedown.prevent="selectCountry(country)"
          @mouseenter="menuIndex = index"
        >
          <span class="combo-item-main">{{ formatPrimary(country) }}</span>
          <span class="combo-item-sub">{{ formatSecondary(country) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import { loadDictionaryCountries, useCustomerStore } from '../../state/useCustomerStore'
import { formatCountryNameWithCode } from '../../utils/format'

interface CountryValue {
  id: string
  alpha3: string
  name: LocalizedNameValue
  languages: string[]
}

interface LocalizedNameValue {
  en_us?: string
  zh_cn?: string
  en?: string
  zh?: string
}

const props = defineProps<{
  modelValue: string[]
  multiple?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const query = ref('')
const menuOpen = ref(false)
const menuIndex = ref(0)
const customerStore = useCustomerStore()
const { dictionary } = storeToRefs(customerStore)

const loading = computed(() => dictionary.value.loading)
const countries = computed<CountryValue[]>(() => dictionary.value.countries)
const selectedCountries = computed(() => countries.value.filter((country) => props.modelValue.includes(country.id)))

const filteredCountries = computed(() => {
  const keyword = normalize(query.value)
  if (!keyword) return countries.value
  return countries.value.filter((country) => buildSearchText(country).includes(keyword))
})

onMounted(() => {
  loadDictionaryCountries()
  document.addEventListener('click', handleOutsideClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick, true)
})

watch(
  () => props.modelValue,
  () => {
    syncQuery()
  },
  { deep: true, immediate: true }
)

function parseLocalizedNameParts(nameValue: string | LocalizedNameValue) {
  if (!nameValue) return { zh: '', en: '' }
  if (typeof nameValue !== 'string') {
    return {
      zh: String(nameValue.zh_cn || nameValue.zh || '').trim(),
      en: String(nameValue.en_us || nameValue.en || '').trim()
    }
  }
  try {
    const parsed = JSON.parse(nameValue)
    return {
      zh: String(parsed.zh_cn || parsed.zh || parsed['zh-CN'] || '').trim(),
      en: String(parsed.en_us || parsed.en || '').trim()
    }
  } catch {
    const value = String(nameValue).trim()
    return { zh: value, en: value }
  }
}

function formatPrimary(country: CountryValue) {
  return formatCountryNameWithCode(country.id, [country])
}

function formatSecondary(country: CountryValue) {
  const parts = parseLocalizedNameParts(country.name)
  if (parts.en && parts.en !== parts.zh) return parts.en
  return ''
}

function buildSearchText(country: CountryValue) {
  const parts = parseLocalizedNameParts(country.name)
  return normalize([country.id, country.alpha3, ...(country.languages || []), parts.zh, parts.en].filter(Boolean).join(' '))
}

function normalize(value: string) {
  return String(value || '').toLocaleLowerCase().trim()
}

function syncQuery() {
  query.value = ''
}

function openMenu() {
  menuOpen.value = true
  menuIndex.value = Math.max(0, filteredCountries.value.findIndex((country) => country.id === props.modelValue[0]))
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  menuOpen.value = true
  menuIndex.value = 0
}

function onKeydown(event: KeyboardEvent) {
  if (!menuOpen.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    menuOpen.value = true
  }
  if (!menuOpen.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    menuIndex.value = Math.min(menuIndex.value + 1, Math.max(filteredCountries.value.length - 1, 0))
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    menuIndex.value = Math.max(menuIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    const item = filteredCountries.value[menuIndex.value]
    if (item) {
      event.preventDefault()
      selectCountry(item)
    }
  } else if (event.key === 'Escape') {
    closeMenu()
  }
}

function onBlur() {
  window.setTimeout(() => closeMenu(), 120)
}

function handleOutsideClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (rootRef.value && target && !rootRef.value.contains(target)) {
    closeMenu()
  }
}

function closeMenu() {
  menuOpen.value = false
  menuIndex.value = 0
  syncQuery()
}

function isSelected(countryId: string) {
  return props.modelValue.includes(countryId)
}

function selectCountry(country: CountryValue) {
  const next = props.multiple === false
    ? [country.id]
    : Array.from(new Set([...props.modelValue, country.id]))
  emit('update:modelValue', next)
  query.value = ''
  menuOpen.value = true
  menuIndex.value = 0
}

function removeCountry(countryId: string) {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.filter((id) => id !== countryId))
}
</script>

<style scoped>
.country-multi-select {
  display: grid;
  gap: 0.5rem;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid #b8ddd8;
  border-radius: 999px;
  background: #eefaf8;
  color: #0f4f49;
  font-size: 0.75rem;
  font-weight: 800;
}

.chip-main {
  line-height: 1.1;
}

.chip-sub {
  font-size: 0.68rem;
  color: #6c8f8a;
}

.combo {
  position: relative;
}

.combo input {
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.45rem;
  background: #fff;
}

.combo input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.18);
}

.combo-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  max-height: 15rem;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
}

.combo-item {
  display: grid;
  gap: 0.15rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.combo-item-main {
  display: block;
  color: #0f172a;
  font-size: 0.875rem;
}

.combo-item-sub {
  display: block;
  color: #94a3b8;
  font-size: 0.75rem;
}

.combo-item:hover,
.combo-item.active,
.combo-item.selected {
  background: #ecfeff;
}

.combo-item.selected .combo-item-main {
  color: #0f766e;
}

.combo-item.selected .combo-item-sub {
  color: rgba(15, 118, 110, 0.75);
}

.combo-item-empty {
  color: #94a3b8;
  cursor: default;
}

@media (max-width: 768px) {
  .selected-chips {
    gap: 0.4rem;
  }
}
</style>
