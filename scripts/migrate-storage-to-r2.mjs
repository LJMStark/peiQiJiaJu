// scripts/migrate-storage-to-r2.mjs
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Ensure environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.R2_ACCOUNT_ID) {
  console.error("❌ Missing environment variables.");
  console.error("👉 Please run the script using: node --env-file=.env scripts/migrate-storage-to-r2.mjs");
  process.exit(1);
}

// 1. Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase URL or Key missing in environment variables!");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize R2 S3 Client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// The Supabase buckets containing your image assets
const SUPABASE_BUCKETS = ['furniture-assets', 'room-assets', 'generated-assets'];

// Helper to recursively list files in a Supabase Bucket (Supabase storage.list uses depth limitation)
async function listAllFiles(bucketId, folderPath = '') {
  let allFiles = [];
  
  const { data, error } = await supabase.storage.from(bucketId).list(folderPath, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`⚠️ Error listing folder '${folderPath}' in '${bucketId}':`, error.message);
    return allFiles;
  }

  for (const item of data) {
    // Skip empty folder placeholders
    if (item.name === '.emptyFolderPlaceholder') continue;

    const currentPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    if (!item.id) {
      // In Supabase Storage, objects without an `id` are sub-directories
      const subFiles = await listAllFiles(bucketId, currentPath);
      allFiles.push(...subFiles);
    } else {
      // It is a real file
      allFiles.push(currentPath);
    }
  }

  return allFiles;
}

// Content type fallback
function getContentType(filename) {
  const name = filename.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return 'application/octet-stream';
}

async function runMigration() {
  console.log("🚀 Starting Supabase Storage to Cloudflare R2 Migration...");

  let totalSuccess = 0;
  let totalErrors = 0;

  for (const bucket of SUPABASE_BUCKETS) {
    console.log(`\n📦 Scraping Supabase Bucket: [${bucket}] ...`);
    
    // 1. Discover all file paths
    const files = await listAllFiles(bucket);
    console.log(`🔍 Found ${files.length} files in [${bucket}]. Starting transfer...`);

    // 2. Sequentially Download & Upload
    // We run sequentially to protect local memory bounds and avoid spamming the APIs.
    for (const [index, filePath] of files.entries()) {
      const progress = `[${index + 1}/${files.length}]`;
      const targetKey = `${bucket}/${filePath}`; // Ensures R2 paths exactly match our new router logic
      
      try {
        process.stdout.write(`   ${progress} Synching: ${targetKey} ... `);
        
        // A) Fast check: Does this file already exist in R2?
        try {
          await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: targetKey }));
          console.log("⏭️ SKIPPED (Already in R2)");
          totalSuccess++;
          continue;
        } catch (headErr) {
          // Proceed to download only if not found (or on some other checking error)
        }
        
        // B) Download file from Supabase as a raw Blob
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(filePath);
          
        if (downloadError) {
          throw new Error(`Download failed: ${downloadError.message}`);
        }
        
        // Convert Blob -> ArrayBuffer -> Uint8Array to be consumable by S3 Client
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const contentType = fileBlob.type || getContentType(filePath);

        // C) Upload binary buffer to Cloudflare R2
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: targetKey,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        
        console.log("✅ DONE");
        totalSuccess++;
      } catch (err) {
        console.log(`❌ FAILED`);
        console.error(`      ╰─> Reason:`, err.message);
        totalErrors++;
      }
    }
  }

  console.log("\n🎉 MIGRATION PROCESS COMPLETED!");
  console.log(`✅ Successfully transferred: ${totalSuccess} images`);
  if (totalErrors > 0) {
    console.error(`⚠️ Failed to transfer: ${totalErrors} images. You can safely re-run the script later to retry failures.`);
  } else {
    console.log(`🚀 Your application is now fully unhooked from Supabase Storage constraints!`);
  }
}

runMigration().catch((err) => {
  console.error("\n💥 FATAL ERROR EXECUTING SCRIPT:", err);
  process.exit(1);
});
