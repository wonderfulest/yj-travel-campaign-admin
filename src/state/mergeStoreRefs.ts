import { reactive } from 'vue'
import { storeToRefs, type StoreGeneric } from 'pinia'

export function mergeStoreRefs(...stores: StoreGeneric[]) {
  return reactive(Object.assign({}, ...stores.map((store) => storeToRefs(store)))) as Record<string, unknown>
}
