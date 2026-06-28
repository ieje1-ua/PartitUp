// Post-processing cleanup for Audiveris MusicXML output.
//
// Targets the two systematic error classes seen on choral (SATB-on-4-staves)
// scores, where each voice is a single melodic line:
//   1. Spurious chord notes — Audiveris invents a second simultaneous note in
//      dense passages. Since each voice is monophonic, any in-voice <chord/>
//      note is an artifact that would sound as a wrong extra pitch.
//   2. Garbage lyric syllables — lone consonants ("m") or stray punctuation
//      ("'") that the OCR picks up as a separate lyric line.

// Collapsing chords is right for monophonic choral parts; set
// OMR_COLLAPSE_CHORDS=0 to keep chords for genuinely polyphonic input.
const COLLAPSE_CHORDS = (process.env.OMR_COLLAPSE_CHORDS ?? '1') !== '0'

// Lone vowels can be real syllables ("a-men"); lone consonants from OMR are
// almost always specks, so we keep vowels and drop other single characters.
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y'])

function isGarbageLyricText(raw: string): boolean {
  const s = raw.trim()
  if (s.length === 0) return true
  // No letters or digits at all → pure punctuation/symbol (e.g. "'").
  if (!/[\p{L}\p{N}]/u.test(s)) return true
  // Single non-vowel, non-digit character (e.g. "m").
  if (s.length === 1 && !VOWELS.has(s.toLowerCase()) && !/\d/.test(s)) return true
  return false
}

export function cleanupMusicXml(xml: string): string {
  let out = xml

  // 1. Drop <note> blocks that carry a <chord/> tag (keep the primary note of
  //    each chord group). Note elements don't nest, so a non-greedy match to
  //    the next </note> isolates one note block at a time. Timing is unchanged
  //    because chord members share the primary note's duration.
  if (COLLAPSE_CHORDS) {
    out = out.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, (note) =>
      /<chord\s*\/?>/.test(note) ? '' : note
    )
  }

  // 2. Remove garbage lyric syllables while keeping real lyrics.
  out = out.replace(/<lyric\b[^>]*>[\s\S]*?<\/lyric>/g, (lyric) => {
    const m = lyric.match(/<text>([\s\S]*?)<\/text>/)
    return isGarbageLyricText(m ? m[1] : '') ? '' : lyric
  })

  return out
}
