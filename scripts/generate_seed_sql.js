
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jobsPath = path.join(__dirname, '../src/data/jobs.json');
const outputPath = path.join(__dirname, '../supabase/migrations/seed_jobs.sql');

try {
  const data = fs.readFileSync(jobsPath, 'utf8');
  const jobs = JSON.parse(data);

  let sql = `-- Seed Data from src/data/jobs.json\n`;
  sql += `-- Run this script in Supabase SQL Editor to populate the jobs table.\n\n`;
  sql += `TRUNCATE TABLE public.jobs RESTART IDENTITY CASCADE;\n\n`;

  jobs.forEach(job => {
    // Escape single quotes in text fields
    const title = (job.title || '').replace(/'/g, "''");
    const company = (job.company_name || '').replace(/'/g, "''");
    const logo = (job.logo_url || '').replace(/'/g, "''");
    const salary = (job.salary || '').replace(/'/g, "''");
    const location = (job.location || '').replace(/'/g, "''");
    
    // Convert requirements array to PostgreSQL array literal: '{"req 1", "req 2"}'
    const requirements = job.requirements 
      ? `'{"${job.requirements.map(r => r.replace(/"/g, '\\"').replace(/'/g, "''")).join('","')}"}'`
      : 'NULL';
    

    let postedDate = 'NULL';
    if (job.posted_date) {
        // Handle "Hạn nộp: 28-02-2026..." or plain "2026-01-26"
        const dateMatch = job.posted_date.match(/(\d{2})[-/](\d{2})[-/](\d{4})/); // Matches DD-MM-YYYY
        const isoMatch = job.posted_date.match(/(\d{4})[-/](\d{2})[-/](\d{2})/); // Matches YYYY-MM-DD
        
        if (isoMatch) {
            postedDate = `'${isoMatch[0]}'`;
        } else if (dateMatch) {
             // Convert DD-MM-YYYY to YYYY-MM-DD
            postedDate = `'${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}'`;
        } else {
             // Fallback if no date found, attempt basic string clean or NULL
            postedDate = 'NULL'; 
        }
    }


    sql += `INSERT INTO public.jobs (id, title, company_name, logo_url, salary, location, requirements, posted_date) VALUES (${job.id}, '${title}', '${company}', '${logo}', '${salary}', '${location}', ${requirements}, ${postedDate});\n`;
  });

  // Reset sequence to max id + 1 to avoid conflicts with future inserts
  const maxId = jobs.reduce((max, job) => Math.max(max, job.id), 0);
  sql += `\n-- Reset ID sequence\n`;
  sql += `SELECT setval(pg_get_serial_sequence('public.jobs', 'id'), ${maxId});\n`;

  fs.writeFileSync(outputPath, sql);
  console.log(`Successfully generated SQL seed file with ${jobs.length} jobs at: ${outputPath}`);

} catch (err) {
  console.error('Error generating seed SQL:', err);
  process.exit(1);
}
