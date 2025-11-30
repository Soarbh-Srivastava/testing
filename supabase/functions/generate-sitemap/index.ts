import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating sitemap...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all published posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at, publish_path')
      .eq('published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    console.log(`Found ${posts?.length || 0} published posts`);

    // Static URLs
    const staticUrls = [
      { loc: 'https://oneklick.app', lastmod: '2025-01-28', priority: '1.0' },
      { loc: 'https://oneklick.app/clipboard', lastmod: '2025-01-28', priority: '0.9' },
      { loc: 'https://oneklick.app/clipboard/blog', lastmod: '2025-01-28', priority: '0.8' },
      { loc: 'https://oneklick.app/image-compressor', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/image-resizer', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/image-cropper', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/background-remover', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/jpeg-to-png', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/png-to-jpeg', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/image-to-webp', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/image-to-pdf', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/image-to-bmp', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/compress-pdf', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/merge-pdfs', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/split-pdf', lastmod: '2025-01-15', priority: '0.8' },
      { loc: 'https://oneklick.app/pdf-to-image', lastmod: '2025-01-15', priority: '0.7' },
      { loc: 'https://oneklick.app/html-to-pdf', lastmod: '2025-01-15', priority: '0.7' },
    ];

    // Generate dynamic blog post URLs
    const blogUrls = (posts || []).map(post => ({
      loc: `https://oneklick.app${post.publish_path}/${post.slug}`,
      lastmod: new Date(post.updated_at).toISOString().split('T')[0],
      priority: '0.7'
    }));

    // Combine all URLs
    const allUrls = [...staticUrls, ...blogUrls];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

    console.log('Sitemap generated successfully');

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Failed to generate sitemap'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
