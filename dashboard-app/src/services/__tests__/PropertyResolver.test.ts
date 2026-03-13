import {
  cleanInput,
  resolveProperty,
  tryKW,
  tryFullTeryt,
  tryRawDigits,
  tryGeoportalLink,
  tryPartialParcel,
  tryTextParcel,
} from '../PropertyResolver'

// ─── Test Cases from Test_Cases.md ─────────────────────────────────

console.log('=== PropertyResolver — Test Suite ===\n')

// Helper
let passed = 0
let failed = 0
function assert(label: string, condition: boolean, detail?: string) {
  if (condition) { passed++; console.log(`✅ PASS | ${label}`) }
  else { failed++; console.log(`❌ FAIL | ${label}${detail ? ' — ' + detail : ''}`) }
}

// ── cleanInput ──
assert('cleanInput: trim + collapse', cleanInput('  hello   world  ') === 'hello world')
assert('cleanInput: zero-width', cleanInput('\u200Btest\uFEFF') === 'test')

// ── Case 1: Full TERYT "126101_1.0001.125/2" ──
const c1 = tryFullTeryt('126101_1.0001.125/2')
assert('Case 1: Full TERYT detected', c1?.inputType === 'teryt')
assert('Case 1: woj=12', c1?.teryt?.wojewodztwo === '12')
assert('Case 1: powiat=61', c1?.teryt?.powiat === '61')
assert('Case 1: gmina=01', c1?.teryt?.gmina === '01')
assert('Case 1: typ=1', c1?.teryt?.typGminy === '1')
assert('Case 1: obreb=0001', c1?.teryt?.obreb === '0001')
assert('Case 1: dzialka=125/2', c1?.teryt?.dzialka === '125/2')

// ── Case 2: Raw 15-digit string ──
const c2 = tryRawDigits('126101100011252')
assert('Case 2: Raw digits detected', c2?.inputType === 'teryt')
assert('Case 2: formatted=126101_1.0001.1252', c2?.teryt?.formatted === '126101_1.0001.1252',
  `got: ${c2?.teryt?.formatted}`)

// ── Case 3: TERYT with leading zero ──
const c3 = tryFullTeryt('026401_1.0022.4/15')
assert('Case 3: Leading zero preserved', c3?.inputType === 'teryt')
assert('Case 3: woj=02 (Dolnośląskie)', c3?.teryt?.wojewodztwo === '02')
assert('Case 3: dzialka=4/15', c3?.teryt?.dzialka === '4/15')

// ── Case 4: Partial — only parcel number "125/2" ──
const c4 = tryPartialParcel('125/2')
assert('Case 4: Partial parcel', c4?.inputType === 'partial')
assert('Case 4: dzialka=125/2', c4?.teryt?.dzialka === '125/2')
assert('Case 4: has error hint', !!c4?.error)

// ── Case 5: Text format "obręb 1 dz. 125/2" ──
const c5 = tryTextParcel('obręb 1 dz. 125/2')
assert('Case 5: Text parcel detected', c5?.inputType === 'partial')
assert('Case 5: obreb=0001', c5?.teryt?.obreb === '0001')
assert('Case 5: dzialka=125/2', c5?.teryt?.dzialka === '125/2')

// ── Case 6: Geoportal link ──
const c6 = tryGeoportalLink(
  'https://mapy.geoportal.gov.pl/imap/Imgp_2.html?identifyParcel=126101_1.0001.125/2'
)
assert('Case 6: Geoportal link detected', c6?.inputType === 'geoportal-link')
assert('Case 6: teryt extracted', c6?.teryt?.formatted === '126101_1.0001.125/2')

// ── Edge cases ──
const badLen = tryRawDigits('12345678')
assert('Edge: 8-digit string rejected', badLen === null)

const spaceTeryt = tryFullTeryt(cleanInput('  126101_1.0001.125/2  '))
assert('Edge: whitespace around TERYT handled', spaceTeryt?.inputType === 'teryt')

// ── KW ──
const kwResult = tryKW('KR1P/00082344/5')
assert('KW: valid format detected', kwResult?.inputType === 'kw')
assert('KW: kodSadu=KR1P', kwResult?.kw?.kodSadu === 'KR1P')
assert('KW: numer=00082344', kwResult?.kw?.numer === '00082344')
assert('KW: cyfra=5', kwResult?.kw?.cyfraKontrolna === '5')

const kwBad = tryKW('invalid-kw')
assert('KW: invalid input rejected', kwBad === null)

console.log(`\n--- Sync tests: ${passed} passed, ${failed} failed ---`)

// ── Full resolver integration (async) ──
async function integrationTests() {
  console.log('\n=== Integration Tests (async, live API) ===\n')

  // 1. Full TERYT through resolver
  console.log('--- resolveProperty("126101_1.0001.125/2") ---')
  const r1 = await resolveProperty('126101_1.0001.125/2')
  assert('Resolve: full TERYT → teryt type', r1.inputType === 'teryt')
  assert('Resolve: full TERYT → dzialka=125/2', r1.teryt?.dzialka === '125/2')
  console.log(JSON.stringify(r1, null, 2))

  // 2. Address → Geocode → ULDK
  console.log('\n--- resolveProperty("Kraków, ul. Grodzka 1") ---')
  const r2 = await resolveProperty('Kraków, ul. Grodzka 1')
  assert('Resolve: address → got result', r2.inputType === 'address')
  if (r2.teryt) {
    assert('Resolve: address → TERYT resolved', !!r2.teryt.formatted)
    console.log(JSON.stringify(r2, null, 2))
  } else {
    console.log('⚠️  Address lookup returned error (may be network/API):', r2.error)
  }

  // 3. Oświęcim test per user request
  console.log('\n--- resolveProperty("Oświęcim, ul. Polna 5") ---')
  const r3 = await resolveProperty('Oświęcim, ul. Polna 5')
  assert('Resolve: Oświęcim address → got result', r3.inputType === 'address')
  console.log(JSON.stringify(r3, null, 2))

  console.log('\n=== All tests complete ===')
}

integrationTests()
