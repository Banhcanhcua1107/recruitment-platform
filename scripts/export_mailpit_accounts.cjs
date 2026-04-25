const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }
);

const shared = (process.env.EMAIL_TESTING_SYNC_PASSWORD || 'TalentFlowTest#2026').trim();
const domainPatterns = (process.env.EMAIL_TEST_ACCOUNT_DOMAINS || 'gmail.test,example.com,example.test')
    .split(',')
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

const emailOrFilter = domainPatterns
    .map((pattern) => `email.ilike.%@${pattern}`)
    .join(',');

function normalizeRole(role) {
    const value = String(role || '').toLowerCase();
    if (value === 'recruiter') return 'hr';
    return value;
}

function toErrorMessage(error) {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String(error.message || 'Unknown error');
    }
    return String(error);
}

async function fetchProfiles() {
    const withCreatedAt = await supabase
        .from('profiles')
        .select('id,email,full_name,role,created_at')
        .in('role', ['candidate', 'hr'])
        .or(emailOrFilter)
        .order('role', { ascending: true })
        .order('email', { ascending: true });
    if (!withCreatedAt.error) {
        return withCreatedAt.data || [];
    }

    const withoutCreatedAt = await supabase
        .from('profiles')
        .select('id,email,full_name,role')
        .in('role', ['candidate', 'hr'])
        .or(emailOrFilter)
        .order('role', { ascending: true })
        .order('email', { ascending: true });

    if (withoutCreatedAt.error) {
        throw withoutCreatedAt.error;
    }

    return (withoutCreatedAt.data || []).map((item) => ({
        ...item,
        created_at: '',
    }));
}

function esc(value) {
    const s = String(value ? ? '');
    if (/[",\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

(async() => {
    const data = await fetchProfiles();

    const rows = [
        ['STT', 'Role', 'Normalized Role', 'Email', 'Full Name', 'Shared Password (Mailpit)', 'Created At', 'User ID'],
    ];

    data.forEach((r, i) => {
        rows.push([
            String(i + 1),
            r.role || '',
            normalizeRole(r.role || ''),
            r.email || '',
            r.full_name || '',
            shared,
            r.created_at || '',
            r.id || '',
        ]);
    });

    const csv = '\uFEFF' + rows.map((row) => row.map(esc).join(',')).join('\n');

    const outDir = path.resolve('artifacts', 'mailpit-accounts');
    fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'candidate-hr-mailpit-accounts.csv');
    fs.writeFileSync(outPath, csv, 'utf8');

    const candidates = data.filter((r) => normalizeRole(r.role) === 'candidate').length;
    const hrs = data.filter((r) => normalizeRole(r.role) === 'hr').length;

    console.log(
        JSON.stringify({
                outPath,
                total: data.length,
                candidates,
                hrs,
                domains: domainPatterns,
                sharedPassword: shared,
            },
            null,
            2,
        ),
    );
})().catch((error) => {
    console.error(JSON.stringify({ ok: false, message: toErrorMessage(error) }, null, 2));
    process.exit(1);
});