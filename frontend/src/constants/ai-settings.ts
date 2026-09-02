export const TONE_OPTIONS = [
  { value: "", label: "ไม่กำหนด (AI เลือกเอง)" },
  { value: "กันเอง สนุก ใช้ภาษาง่ายๆ", label: "กันเอง สนุก" },
  { value: "ทางการ มืออาชีพ น่าเชื่อถือ", label: "ทางการ มืออาชีพ" },
  { value: "เน้นขาย กระตุ้นซื้อ มี CTA ทุกหัวข้อ", label: "เน้นขาย กระตุ้นซื้อ" },
  { value: "ให้ความรู้ อธิบายละเอียด เหมือนครูสอน", label: "ให้ความรู้ เชิงวิชาการ" },
  { value: "รีวิว เปรียบเทียบ ตรงไปตรงมา", label: "รีวิว เปรียบเทียบ" },
  { value: "สร้างแรงบันดาลใจ กระตุ้นอารมณ์", label: "สร้างแรงบันดาลใจ" },
] as const

export const TONE_OVERRIDE_OPTIONS = [
  { value: "", label: "ใช้ค่าเริ่มต้นของ site" },
  ...TONE_OPTIONS.slice(1),
] as const
