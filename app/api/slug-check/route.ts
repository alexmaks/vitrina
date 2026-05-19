import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isSlugValid, RESERVED_SLUGS, toSlug } from '@/lib/slugify'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') ?? ''

  if (!isSlugValid(slug)) {
    return NextResponse.json({
      available: false,
      reason: 'invalid',
      suggestion: null,
    })
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({
      available: false,
      reason: 'reserved',
      suggestion: toSlug(slug + '-shop'),
    })
  }

  const supabase = createSupabaseAdminClient()
  const { count } = await supabase
    .from('merchants')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)

  const taken = (count ?? 0) > 0
  return NextResponse.json({
    available: !taken,
    reason: taken ? 'taken' : null,
    suggestion: taken ? toSlug(slug + '-2') : null,
  })
}
