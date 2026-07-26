#!/usr/bin/env node
/**
 * ONE-OFF, EXPLICITLY-APPROVED SCRIPT — deletes ALL rows in survey_responses
 * (both "[TEST]"-prefixed rows AND real participant rows), leaving the table
 * empty. This is NOT the same as scripts/seed-test-data.cjs --clear, which
 * only removes "[TEST]"-prefixed rows.
 *
 * Approved scope (2026-07-17, chongchong relaying daejang approval):
 *   - survey_responses: delete ALL rows (pre-deploy full reset).
 *   - dashboard_config: NOT touched by this script (settings table, out of
 *     scope for this approval).
 *
 * Usage: node scripts/clear-all-survey-responses.cjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Prints before/after counts so the deletion is auditable.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function getEnvVar(name) {
  const envPath = path.join(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  const line = content.split('\n').find((l) => l.startsWith(name + '='))
  if (!line) return null
  return line.slice(name.length + 1).replace(/^"|"$/g, '').trim()
}

async function main() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { count: before, error: countErr } = await admin
    .from('survey_responses')
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.error('COUNT ERROR (before):', countErr.message)
    process.exit(1)
  }
  console.log(`BEFORE: ${before} row(s) in survey_responses.`)

  // Delete all rows. Supabase requires a filter for delete(); id is a uuid
  // primary key that is never null, so this matches every row.
  const { error: delErr, count: deleted } = await admin
    .from('survey_responses')
    .delete({ count: 'exact' })
    .not('id', 'is', null)
  if (delErr) {
    console.error('DELETE ERROR:', delErr.message)
    process.exit(1)
  }
  console.log(`DELETED: ${deleted ?? '?'} row(s).`)

  const { count: after, error: afterErr } = await admin
    .from('survey_responses')
    .select('*', { count: 'exact', head: true })
  if (afterErr) {
    console.error('COUNT ERROR (after):', afterErr.message)
    process.exit(1)
  }
  console.log(`AFTER: ${after} row(s) in survey_responses.`)
}

main()
