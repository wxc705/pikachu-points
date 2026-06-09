// Supabase 客户端实例
// 配置：Vite 在构建时把 VITE_* 环境变量塞进 bundle
// .env 文件：
// VITE_SUPABASE_URL=https://...
// VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
 console.warn(
 '[supabase] 未配置 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY，云同步将不可用'
 )
}

export const supabase = url && key ? createClient(url, key) : null

// 状态：客户端是否可用
export const isSupabaseConfigured = () => !!supabase
