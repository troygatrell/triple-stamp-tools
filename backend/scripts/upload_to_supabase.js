#!/usr/bin/env node
/**
 * upload_to_supabase.js
 * Batch uploads clean_ink_formulas.json into Supabase table ink_formulas.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ajztkwmnkxvfoakkepxs.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_roT3E5sRppxA36HYL6ImDg_zWJ2gu7z";

const CLEAN_JSON_PATH = path.join(__dirname, 'clean_ink_formulas.json');

async function checkNotesColumn() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ink_formulas?select=id,notes&limit=1`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  return res.ok;
}

async function fetchExistingFormulaNames() {
  console.log("Fetching existing formulas from Supabase to prevent duplicates...");
  const names = new Set();
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ink_formulas?select=formulaName&limit=${limit}&offset=${offset}`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    if (!res.ok) {
      console.warn("Could not fetch existing formulas:", await res.text());
      break;
    }
    const data = await res.json();
    if (!data || data.length === 0) break;
    data.forEach(item => {
      if (item.formulaName) names.add(item.formulaName.trim().toLowerCase());
    });
    if (data.length < limit) break;
    offset += limit;
  }
  console.log(`Found ${names.size} existing formula names in database.`);
  return names;
}

async function uploadBatch(batch, hasNotesCol) {
  const payload = batch.map(j => ({
    clientName: j.clientName || "",
    jobName: j.jobName || "",
    printLocation: j.printLocation || "",
    date: j.date || "",
    formulaName: j.formulaName || "",
    rows: j.rows || [],
    notes: j.notes || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/ink_formulas`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
}

async function cleanPreviousImport() {
  console.log("Clearing previous batch upload (id >= 19), preserving original 18 formulas...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ink_formulas?id=gte.19`, {
    method: 'DELETE',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'return=minimal'
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.warn("Could not delete previous batch via REST:", errText);
    return false;
  }
  console.log("✓ Successfully cleared previous batch. Original formulas (id 1-18) preserved.");
  return true;
}

async function main() {
  if (!fs.existsSync(CLEAN_JSON_PATH)) {
    console.error(`Clean JSON file not found: ${CLEAN_JSON_PATH}`);
    process.exit(1);
  }

  const cleanJobs = JSON.parse(fs.readFileSync(CLEAN_JSON_PATH, 'utf8'));
  console.log(`Loaded ${cleanJobs.length} clean jobs from JSON.`);

  const hasNotesCol = await checkNotesColumn();
  if (hasNotesCol) {
    console.log("✓ 'notes' column confirmed in Supabase.");
  } else {
    console.log("! 'notes' column does not exist yet in Supabase.");
    console.log("  To preserve notes, run in Supabase SQL editor:");
    console.log("  ALTER TABLE ink_formulas ADD COLUMN IF NOT EXISTS notes text DEFAULT '';");
    console.log("  Continuing without notes column (notes preserved in JSON/SQL)...");
  }

  const shouldClean = process.argv.includes('--clean') || process.argv.includes('--reset');
  if (shouldClean) {
    await cleanPreviousImport();
  }

  const existingNames = await fetchExistingFormulaNames();
  const toUpload = cleanJobs.filter(j => !existingNames.has(j.formulaName.trim().toLowerCase()));
  console.log(`Jobs to insert: ${toUpload.length} (${cleanJobs.length - toUpload.length} already exist, skipped).`);

  if (toUpload.length === 0) {
    console.log("All formulas are already present in the database!");
    return;
  }

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
    const batch = toUpload.slice(i, i + BATCH_SIZE);
    try {
      await uploadBatch(batch, hasNotesCol);
      inserted += batch.length;
      process.stdout.write(`\rProgress: ${inserted} / ${toUpload.length} formulas uploaded (${Math.round(inserted / toUpload.length * 100)}%)`);
    } catch (err) {
      console.error(`\nError uploading batch starting at index ${i}:`, err.message);
      console.log("Halting upload. You can re-run this script to resume.");
      process.exit(1);
    }
  }

  console.log(`\n\n🎉 Successfully uploaded ${inserted} formulas to Supabase!`);
}

main();
