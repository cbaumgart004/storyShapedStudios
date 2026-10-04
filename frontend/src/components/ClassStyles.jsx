// src/components/ClassStyles.jsx
// The owner's Classes (the console's `classes` document, schema/classes.js):
// each class's Style becomes one CSS rule on the selector the schema gives it
// (".sss-home .btn" for every button), or .c-<name> for a class of the owner's
// own. The rules lead with `html body` so they win over the site's own rule for
// the same thing; a blank Style leaves the site's look. Named colours are the
// site's theme variables, so a class follows Daylight and Blacklight.
import React, { useEffect, useMemo, useState } from 'react'
import { fetchPublished, useLiveDocuments, useSchema } from '@/lib/siteConsole'
import { lookToCss } from '@/components/Extras'

const NONE = []
const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

export function classRules(schema, data) {
  const list = [...(schema?.classes ?? []), ...(schema?.custom?.classes ?? []).map((c) => ({ ...c, selector: `.c-${c.name}` }))]
  return list.map((c) => {
    const css = lookToCss(schema, data?.[c.name])
    if (!css) return ''
    const body = Object.entries(css).map(([k, v]) => `${kebab(k)}: ${v};`).join(' ')
    const selector = c.selector.split(',').map((s) => `html body ${s.trim()}`).join(', ')
    return `${selector} { ${body} }`
  }).filter(Boolean).join('\n')
}

export default function ClassStyles() {
  const schema = useSchema()
  const [published, setPublished] = useState(NONE)
  useEffect(() => {
    let active = true
    fetchPublished('classes').then((d) => active && setPublished(d))
    return () => { active = false }
  }, [])
  const docs = useLiveDocuments('classes', published)
  const css = useMemo(() => classRules(schema, docs[0]?.data), [schema, docs])
  return css ? <style data-eotm-classes="">{css}</style> : null
}
