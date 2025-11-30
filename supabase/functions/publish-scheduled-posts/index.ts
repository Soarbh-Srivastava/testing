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
    console.log('Starting scheduled posts publication check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp
    const now = new Date().toISOString();
    console.log(`Current time: ${now}`);

    // Find posts that should be published
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, scheduled_publish_date')
      .eq('published', false)
      .not('scheduled_publish_date', 'is', null)
      .lte('scheduled_publish_date', now);

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} posts to publish`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No posts ready to publish',
          count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Update posts to published
    const postIds = scheduledPosts.map(post => post.id);
    
    const { error: updateError } = await supabase
      .from('posts')
      .update({ published: true })
      .in('id', postIds);

    if (updateError) {
      console.error('Error updating posts:', updateError);
      throw updateError;
    }

    console.log(`Successfully published ${scheduledPosts.length} posts:`);
    scheduledPosts.forEach(post => {
      console.log(`- ${post.title} (scheduled for ${post.scheduled_publish_date})`);
    });

    // Trigger sitemap regeneration after publishing posts
    try {
      console.log('Triggering sitemap regeneration...');
      const sitemapResponse = await fetch(`${supabaseUrl}/functions/v1/generate-sitemap`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (sitemapResponse.ok) {
        console.log('Sitemap regenerated successfully');
      } else {
        console.error('Failed to regenerate sitemap:', await sitemapResponse.text());
      }
    } catch (sitemapError) {
      console.error('Error triggering sitemap regeneration:', sitemapError);
      // Don't fail the whole operation if sitemap generation fails
    }

    return new Response(
      JSON.stringify({ 
        message: 'Posts published successfully',
        count: scheduledPosts.length,
        posts: scheduledPosts.map(p => ({ id: p.id, title: p.title }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in publish-scheduled-posts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to publish scheduled posts'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
