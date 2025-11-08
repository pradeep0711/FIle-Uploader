# File Uploader

A modern, secure file upload application that enables users to upload files directly to AWS S3 with real-time progress tracking, automatic image compression, and fallback mechanisms for reliability.

## ✅ Objective

This project is a web-based file uploader that allows users to:
- Upload files (images, text files, PDFs) up to 10MB
- Automatically compress images to WebP format for optimal storage
- Upload directly to AWS S3 using presigned URLs for fast, secure transfers
- Fall back to server-side multipart upload if direct upload fails
- Track upload progress in real-time
- Receive shareable signed URLs for uploaded files

The application features a modern, dark-themed UI built with React and Vite, and uses AWS S3 for cloud storage with serverless functions for backend processing.

## ✅ Setup Steps

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- AWS Account with S3 bucket created
- AWS Access Key ID and Secret Access Key with S3 permissions

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd file-uploader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1
   S3_BUCKET=your-bucket-name
   MAX_FILE_SIZE_MB=10
   ALLOWED_MIME=image/*,text/plain,application/pdf
   ```

4. **Start the development server**
   
   In one terminal, start the API server:
   ```bash
   npm run api
   ```
   
   In another terminal, start the Vite dev server:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in the terminal)

### Deploy to Vercel

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Configure environment variables in Vercel**
   
   Go to your Vercel project settings → Environment Variables and add:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (or `AWS_S3_REGION`)
   - `S3_BUCKET` (or `AWS_S3_BUCKET`)
   - `MAX_FILE_SIZE_MB` (optional, defaults to 10)
   - `ALLOWED_MIME` (optional, defaults to `image/*,text/plain,application/pdf`)

4. **Redeploy** to apply environment variables
   ```bash
   vercel --prod
   ```

### AWS S3 Configuration

1. **Create an S3 bucket** in your AWS account
2. **Configure CORS** (for direct uploads):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
3. **Set bucket permissions** to allow your IAM user/role to read/write objects

## ✅ Challenges/Assumptions

### Challenges Encountered

1. **Dual Upload Strategy**: Implementing both presigned URL direct uploads and server-side multipart uploads required careful error handling and fallback logic. The direct upload approach is faster but can fail due to CORS issues, so the server-side fallback ensures reliability.

2. **Streaming Large Files**: Handling file uploads efficiently using Node.js streams and Busboy required careful memory management to avoid loading entire files into memory, especially for files approaching the 10MB limit.

3. **Image Compression**: Client-side image compression using Canvas API needed to handle various image formats and edge cases (very large images, unsupported formats) while maintaining acceptable quality.

4. **Progress Tracking**: Implementing accurate upload progress required using XMLHttpRequest for both direct S3 uploads and server-side uploads, as the Fetch API doesn't support progress events.

### Assumptions Made

1. **File Size Limit**: Default maximum file size is set to 5MB, which balances usability with storage costs and upload time.

2. **File Types**: Limited to images, text files, and PDFs for security and storage management. This can be customized via environment variables.

3. **Signed URL Expiration**: Presigned URLs expire after 1 hour for GET requests and 15 minutes for PUT requests, providing a balance between usability and security.

4. **Image Format**: Images are automatically converted to WebP format with 82% quality, which provides good compression while maintaining visual quality.

5. **S3 Key Structure**: Files are organized in S3 with a date-based structure (`uploads/YYYY/MM/DD/`) for easier management and cleanup.

## ✅ AI Tools Used

- **ChatGPT/Claude**: Used to generate initial boilerplate React component structure, AWS SDK v3 integration code, and Vercel serverless function templates
- **GitHub Copilot**: Assisted with implementing file upload progress tracking, error handling patterns, and Busboy stream processing logic
- **AI Code Completion**: Helped with optimizing image compression algorithms and configuring multipart upload parameters

## ✅ Live Demo Links

- **Production Deployment**: https://f-ile-uploader.vercel.app/
- **GitHub Repository**: https://github.com/pradeep0711/FIle-Uploader

## ✅ Reflection

Building this file uploader taught me the importance of implementing robust fallback mechanisms in web applications. The dual upload strategy (presigned URLs with server-side fallback) ensures reliability, but managing the state transitions between these methods was more complex than initially expected. I also learned that client-side image compression can significantly reduce storage costs and upload times, though implementing it required careful handling of edge cases like unsupported formats and browser compatibility.

The most challenging aspect was understanding the nuances of AWS S3 presigned URLs and CORS configuration, which initially caused upload failures. Through this project, I gained deeper knowledge of streaming file uploads in Node.js, the AWS SDK v3 architecture, and how to build resilient client-server communication patterns for file handling.
