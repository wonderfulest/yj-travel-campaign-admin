<template>
  <div class="location-select">
    <label>
      国家
      <div class="combo" ref="countryComboRef">
        <input
          :value="countryQuery"
          type="search"
          placeholder="输入国家中文/英文名称搜索"
          :disabled="disabled || loading"
          autocomplete="off"
          @focus="openCountryMenu"
          @input="onCountryInput"
          @keydown="onCountryKeydown"
          @blur="onCountryBlur"
        />
        <div v-if="countryOpen" class="combo-menu" role="listbox">
          <button
            v-if="countryQuery && filteredCountries.length === 0"
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
            :class="{ active: countryMenuIndex === index }"
            @mousedown.prevent="selectCountry(country)"
            @mouseenter="countryMenuIndex = index"
          >
            <span class="combo-item-main">{{ formatCountryPrimary(country) }}</span>
            <span class="combo-item-sub">{{ formatCountrySecondary(country) }}</span>
          </button>
        </div>
      </div>
    </label>

    <label>
      城市
      <div class="combo" ref="cityComboRef">
        <input
          :value="cityQuery"
          type="search"
          placeholder="输入城市中文/英文名称搜索"
          :disabled="disabled || loading || !modelValue.country"
          autocomplete="off"
          @focus="openCityMenu"
          @input="onCityInput"
          @keydown="onCityKeydown"
          @blur="onCityBlur"
        />
        <div v-if="cityOpen" class="combo-menu" role="listbox">
          <button
            v-if="cityQuery && filteredCities.length === 0"
            type="button"
            class="combo-item combo-item-empty"
            disabled
          >
            未找到匹配城市
          </button>
          <button
            v-for="(city, index) in filteredCities"
            :key="city.id"
            type="button"
            class="combo-item"
            :class="{ active: cityMenuIndex === index }"
            @mousedown.prevent="selectCity(city)"
            @mouseenter="cityMenuIndex = index"
          >
            <span class="combo-item-main">{{ formatCityPrimary(city) }}</span>
            <span class="combo-item-sub">{{ formatCitySecondary(city) }}</span>
          </button>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as admin from '../../state/adminApp'

interface LocationValue {
  country: string
  city: string
}

interface BasicCountry {
  id: string
  alpha3: string
  name: LocalizedNameValue
  languages: string[]
}

interface BasicCity {
  id: string
  name: LocalizedNameValue
  fullName: LocalizedNameValue
  timezone: string
  country: BasicCountry | null
}

interface LocalizedNameParts {
  zh: string
  en: string
}

interface LocalizedNameValue {
  en_us?: string
  zh_cn?: string
  en?: string
  zh?: string
}

const props = defineProps<{
  modelValue: LocationValue
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LocationValue]
}>()

const loading = computed(() => admin.state.dictionary.loading)
const countries = computed(() => admin.state.dictionary.countries)
const countryComboRef = ref<HTMLElement | null>(null)
const cityComboRef = ref<HTMLElement | null>(null)
const countryQuery = ref('')
const cityQuery = ref('')
const countryOpen = ref(false)
const cityOpen = ref(false)
const countryMenuIndex = ref(0)
const cityMenuIndex = ref(0)

const selectedCountry = computed(() => countries.value.find((country) => country.id === props.modelValue.country) || null)
const selectedCities = computed(() => {
  if (!props.modelValue.country) return []
  return admin.getCitiesByCountryId(props.modelValue.country)
})
const selectedCity = computed(() => selectedCities.value.find((city) => city.id === props.modelValue.city) || null)

const filteredCountries = computed(() => {
  const query = normalizeSearchTerm(countryQuery.value)
  const source = countries.value
  if (!query) return source
  return source.filter((country) => buildCountrySearchText(country).includes(query))
})

const filteredCities = computed(() => {
  if (!props.modelValue.country) return []
  const query = normalizeSearchTerm(cityQuery.value)
  const source = selectedCities.value
  if (!query) return source
  return source.filter((city) => buildCitySearchText(city).includes(query))
})

onMounted(() => {
  admin.loadDictionaryCountries()
  syncCountryQuery()
  syncCityQuery()
  document.addEventListener('click', handleDocumentClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, true)
})

watch(
  () => props.modelValue.country,
  (newCountry, oldCountry) => {
    if (newCountry && newCountry !== oldCountry) {
      admin.loadDictionaryCities(newCountry)
    }
    cityOpen.value = false
  },
  { immediate: true }
)

watch(
  selectedCountry,
  () => {
    syncCountryQuery()
  },
  { immediate: true }
)

watch(
  selectedCity,
  () => {
    syncCityQuery()
  },
  { immediate: true }
)

function formatCountryLabel(country: BasicCountry): string {
  const primary = formatCountryPrimary(country)
  const secondary = formatCountrySecondary(country)
  return secondary ? `${primary} / ${secondary}` : primary
}

function formatCountryPrimary(country: BasicCountry): string {
  const parts = parseLocalizedNameParts(country.name)
  return parts.en || parts.zh || country.id
}

function formatCountrySecondary(country: BasicCountry): string {
  const parts = parseLocalizedNameParts(country.name)
  return parts.zh || ''
}

function formatCityLabel(city: BasicCity): string {
  const primary = formatCityPrimary(city)
  const secondary = formatCitySecondary(city)
  return secondary ? `${primary} / ${secondary}` : primary
}

function formatCityPrimary(city: BasicCity): string {
  const nameParts = parseLocalizedNameParts(city.name)
  const fullNameParts = parseLocalizedNameParts(city.fullName)
  return fullNameParts.en || nameParts.en || nameParts.zh || city.id
}

function formatCitySecondary(city: BasicCity): string {
  const nameParts = parseLocalizedNameParts(city.name)
  const fullNameParts = parseLocalizedNameParts(city.fullName)
  return fullNameParts.zh || nameParts.zh || ''
}

function parseLocalizedName(nameJson: string): string {
  const parts = parseLocalizedNameParts(nameJson)
  return parts.zh || parts.en || ''
}

function parseLocalizedNameParts(nameJson: string | LocalizedNameValue): LocalizedNameParts {
  if (!nameJson) {
    return { zh: '', en: '' }
  }
  if (typeof nameJson !== 'string') {
    return {
      zh: String(nameJson.zh_cn || nameJson.zh || '').trim(),
      en: String(nameJson.en_us || nameJson.en || '').trim()
    }
  }
  try {
    const parsed = JSON.parse(nameJson)
    const zh = String(parsed.zh || parsed['zh-CN'] || '').trim()
    const en = String(parsed.en || '').trim()
    return {
      zh,
      en
    }
  } catch {
    const value = String(nameJson).trim()
    return {
      zh: value,
      en: value
    }
  }
}

function buildCountrySearchText(country: BasicCountry): string {
  const parts = parseLocalizedNameParts(country.name)
  return normalizeSearchTerm(
    [
      country.id,
      country.alpha3,
      parts.zh,
      parts.en,
      ...(country.languages || [])
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function buildCitySearchText(city: BasicCity): string {
  const nameParts = parseLocalizedNameParts(city.name)
  const fullNameParts = parseLocalizedNameParts(city.fullName)
  return normalizeSearchTerm(
    [
      city.id,
      nameParts.zh,
      nameParts.en,
      fullNameParts.zh,
      fullNameParts.en,
      city.timezone,
      city.country?.id,
      city.country?.alpha3,
      city.country ? parseLocalizedNameParts(city.country.name).zh : '',
      city.country ? parseLocalizedNameParts(city.country.name).en : ''
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function normalizeSearchTerm(value: string): string {
  return String(value || '')
    .toLocaleLowerCase()
    .trim()
}

function syncCountryQuery() {
  countryQuery.value = selectedCountry.value ? formatCountryLabel(selectedCountry.value) : ''
}

function syncCityQuery() {
  cityQuery.value = selectedCity.value ? formatCityLabel(selectedCity.value) : ''
}

function openCountryMenu() {
  countryOpen.value = true
  countryMenuIndex.value = Math.max(0, filteredCountries.value.findIndex((country) => country.id === props.modelValue.country))
  if (!countryQuery.value && selectedCountry.value) {
    syncCountryQuery()
  }
}

function openCityMenu() {
  if (!props.modelValue.country) return
  cityOpen.value = true
  cityMenuIndex.value = Math.max(0, filteredCities.value.findIndex((city) => city.id === props.modelValue.city))
  if (!cityQuery.value && selectedCity.value) {
    syncCityQuery()
  }
}

function onCountryInput(event: Event) {
  countryQuery.value = (event.target as HTMLInputElement).value
  countryOpen.value = true
  countryMenuIndex.value = 0
}

function onCityInput(event: Event) {
  cityQuery.value = (event.target as HTMLInputElement).value
  cityOpen.value = true
  cityMenuIndex.value = 0
}

function onCountryKeydown(event: KeyboardEvent) {
  if (!countryOpen.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    countryOpen.value = true
  }
  if (!countryOpen.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    countryMenuIndex.value = Math.min(countryMenuIndex.value + 1, Math.max(filteredCountries.value.length - 1, 0))
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    countryMenuIndex.value = Math.max(countryMenuIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    const item = filteredCountries.value[countryMenuIndex.value]
    if (item) {
      event.preventDefault()
      selectCountry(item)
    }
  } else if (event.key === 'Escape') {
    closeCountryMenu(true)
  }
}

function onCityKeydown(event: KeyboardEvent) {
  if (!cityOpen.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    cityOpen.value = true
  }
  if (!cityOpen.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    cityMenuIndex.value = Math.min(cityMenuIndex.value + 1, Math.max(filteredCities.value.length - 1, 0))
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    cityMenuIndex.value = Math.max(cityMenuIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    const item = filteredCities.value[cityMenuIndex.value]
    if (item) {
      event.preventDefault()
      selectCity(item)
    }
  } else if (event.key === 'Escape') {
    closeCityMenu(true)
  }
}

function onCountryBlur() {
  window.setTimeout(() => closeCountryMenu(true), 120)
}

function onCityBlur() {
  window.setTimeout(() => closeCityMenu(true), 120)
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (countryComboRef.value && target && !countryComboRef.value.contains(target)) {
    closeCountryMenu(true)
  }
  if (cityComboRef.value && target && !cityComboRef.value.contains(target)) {
    closeCityMenu(true)
  }
}

function closeCountryMenu(restoreSelection = false) {
  countryOpen.value = false
  countryMenuIndex.value = 0
  if (restoreSelection) {
    syncCountryQuery()
  }
}

function closeCityMenu(restoreSelection = false) {
  cityOpen.value = false
  cityMenuIndex.value = 0
  if (restoreSelection) {
    syncCityQuery()
  }
}

function selectCountry(country: BasicCountry) {
  emit('update:modelValue', {
    country: country.id,
    city: ''
  })
  countryQuery.value = formatCountryLabel(country)
  cityQuery.value = ''
  countryOpen.value = false
  cityOpen.value = false
}

function selectCity(city: BasicCity) {
  emit('update:modelValue', {
    country: props.modelValue.country,
    city: city.id
  })
  cityQuery.value = formatCityLabel(city)
  cityOpen.value = false
}
</script>

<style scoped>
.location-select {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.location-select label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #334155;
}

.combo {
  position: relative;
}

.combo input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  font-size: 0.875rem;
}

.combo input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.combo input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.2);
}

.combo-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
}

.combo-item {
  display: block;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  text-align: left;
  font-size: 0.875rem;
  color: #0f172a;
  cursor: pointer;
}

.combo-item-main {
  display: block;
  line-height: 1.35;
}

.combo-item-sub {
  display: block;
  margin-top: 0.12rem;
  font-size: 0.78rem;
  line-height: 1.25;
  color: #94a3b8;
}

.combo-item:hover,
.combo-item.active {
  background: #ecfeff;
  color: #0f766e;
}

.combo-item:hover .combo-item-sub,
.combo-item.active .combo-item-sub {
  color: rgba(15, 118, 110, 0.72);
}

.combo-item-empty {
  color: #94a3b8;
  cursor: default;
}

.combo-item-empty:hover {
  background: transparent;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .location-select {
    grid-template-columns: 1fr;
  }
}
</style>
