// Edits notes inside a Verovio MEI document by their xml:id (which equals the
// SVG element id used for selection). Used by the manual correction feature to
// nudge pitches and delete spurious notes, then re-render score + audio.

const XML_NS = 'http://www.w3.org/XML/1998/namespace'

const PNAMES = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
// Order in which accidentals are added for flat / sharp key signatures.
const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f']
const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b']

function elementId(el: Element): string | null {
  return el.getAttributeNS(XML_NS, 'id') ?? el.getAttribute('xml:id') ?? el.getAttribute('id')
}

// The gestural accidental a diatonic pitch carries in the given key signature
// (fifths: negative = flats, positive = sharps). Returns 'f', 's' or null.
function accidGesForKey(pname: string, fifths: number): string | null {
  if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(pname) ? 'f' : null
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(pname) ? 's' : null
  return null
}

function forEachMatchingNote(
  doc: Document,
  ids: Set<string>,
  fn: (note: Element) => void
): void {
  const notes = doc.getElementsByTagNameNS('*', 'note')
  // Collect first because fn may replace nodes (mutating the live collection).
  const matches: Element[] = []
  for (let i = 0; i < notes.length; i++) {
    const id = elementId(notes[i])
    if (id && ids.has(id)) matches.push(notes[i])
  }
  matches.forEach(fn)
}

// Move the given notes by `deltaSteps` diatonic steps (positive = up). The
// accidental is recomputed from the key signature so in-key pitches spell
// correctly; any explicit accidental on the note is cleared.
export function transposeNotesDiatonic(
  mei: string,
  noteIds: Iterable<string>,
  deltaSteps: number,
  fifths: number
): string {
  const doc = new DOMParser().parseFromString(mei, 'application/xml')
  const ids = new Set(noteIds)

  forEachMatchingNote(doc, ids, (note) => {
    const pname = note.getAttribute('pname')
    const octStr = note.getAttribute('oct')
    if (!pname || octStr == null) return
    const idx = PNAMES.indexOf(pname.toLowerCase())
    if (idx < 0) return

    const total = idx + deltaSteps
    const newIdx = ((total % 7) + 7) % 7
    const octShift = Math.floor(total / 7)
    const newPname = PNAMES[newIdx]
    const newOct = parseInt(octStr, 10) + octShift

    note.setAttribute('pname', newPname)
    note.setAttribute('oct', String(newOct))

    const acc = accidGesForKey(newPname, fifths)
    if (acc) note.setAttribute('accid.ges', acc)
    else note.removeAttribute('accid.ges')
    note.removeAttribute('accid')
    // Drop any explicit displayed accidental child so the key signature applies.
    Array.from(note.getElementsByTagNameNS('*', 'accid')).forEach((a) => a.remove())
  })

  return new XMLSerializer().serializeToString(doc)
}

// Replace the given notes with rests of the same duration, preserving timing.
export function deleteNotesToRests(mei: string, noteIds: Iterable<string>): string {
  const doc = new DOMParser().parseFromString(mei, 'application/xml')
  const ids = new Set(noteIds)

  forEachMatchingNote(doc, ids, (note) => {
    const rest = doc.createElementNS(note.namespaceURI, 'rest')
    const dur = note.getAttribute('dur')
    const dots = note.getAttribute('dots')
    if (dur) rest.setAttribute('dur', dur)
    if (dots) rest.setAttribute('dots', dots)
    note.replaceWith(rest)
  })

  return new XMLSerializer().serializeToString(doc)
}
