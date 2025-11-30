import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate random access code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = Math.floor(Math.random() * 3) + 6; // 6-8 characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const action = path[path.length - 1];

    // POST /clipboard/upload - Create new clip
    if (req.method === 'POST' && action === 'upload') {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload(s)
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        
        if (!files || files.length === 0) {
          return new Response(JSON.stringify({ error: 'No files provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check total file size (max 10MB)
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (totalSize > maxSize) {
          return new Response(JSON.stringify({ error: 'Total file size exceeds 10MB limit' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate access code
        const accessCode = generateAccessCode();
        const uploadedFiles: { path: string; name: string; size: number }[] = [];

        // Upload all files
        for (const file of files) {
          const filePath = `${accessCode}/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('clipboard-files')
            .upload(filePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Clean up already uploaded files
            if (uploadedFiles.length > 0) {
              await supabase.storage.from('clipboard-files').remove(uploadedFiles.map(f => f.path));
            }
            return new Response(JSON.stringify({ error: 'Failed to upload files' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          uploadedFiles.push({ path: filePath, name: file.name, size: file.size });
        }

        // Save clip data with multiple files
        const { error: insertError } = await supabase
          .from('clips')
          .insert({
            access_code: accessCode,
            type: 'file',
            file_path: JSON.stringify(uploadedFiles), // Store as JSON array
            file_name: uploadedFiles.map(f => f.name).join(', '),
            file_size: totalSize,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          // Clean up uploaded files
          await supabase.storage.from('clipboard-files').remove(uploadedFiles.map(f => f.path));
          return new Response(JSON.stringify({ error: 'Failed to create clip' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ accessCode }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Handle text upload
        const { text } = await req.json();
        
        if (!text) {
          return new Response(JSON.stringify({ error: 'No text provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate access code
        const accessCode = generateAccessCode();

        // Save clip data
        const { error: insertError } = await supabase
          .from('clips')
          .insert({
            access_code: accessCode,
            type: 'text',
            content: text,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(JSON.stringify({ error: 'Failed to create clip' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ accessCode }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /clipboard/access/:code - Get clip by access code
    if (req.method === 'GET' && path[path.length - 2] === 'access') {
      const code = path[path.length - 1];

      // Find clip
      const { data: clip, error: selectError } = await supabase
        .from('clips')
        .select('*')
        .eq('access_code', code)
        .single();

      if (selectError || !clip) {
        return new Response(JSON.stringify({ error: 'Clip not found or expired' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update last accessed
      await supabase
        .from('clips')
        .update({ last_accessed: new Date().toISOString() })
        .eq('access_code', code);

      // If file, get public URLs
      if (clip.type === 'file') {
        let files;
        try {
          files = JSON.parse(clip.file_path);
        } catch {
          // Legacy single file format
          files = [{ path: clip.file_path, name: clip.file_name, size: clip.file_size }];
        }

        const filesWithUrls = files.map((file: any) => {
          const { data: urlData } = supabase.storage
            .from('clipboard-files')
            .getPublicUrl(file.path);
          
          return {
            fileName: file.name,
            fileSize: file.size,
            downloadUrl: urlData.publicUrl,
          };
        });

        return new Response(JSON.stringify({
          type: 'file',
          files: filesWithUrls,
          totalSize: clip.file_size,
          createdAt: clip.created_at,
          lastAccessed: clip.last_accessed,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return text
      return new Response(JSON.stringify({
        type: 'text',
        content: clip.content,
        createdAt: clip.created_at,
        lastAccessed: clip.last_accessed,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /clipboard/delete/:code - Delete clip
    if (req.method === 'DELETE' && path[path.length - 2] === 'delete') {
      const code = path[path.length - 1];

      // Get clip first to delete file(s) if needed
      const { data: clip } = await supabase
        .from('clips')
        .select('*')
        .eq('access_code', code)
        .single();

      if (clip && clip.type === 'file') {
        let filePaths;
        try {
          const files = JSON.parse(clip.file_path);
          filePaths = files.map((f: any) => f.path);
        } catch {
          // Legacy single file format
          filePaths = [clip.file_path];
        }
        await supabase.storage.from('clipboard-files').remove(filePaths);
      }

      // Delete clip
      const { error: deleteError } = await supabase
        .from('clips')
        .delete()
        .eq('access_code', code);

      if (deleteError) {
        return new Response(JSON.stringify({ error: 'Failed to delete clip' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /clipboard/cleanup - Cleanup expired clips (called by cron)
    if (req.method === 'POST' && action === 'cleanup') {
      // Get expired clips
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: expiredClips } = await supabase
        .from('clips')
        .select('*')
        .lt('last_accessed', oneHourAgo);

      // Delete files for expired file clips
      if (expiredClips && expiredClips.length > 0) {
        const allFilePaths: string[] = [];
        
        expiredClips
          .filter(clip => clip.type === 'file')
          .forEach(clip => {
            try {
              const files = JSON.parse(clip.file_path);
              allFilePaths.push(...files.map((f: any) => f.path));
            } catch {
              // Legacy single file format
              allFilePaths.push(clip.file_path);
            }
          });

        if (allFilePaths.length > 0) {
          await supabase.storage.from('clipboard-files').remove(allFilePaths);
        }

        // Delete expired clips
        await supabase
          .from('clips')
          .delete()
          .lt('last_accessed', oneHourAgo);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        deleted: expiredClips?.length || 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
