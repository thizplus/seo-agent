export interface AutoPublishSettings {
  enabled: boolean
  days: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
  time: string   // "09:00"
}
