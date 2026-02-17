const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_ID = '751bc117-ac7f-4f1d-9681-8c6aff94bd2e';

async function testUpload() {
    console.log("Testing upload with ANON key...");

    // 1. Try to upload a small text file
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(`${TEST_ID}/test.txt`, 'Hello World', { upsert: true });

    if (uploadError) {
        console.error("Upload Error:", uploadError);
    } else {
        console.log("Upload Success:", uploadData);
    }

    // 2. Try to update the database
    const { data: dbData, error: dbError } = await supabase
        .from('empresas')
        .update({ nome: 'Tarhget TEST' })
        .eq('id', TEST_ID);

    if (dbError) {
        console.error("DB Update Error:", dbError);
    } else {
        console.log("DB Update Success (Check code item 0 if nothing shows):", dbData);
    }
}

testUpload();
