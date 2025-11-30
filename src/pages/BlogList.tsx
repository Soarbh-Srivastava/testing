import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import Footer from "@/components/Footer";

interface Post {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  publish_path: string;
  created_at: string;
}

const BlogList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the current path to filter posts
  const currentPath = location.pathname.replace(/\/+$/, ""); // Remove trailing slash

  useEffect(() => {
    fetchPosts();
  }, [currentPath]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts" as any)
      .select("id, title, slug, meta_description, publish_path, created_at")
      .eq("published", true)
      .eq("publish_path", currentPath)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch posts");
    } else {
      setPosts((data as any) || []);
    }
    setLoading(false);
  };

  const getBlogTitle = () => {
    const pathMap: { [key: string]: string } = {
      "/clipboard/blog": "Clipboard Blog",
      "/image-compressor/blog": "Image Compressor Blog",
      "/pdf-tools/blog": "PDF Tools Blog",
      "/background-remover/blog": "Background Remover Blog",
    };
    return pathMap[currentPath] || "Blog";
  };

  return (
    <>
      <Helmet>
        <title>{getBlogTitle()} - Latest Articles</title>
        <meta name="description" content={`Read the latest articles on ${getBlogTitle()}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold">{getBlogTitle()}</h1>
            <p className="text-muted-foreground mt-2">Latest articles and insights</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {loading ? (
            <p>Loading posts...</p>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`${post.publish_path}/${post.slug}`)}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription>
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  {post.meta_description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {post.meta_description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
            )}
          </main>
          <Footer />
        </div>
      </>
    );
  };
  
  export default BlogList;