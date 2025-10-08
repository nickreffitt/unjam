import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (name: string): string => {
  const index = args.indexOf(name)
  if (index === -1 || index === args.length - 1) {
    console.error(`Error: Missing required argument ${name}`)
    console.log('Usage: tsx upload-extension.ts --url <supabase-url> --key <supabase-key> --file <file-path> --name <file-name>')
    process.exit(1)
  }
  return args[index + 1]
}

const supabaseUrl = getArg('--url')
const supabaseKey = getArg('--key')
const filePath = getArg('--file')
const fileName = getArg('--name')

const supabase = createClient(supabaseUrl, supabaseKey)

async function uploadExtension() {
  console.log(`Reading file: ${filePath}`)
  const fileBuffer = readFileSync(filePath)

  console.log(`Uploading to storage://extensions/${fileName}`)
  const { data, error } = await supabase.storage
    .from('extensions')
    .upload(fileName, fileBuffer, {
      contentType: 'application/zip',
      upsert: true // Overwrite if file already exists
    })

  if (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }

  console.log('✅ Upload successful:', data)

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('extensions')
    .getPublicUrl(fileName)

  console.log(`📦 Public URL: ${publicUrl}`)
}

uploadExtension()
