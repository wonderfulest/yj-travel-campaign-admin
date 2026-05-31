<template>
  <div class="location-select">
    <label>
      国家
      <select
        :value="modelValue.country"
        @change="onCountryChange($event.target.value)"
        :disabled="disabled || loading"
      >
        <option value="">请选择国家</option>
        <option
          v-for="country in countries"
          :key="country.id"
          :value="country.id"
        >
          {{ formatCountryLabel(country) }}
        </option>
      </select>
    </label>
    <label>
      城市
      <select
        :value="modelValue.city"
        @change="onCityChange($event.target.value)"
        :disabled="disabled || loading || !modelValue.country"
      >
        <option value="">请选择城市</option>
        <option
          v-for="city in availableCities"
          :key="city.id"
          :value="city.id"
        >
          {{ formatCityLabel(city) }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import * as admin from '../../state/adminApp'

interface LocationValue {
  country: string
  city: string
}

interface BasicCountry {
  id: string
  alpha3: string
  name: string
  languages: string
}

interface BasicCity {
  id: string
  name: string
  fullName: string
  timezone: string
  country: BasicCountry | null
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
const availableCities = computed(() => {
  if (!props.modelValue.country) return []
  return admin.getCitiesByCountryId(props.modelValue.country)
})

onMounted(() => {
  admin.loadDictionaryCountries()
})

watch(
  () => props.modelValue.country,
  (newCountry, oldCountry) => {
    if (newCountry && newCountry !== oldCountry) {
      admin.loadDictionaryCities(newCountry)
    }
  },
  { immediate: true }
)

function formatCountryLabel(country: BasicCountry): string {
  const name = parseLocalizedName(country.name)
  return `${country.id} - ${name || country.id}`
}

function formatCityLabel(city: BasicCity): string {
  const name = parseLocalizedName(city.name)
  const fullName = parseLocalizedName(city.fullName)
  if (fullName && fullName !== name) {
    return `${name} (${fullName})`
  }
  return name || city.id
}

function parseLocalizedName(nameJson: string): string {
  if (!nameJson) return ''
  try {
    const parsed = JSON.parse(nameJson)
    return parsed.zh || parsed['zh-CN'] || parsed.en || Object.values(parsed).find((v: unknown) => v) || ''
  } catch {
    return nameJson
  }
}

function onCountryChange(countryId: string) {
  emit('update:modelValue', {
    country: countryId,
    city: ''
  })
}

function onCityChange(cityId: string) {
  emit('update:modelValue', {
    country: props.modelValue.country,
    city: cityId
  })
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

.location-select select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  font-size: 0.875rem;
}

.location-select select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.location-select select:focus {
  outline: none;
  border-color: #0f766e;
  ring: 2px solid rgba(15, 118, 110, 0.2);
}
</style>
