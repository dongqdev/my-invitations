const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Download helper with redirect and timeout support
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Redirect handling
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        if (response.headers.location) {
          // Resolve redirect location relative to original URL if needed
          const redirectUrl = new URL(response.headers.location, url).toString();
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Status Code: ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Timeout after 15 seconds'));
    });
  });
}

async function main() {
  // Filter out '--' argument if present
  let targetFolder = null;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] !== '--') {
      targetFolder = process.argv[i];
      break;
    }
  }

  if (!targetFolder) {
    console.error('Error: Please specify the target folder path.');
    console.error('Usage: npm run invitation -- <path-to-folder>');
    console.error('Example: npm run invitation -- wedding/silverlyjoo');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const targetDir = path.resolve(projectRoot, targetFolder);
  const htmlPath = path.join(targetDir, 'index.html');



  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: index.html not found at ${htmlPath}`);
    process.exit(1);
  }

  console.log(`Starting resource archiver for: ${targetFolder}`);
  console.log(`Reading index.html...`);
  
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Find files directory
  const items = fs.readdirSync(targetDir);
  let filesDirName = items.find(item => {
    const fullPath = path.join(targetDir, item);
    return fs.statSync(fullPath).isDirectory() && item.endsWith('_files');
  });

  if (!filesDirName) {
    // Try to guess from index.html reference (e.g. ./xxxx_files/)
    const filesDirRegex = /\.\/([^/]+_files)\//i;
    const match = htmlContent.match(filesDirRegex);
    if (match) {
      filesDirName = match[1];
    } else {
      // Default fallback
      const folderName = path.basename(targetDir);
      filesDirName = `${folderName}_files`;
    }
  }

  const resourceDir = path.join(targetDir, filesDirName);
  if (!fs.existsSync(resourceDir)) {
    fs.mkdirSync(resourceDir, { recursive: true });
    console.log(`Created files directory: ${filesDirName}`);
  } else {
    console.log(`Using existing files directory: ${filesDirName}`);
  }

  // Regex to match external http/https urls with media/image/audio extensions (ignoring queries)
  const urlRegex = /https?:\/\/[^\s"'()<>]+(?:\.(?:jpg|jpeg|png|gif|webp|svg|bmp|mp3|mp4|wav|ogg))(?:\?[^\s"'()<>]+)?/gi;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(htmlContent)) !== null) {
    urls.push(match[0]);
  }

  const uniqueUrls = [...new Set(urls)];
  console.log(`Found ${uniqueUrls.length} unique external media resources.`);

  let updatedHtml = htmlContent;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const url of uniqueUrls) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      let filename = path.basename(pathname);
      if (!filename) {
        filename = 'downloaded_' + Date.now();
      }
      
      // Safe filename: decode and remove invalid OS characters
      filename = decodeURIComponent(filename).replace(/[\/\\:\*\?"<>\|]/g, '_');
      
      const destPath = path.join(resourceDir, filename);
      const relativeLocalPath = `./${filesDirName}/${filename}`;

      if (fs.existsSync(destPath)) {
        console.log(`[-] Skip (already downloaded): ${filename}`);
        skipCount++;
      } else {
        console.log(`[+] Downloading: ${url}`);
        await downloadFile(url, destPath);
        console.log(`    Saved as: ${filename}`);
        successCount++;
      }

      // Replace URL globally in HTML
      const escUrl = escapeRegExp(url);
      updatedHtml = updatedHtml.replace(new RegExp(escUrl, 'g'), relativeLocalPath);
    } catch (err) {
      console.error(`[!] Failed to download ${url}: ${err.message}`);
      failCount++;
    }
  }

  if (successCount > 0 || failCount === 0) {
    fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
    console.log(`\nSuccess: index.html has been updated.`);
  } else {
    console.log(`\nNo changes were written to index.html (no new downloads or all failed).`);
  }

  console.log(`-----------------------------------------------`);
  console.log(`Archiving Summary for: ${targetFolder}`);
  console.log(`- Total unique resources found: ${uniqueUrls.length}`);
  console.log(`- Newly downloaded: ${successCount}`);
  console.log(`- Already existing (skipped): ${skipCount}`);
  console.log(`- Failed: ${failCount}`);
  console.log(`-----------------------------------------------`);
}

main().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
