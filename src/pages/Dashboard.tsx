import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { User } from "@supabase/supabase-js";
import { LogOut, Plus, Edit, Trash2, Eye } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  keywords: string | null;
  meta_description: string | null;
  publish_path: string;
  created_at: string;
  scheduled_publish_date?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [publishPath, setPublishPath] = useState("/clipboard/blog");
  const [scheduledPublishDate, setScheduledPublishDate] = useState("");
  const [useScheduling, setUseScheduling] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchPosts();
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch posts");
    } else {
      setPosts((data as any) || []);
    }
    setLoading(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!editingPost) {
      setSlug(generateSlug(value));
    }
  };

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setContent("");
    setPublished(false);
    setKeywords("");
    setMetaDescription("");
    setPublishPath("/clipboard/blog");
    setScheduledPublishDate("");
    setUseScheduling(false);
    setEditingPost(null);
    setShowEditor(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !content) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (useScheduling && !scheduledPublishDate) {
      toast.error("Please set a scheduled publish date");
      return;
    }

    if (!user) return;

    const postData: any = {
      title,
      slug,
      content,
      published: useScheduling ? false : published,
      keywords: keywords || null,
      meta_description: metaDescription || null,
      publish_path: publishPath,
      user_id: user.id,
      scheduled_publish_date: useScheduling ? scheduledPublishDate : null,
    };

    if (editingPost) {
      const { error } = await supabase
        .from("posts" as any)
        .update(postData)
        .eq("id", editingPost.id);

      if (error) {
        toast.error("Failed to update post: " + error.message);
      } else {
        toast.success(
          useScheduling ? "Post scheduled successfully!" : "Post updated successfully!"
        );
        resetForm();
        fetchPosts();
      }
    } else {
      const { error } = await supabase.from("posts" as any).insert(postData);

      if (error) {
        toast.error("Failed to create post: " + error.message);
      } else {
        toast.success(
          useScheduling ? "Post scheduled successfully!" : "Post created successfully!"
        );
        resetForm();
        fetchPosts();
      }
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setPublished(post.published);
    setKeywords(post.keywords || "");
    setMetaDescription(post.meta_description || "");
    setPublishPath(post.publish_path);
    if (post.scheduled_publish_date) {
      setScheduledPublishDate(post.scheduled_publish_date.slice(0, 16));
      setUseScheduling(true);
    }
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase.from("posts" as any).delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted successfully!");
      fetchPosts();
    }
  };

  const handleTogglePublish = async (post: Post) => {
    const { error } = await supabase
      .from("posts" as any)
      .update({ published: !post.published })
      .eq("id", post.id);

    if (error) {
      toast.error("Failed to update post status");
    } else {
      toast.success(`Post ${!post.published ? "published" : "unpublished"}!`);
      fetchPosts();
      
      // Auto-refresh sitemap after publishing
      if (!post.published) {
        handleRefreshSitemap();
      }
    }
  };

  const handleRefreshSitemap = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-sitemap');

      if (error) throw error;

      // Download the sitemap
      const blob = new Blob([data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Sitemap updated! File downloaded - replace public/sitemap.xml");
    } catch (error) {
      console.error('Error refreshing sitemap:', error);
      toast.error("Failed to generate sitemap");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Blog Platform</title>
        <meta name="description" content="Manage your blog posts" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Blog Dashboard</h1>
            <div className="flex gap-2">
              {!showEditor && (
                <>
                  <Button variant="outline" onClick={handleRefreshSitemap}>
                    Update Sitemap
                  </Button>
                  <Button onClick={() => setShowEditor(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Post
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {showEditor ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingPost ? "Edit Post" : "Create New Post"}</CardTitle>
                <CardDescription>
                  Fill in the details below to {editingPost ? "update" : "create"} your post
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter post title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="url-friendly-slug"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publish-path">Publish Path</Label>
                    <Select value={publishPath} onValueChange={setPublishPath}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/clipboard/blog">Clipboard Blog</SelectItem>
                        <SelectItem value="/png-to-jpeg/blog">PNG to JPEG Blog</SelectItem>
                        <SelectItem value="/jpeg-to-png/blog">JPEG to PNG Blog</SelectItem>
                        <SelectItem value="/image-compressor/blog">Image Compressor Blog</SelectItem>
                        <SelectItem value="/image-cropper/blog">Image Cropper Blog</SelectItem>
                        <SelectItem value="/background-remover/blog">Background Remover Blog</SelectItem>
                        <SelectItem value="/image-resizer/blog">Image Resizer Blog</SelectItem>
                        <SelectItem value="/image-to-webp/blog">Image to WebP Blog</SelectItem>
                        <SelectItem value="/image-to-bmp/blog">Image to BMP Blog</SelectItem>
                        <SelectItem value="/merge-pdfs/blog">Merge PDFs Blog</SelectItem>
                        <SelectItem value="/split-pdf/blog">Split PDF Blog</SelectItem>
                        <SelectItem value="/compress-pdf/blog">Compress PDF Blog</SelectItem>
                        <SelectItem value="/html-to-pdf/blog">HTML to PDF Blog</SelectItem>
                        <SelectItem value="/image-to-pdf/blog">Image to PDF Blog</SelectItem>
                        <SelectItem value="/pdf-to-image/blog">PDF to Image Blog</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Full URL: {publishPath}/{slug}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content * (Markdown supported)</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your post content in markdown..."
                      className="min-h-[300px] font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords (SEO)</Label>
                    <Input
                      id="keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta-description">Meta Description (SEO)</Label>
                    <Textarea
                      id="meta-description"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Brief description for search engines (max 160 characters)"
                      maxLength={160}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {metaDescription.length}/160 characters
                    </p>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="useScheduling"
                        checked={useScheduling}
                        onCheckedChange={(checked) => {
                          setUseScheduling(checked);
                          if (checked) {
                            setPublished(false);
                          }
                        }}
                      />
                      <Label htmlFor="useScheduling" className="cursor-pointer">
                        Schedule for later
                      </Label>
                    </div>
                    
                    {useScheduling ? (
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Publish Date & Time</Label>
                        <Input
                          id="scheduledDate"
                          type="datetime-local"
                          value={scheduledPublishDate}
                          onChange={(e) => setScheduledPublishDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          required={useScheduling}
                        />
                        <p className="text-xs text-muted-foreground">
                          Post will be automatically published at this time
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="published"
                          checked={published}
                          onCheckedChange={setPublished}
                        />
                        <Label htmlFor="published" className="cursor-pointer">
                          Publish immediately
                        </Label>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {useScheduling
                        ? "Schedule Post"
                        : editingPost
                        ? "Update Post"
                        : "Create Post"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your Posts</h2>
              {loading ? (
                <p>Loading posts...</p>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No posts yet. Create your first post!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{post.title}</h3>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  post.published
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : post.scheduled_publish_date
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                }`}
                              >
                                {post.published
                                  ? "Published"
                                  : post.scheduled_publish_date
                                  ? "Scheduled"
                                  : "Draft"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {post.publish_path}/{post.slug}
                            </p>
                            {post.scheduled_publish_date && !post.published && (
                              <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                                Scheduled for: {new Date(post.scheduled_publish_date).toLocaleString()}
                              </p>
                            )}
                            {post.meta_description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {post.meta_description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePublish(post)}
                            >
                              {post.published ? "Unpublish" : "Publish"}
                            </Button>
                            {post.published && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`${post.publish_path}/${post.slug}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEdit(post)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(post.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;