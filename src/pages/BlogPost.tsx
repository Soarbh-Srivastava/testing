import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  keywords: string | null;
  meta_description: string | null;
  publish_path: string;
  created_at: string;
  updated_at: string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  publish_path: string;
  created_at: string;
  updated_at: string;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract the publish_path from the current URL
  const currentPath = location.pathname.split("/").slice(0, -1).join("/");

  // Parse headings from markdown for table of contents
  const tableOfContents = useMemo(() => {
    if (!post?.content) return [];
    
    const headings: Heading[] = [];
    const lines = post.content.split("\n");
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        headings.push({ id, text, level });
      }
    });
    
    return headings;
  }, [post?.content]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  useEffect(() => {
    if (post) {
      fetchRelatedPosts();
    }
  }, [post]);

  const fetchPost = async () => {
    if (!slug) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .eq("publish_path", currentPath)
      .maybeSingle();

    if (error || !data) {
      toast.error("Post not found");
      navigate(currentPath);
    } else {
      setPost(data);
    }
    setLoading(false);
  };

  const fetchRelatedPosts = async () => {
    if (!post) return;

    const { data } = await supabase
      .from("posts")
      .select("id, title, slug, meta_description, publish_path, created_at, updated_at")
      .eq("published", true)
      .eq("publish_path", post.publish_path)
      .neq("id", post.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) {
      setRelatedPosts(data);
    }
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const ogImage = `${window.location.origin}/placeholder.svg`;

  return (
    <>
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.meta_description || post.title} />
        {post.keywords && <meta name="keywords" content={post.keywords} />}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.title} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description || post.title} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Article specific */}
        <meta property="article:published_time" content={post.created_at} />
        <meta property="article:modified_time" content={post.updated_at} />
      </Helmet>

      <article className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => navigate(currentPath)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            <div className="flex flex-col gap-1 text-muted-foreground">
              <time dateTime={post.created_at}>
                Published: {new Date(post.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.updated_at && post.updated_at !== post.created_at && (
                <time dateTime={post.updated_at}>
                  Last updated: {new Date(post.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents - Sidebar */}
            {tableOfContents.length > 0 && (
              <aside className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Table of Contents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <nav className="space-y-2">
                      {tableOfContents.map((heading) => (
                        <button
                          key={heading.id}
                          onClick={() => scrollToHeading(heading.id)}
                          className="block text-left text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                        >
                          {heading.text}
                        </button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </aside>
            )}

            {/* Main Content */}
            <div className={tableOfContents.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
              <Card>
                <CardContent className="pt-6">
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ children, ...props }) => {
                          const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
                          return <h1 id={id} {...props}>{children}</h1>;
                        },
                        h2: ({ children, ...props }) => {
                          const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
                          return <h2 id={id} {...props}>{children}</h2>;
                        },
                        h3: ({ children, ...props }) => {
                          const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-");
                          return <h3 id={id} {...props}>{children}</h3>;
                        },
                      }}
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* Related Articles */}
              {relatedPosts.length > 0 && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Related Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {relatedPosts.map((relatedPost) => (
                        <Card
                          key={relatedPost.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => navigate(`${relatedPost.publish_path}/${relatedPost.slug}`)}
                        >
                          <CardHeader>
                            <CardTitle className="text-base line-clamp-2">
                              {relatedPost.title}
                            </CardTitle>
                          </CardHeader>
                          {relatedPost.meta_description && (
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {relatedPost.meta_description}
                              </p>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </article>
    </>
  );
};

export default BlogPost;