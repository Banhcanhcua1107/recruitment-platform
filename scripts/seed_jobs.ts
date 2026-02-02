
import { createClient } from '@supabase/supabase-js';
import jobs from '../src/data/jobs.json';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
// Note: Normally acts as anon, but for seeding we might need SERVICE_ROLE if RLS blocks inserts.
// However, I'll assume for now the user can run this or we can use the anon key if we add an insert policy.
// BUT, to be safe and robust, it is better to provide instructions to temporarily allow insert or use service role.
// Since I don't have the service role key in context, I will try to use the ANON key 
// and ask the user to add an INSERT policy or run this in a way that works.
// BETTER APPROACH: Generate a SQL file with INSERT statements! 
// 140 items is not that big for a SQL file. It's ~1500 lines. I can write that to a file.
// Let's stick to this script but warn the user about RLS.
// Actually, I can use the `setup_jobs_table.sql` to add a temporary INSERT policy for public/anon.

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to clean date
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Case 1: Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Case 2: Dirty string "Hạn nộp: 28-02-2026Cập nhật:30-01-2026"
  // Priority: Extract "Cập nhật:dd-MM-yyyy" or just the first date found
  let match = dateStr.match(/Cập nhật:(\d{2}-\d{2}-\d{4})/);
  if (!match) {
     // Try to find any date dd-mm-yyyy
     match = dateStr.match(/(\d{2}-\d{2}-\d{4})/);
  }

  if (match) {
    const [day, month, year] = match[1].split('-');
    return `${year}-${month}-${day}`;
  }

  return null; // fallback or null
}

async function seed() {
  console.log(`Seeding ${jobs.length} jobs...`);

  // Transform data if needed
  const formattedJobs = jobs.map(job => ({
    id: job.id,
    title: job.title,
    company_name: job.company_name,
    logo_url: job.logo_url,
    salary: job.salary,
    location: job.location,
    requirements: job.requirements,
    posted_date: parseDate(job.posted_date) || new Date().toISOString().split('T')[0] // Fallback to today if parse fails
  }));

  const { error } = await supabase.from('jobs').upsert(formattedJobs, { onConflict: 'id' });

  if (error) {
    console.error('Error seeding data:', error);
  } else {
    console.log('Successfully seeded data!');
  }
}

seed();
