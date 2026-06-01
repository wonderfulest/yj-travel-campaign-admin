import { request } from './request'
import type {
  City,
  Country,
  Customer,
  CustomerEditForm,
  CustomerProfile,
  CustomerSummary,
  EmailQuality,
  ImportResult,
  MappingPreview,
  MappingResult,
  TenantApiSecretRotationResult,
  TenantApiSecretStatus
} from '../types'

export const customersApi = {
  getAssetProfile(id: string | number): Promise<CustomerProfile> {
    return request(`/api/customers/${id}/asset-profile`) as Promise<CustomerProfile>
  },
  getSummary(): Promise<CustomerSummary> {
    return request('/api/customers/summary') as Promise<CustomerSummary>
  },
  list(query: string): Promise<unknown> {
    return request(`/api/customers?${query}`)
  },
  create(body: CustomerEditForm): Promise<Customer> {
    return request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(body)
    }) as Promise<Customer>
  },
  update(id: string | number, body: CustomerEditForm): Promise<Customer> {
    return request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }) as Promise<Customer>
  },
  updateEmailQuality(id: string | number, emailQuality: EmailQuality): Promise<Customer> {
    return request(`/api/customers/${id}/email-quality`, {
      method: 'PATCH',
      body: JSON.stringify({ emailQuality })
    }) as Promise<Customer>
  },
  importFile(importType: 'json' | 'excel', form: FormData): Promise<ImportResult> {
    const path = importType === 'excel'
      ? '/api/imports/customers-excel'
      : '/api/imports/customers-json'
    return request(path, { method: 'POST', body: form }) as Promise<ImportResult>
  },
  getTenantApiSecret(): Promise<TenantApiSecretStatus> {
    return request('/api/tenant/api-secret') as Promise<TenantApiSecretStatus>
  },
  rotateTenantApiSecret(): Promise<TenantApiSecretRotationResult> {
    return request('/api/tenant/api-secret/rotate', {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<TenantApiSecretRotationResult>
  },
  getMappingPreview(): Promise<MappingPreview> {
    return request('/api/customer-mapping/osm/preview') as Promise<MappingPreview>
  },
  runOsmMapping(): Promise<MappingResult> {
    return request('/api/customer-mapping/osm', {
      method: 'POST',
      body: JSON.stringify({})
    }) as Promise<MappingResult>
  },
  getCountries(): Promise<Country[]> {
    return request('/api/dictionary/countries') as Promise<Country[]>
  },
  getCities(countryId: string): Promise<City[]> {
    return request(`/api/dictionary/cities?countryId=${encodeURIComponent(countryId)}`) as Promise<City[]>
  }
}
