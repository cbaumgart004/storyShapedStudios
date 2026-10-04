// src/components/Extras.jsx
// What the owner adds in the console, drawn without code of its own. Three
// parts share the rules here:
//   * CustomFields: an owner-designed section type (Blocks.jsx, CustomSection);
//   * Extras: the fields the owner added to a built-in element with
//     "+ Add a field" (the console's schema/custom.js, custom.fields), drawn
//     after the element's own content;
//   * useLook: an added Style field, as the CSS for that element. Named colours
//     come from the schema's styleColors, which point at the site's own theme
//     variables, so a styled element follows Daylight and Blacklight.
// `at` names where a field lives in the schema: "types.listing", "blocks.hero",
// "types.siteSettings.socials" (a list's rows). Every component that draws a
// console element calls Extras and useLook once; a new added field then needs
// no site code.

import React from 'react'
import { Link } from 'react-router-dom'
import { useSchema } from '@/lib/siteConsole'
import '@/styles/Extras.css'

export function LinkTo({ url, className, children, style, ...rest }) {
  if (url.startsWith('/')) return <Link to={url} className={className} style={style} {...rest}>{children}</Link>
  return <a href={url} className={className} style={style} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
}

export const money = (m) => (m?.amount == null ? null : new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency ?? 'USD' }).format(m.amount / 100))

// The fields defined at `at` in a schema that the owner added, or [].
export function addedAt(schema, at) {
  const [kind, name, ...rest] = String(at ?? '').split('.')
  let fields = schema?.[kind]?.[name]?.fields
  for (const part of rest) fields = fields?.find((f) => f.name === part)?.fields
  return (fields ?? []).filter((f) => f.added)
}

// A placed photo, turned, mirrored and faded as the owner set it in the console.
const photoLook = (v) => ({
  transform: [v.rotate ? `rotate(${v.rotate}deg)` : '', v.flip ? 'scaleX(-1)' : ''].join(' ').trim() || undefined,
  opacity: v.opacity != null ? v.opacity / 100 : undefined,
})

function CustomValue({ field, value, row }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null
  const inRow = row ? { 'data-eotm-in': row } : {}
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return <p className={`custom__${field.name}`} data-eotm-text={field.name} {...inRow}>{value}</p>
    case 'richtext':
      return <div className="page-rich" data-eotm-richtext={field.name} dangerouslySetInnerHTML={{ __html: value }} />
    case 'image':
      return value?.src ? <figure className="artist-cabinet deco-corners"><img src={value.src} alt={value.alt ?? ''} style={photoLook(value)} /></figure> : null
    case 'url':
      return <LinkTo url={value} className="prose-link">{field.label}<span className="arrow" aria-hidden="true">→</span></LinkTo>
    case 'number':
    case 'date':
      return <p className={`custom__${field.name}`}>{String(value)}</p>
    case 'datetime':
      return <p className={`custom__${field.name}`}>{new Date(value).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</p>
    case 'money':
      return value.amount != null ? <p className={`custom__${field.name}`}>{money(value)}</p> : null
    case 'select':
      return <p className={`custom__${field.name}`}>{field.options?.find((o) => o.value === value)?.label ?? value}</p>
    case 'list':
      return (
        <ul className={`custom__${field.name}`}>
          {value.map((item, i) => <li key={item._id ?? i}><CustomFields fields={field.fields ?? []} data={item} row={item._id} /></li>)}
        </ul>
      )
    default: // boolean and colour are settings, not content
      return null
  }
}

export function CustomFields({ fields, data, headingIndex = -1, row }) {
  return fields.map((f, i) => {
    if (i === headingIndex) return null
    const next = fields[i + 1]
    if (f.kind === 'text' && next?.kind === 'url' && data?.[next.name]) {
      return <LinkTo key={f.name} url={data[next.name]} className="prose-link">{data[f.name] || next.label}<span className="arrow" aria-hidden="true">→</span></LinkTo>
    }
    if (f.kind === 'url' && fields[i - 1]?.kind === 'text' && i - 1 !== headingIndex && data?.[f.name]) return null
    return <CustomValue key={f.name} field={f} value={data?.[f.name]} row={row} />
  })
}


const SIZES = { small: '0.875em', large: '1.25em', xlarge: '1.6em' }
const FONTS = { heading: 'var(--font-heading)', body: 'var(--font-body)' }

// One Style value as CSS. A named colour is the site's own variable.
export function lookToCss(schema, look) {
  if (!look || typeof look !== 'object') return undefined
  const colour = (v) => (!v ? undefined : schema?.styleColors?.find((c) => c.value === v)?.css ?? (/^#[0-9a-f]{6}$/i.test(v) ? v : undefined))
  const css = {
    fontSize: SIZES[look.size], fontFamily: FONTS[look.font], fontWeight: look.weight === 'bold' ? 700 : look.weight === 'normal' ? 400 : undefined,
    textAlign: look.align, color: colour(look.color), background: colour(look.background),
    ...(look.width ? { width: `${look.width}%`, maxWidth: '100%', marginInline: 'auto' } : {}),
    ...(look.background ? { padding: '0.75em 1em' } : {}),
  }
  const out = Object.fromEntries(Object.entries(css).filter(([, v]) => v != null))
  return Object.keys(out).length ? out : undefined
}

// The CSS of the Style fields the owner added at `at`, for `data`.
export function useLook(at, data) {
  const schema = useSchema()
  return lookFor(schema, at, data)
}
export function lookFor(schema, at, data) {
  const styles = addedAt(schema, at).filter((f) => f.kind === 'style').map((f) => lookToCss(schema, data?.[f.name])).filter(Boolean)
  return styles.length ? Object.assign({}, ...styles) : undefined
}

// The first added Photo with a picture in it, for an element with a natural
// place for one (a social link's icon). Null without.
export function addedPhotoOf(schema, at, data) {
  const f = addedAt(schema, at).find((x) => x.kind === 'image' && data?.[x.name]?.src)
  return f ? data[f.name] : null
}

// Fields as movable parts of a Free section (components/Frame.jsx): each one
// its own part, named by its field, a text followed by its link as one. In a
// Flow section the parts are no boxes of their own, so this draws exactly what
// CustomFields does.
export function FieldParts({ fields, data, headingIndex = -1, row, frame }) {
  const groups = []
  fields.forEach((f, i) => {
    if (i === headingIndex) return
    const prev = groups.at(-1)
    if (f.kind === 'url' && prev?.length === 1 && prev[0].kind === 'text' && fields.indexOf(prev[0]) === i - 1) prev.push(f)
    else groups.push([f])
  })
  return groups.map((g) => (
    <div key={g[0].name} {...frame.group(g[0].name)}>
      <CustomFields fields={g} data={data} row={row} />
    </div>
  ))
}

// The owner's added fields at `at`, drawn after the element's own content.
// `skip` leaves out kinds the component already placed (a photo it shows as
// the icon). Style fields are never drawn; useLook applies them. With `frame`
// (a page section), each field is a part the owner can arrange.
export function Extras({ at, data, row, skip = [], className = 'extras', frame = null }) {
  const schema = useSchema()
  const fields = addedAt(schema, at).filter((f) => f.kind !== 'style' && !skip.includes(f.kind))
  if (!fields.some((f) => data?.[f.name] != null && data[f.name] !== '' && !(Array.isArray(data[f.name]) && !data[f.name].length))) return null
  if (frame) return (
    <div className={className} {...frame.wrap}>
      <FieldParts fields={fields} data={data} row={row} frame={frame} />
    </div>
  )
  return (
    <div className={className}>
      <CustomFields fields={fields} data={data} row={row} />
    </div>
  )
}

// A social link's mark (SiteHeader, SiteFooter): a photo the owner added to the
// link wins over the built-in icon; with neither, the link's name. The built-in
// icons are the artwork the owner asked for, so a Style never touches them.
export function SocialMark({ schema, social }) {
  const photo = addedPhotoOf(schema, 'types.siteSettings.socials', social.row)
  const style = lookFor(schema, 'types.siteSettings.socials', social.row)
  if (photo) return <img src={photo.src} alt={photo.alt || social.label} style={{ ...photoLook(photo), ...style }} />
  if (social.icon) return <img src={social.icon} alt={social.label} />
  return <span className="social-name" style={style}>{social.label}</span>
}

// The owner's own elements in a section (the console's schema/elements.js,
// `_elements`): text, formatted text, a photo, a button or a box, each a part
// named by its id, so Arrange places it in a Free section; in a Flow section
// they follow the section's own content. Each takes its class (the site's own,
// or the owner's .c-<name>) and its own Style. Text and button labels can be
// typed where they stand in the editor. Formatted text is sanitized by the
// console API on save.
const classNameOf = (schema, name) => {
  if (!name) return ''
  const site = (schema?.classes ?? []).find((c) => c.name === name)
  if (site) return /^\.[\w-]+$/.test(site.selector.trim()) ? site.selector.trim().slice(1) : ''
  return (schema?.custom?.classes ?? []).some((c) => c.name === name) ? `c-${name}` : ''
}
const buttonClassOf = (schema, look) => {
  const styles = schema?.buttonStyles ?? []
  return (styles.find((s) => s.value === look) ?? styles[0])?.className ?? 'btn'
}

function Element({ el, frame, schema }) {
  const cls = `eotm-el eotm-el--${el.kind} ${classNameOf(schema, el.class)}`.trim()
  const marks = { 'data-eotm-element': el.kind, 'data-eotm-in': el._id, ...frame.part(el._id, lookToCss(schema, el.style)) }
  switch (el.kind) {
    case 'text': {
      const Tag = ['h2', 'h3'].includes(el.tag) ? el.tag : 'p'
      return <Tag className={cls} data-eotm-text="text" {...marks}>{el.text}</Tag>
    }
    case 'richtext':
      return <div className={`page-rich ${cls}`} data-eotm-richtext="html" dangerouslySetInnerHTML={{ __html: el.html ?? '' }} {...marks} />
    case 'image':
      return el.image?.src ? <img className={cls} src={el.image.src} alt={el.image.alt ?? ''} {...marks} style={{ ...marks.style, ...photoLook(el.image) }} /> : null
    case 'button':
      return el.url ? (
        <LinkTo url={el.url} className={`${buttonClassOf(schema, el.look)} ${cls}`} {...marks}>
          {el.icon?.src && <img className="btn-icon" src={el.icon.src} alt="" />}
          <span data-eotm-text="label" data-eotm-in={el._id}>{el.label}</span>
        </LinkTo>
      ) : null
    default:
      return <div className={cls} {...marks} />
  }
}

export function Elements({ data, frame }) {
  const schema = useSchema()
  const list = Array.isArray(data?._elements) ? data._elements.filter((e) => e?._id) : []
  return list.map((el) => <Element key={el._id} el={el} frame={frame} schema={schema} />)
}
