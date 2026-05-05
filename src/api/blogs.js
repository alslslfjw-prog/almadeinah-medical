/**
 * @module api/blogs
 * @description All Supabase data operations for the `blogs` table.
 *
 * Live schema (verified 2026-03-09):
 *   id (bigint), created_at, title, excerpt, content, image_url,
 *   category, icon_name (default 'Activity'), read_time, author,
 *   is_featured (bool, default false)
 */

import { supabase } from '../lib/supabaseClient';

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all blog posts — summary fields only (no heavy `content`).
 * @param {{ featured?: boolean, category?: string, limit?: number }} [opts]
 */
export async function getBlogs({ featured, category, limit } = {}) {
    let query = supabase
        .from('blogs')
        .select('id, created_at, title, excerpt, image_url, category, icon_name, read_time, author, is_featured')
        .order('created_at', { ascending: false });

    if (featured !== undefined) query = query.eq('is_featured', featured);
    if (category) query = query.eq('category', category);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    return { data, error };
}

/**
 * Fetch a single blog post with full content.
 * @param {number|string} id
 */
export async function getBlogById(id) {
    const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

/**
 * Create a new blog post.
 * @param {{ title: string, excerpt: string, content: string, category: string,
 *           image_url?: string, read_time?: string, author?: string,
 *           icon_name?: string, is_featured?: boolean }} payload
 */
export async function createBlog(payload) {
    const { data, error } = await supabase
        .from('blogs')
        .insert([{
            title: payload.title,
            excerpt: payload.excerpt,
            content: payload.content,
            category: payload.category,
            image_url: payload.image_url ?? null,
            read_time: payload.read_time ?? null,
            author: payload.author ?? 'فريق التثقيف الطبي',
            icon_name: payload.icon_name ?? 'Activity',
            is_featured: payload.is_featured ?? false,
        }])
        .select()
        .single();
    return { data, error };
}

/**
 * Update an existing blog post.
 * @param {number} id
 * @param {Partial<Parameters<typeof createBlog>[0]>} updates
 */
export async function updateBlog(id, updates) {
    const { data, error } = await supabase
        .from('blogs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

/**
 * Toggle the is_featured flag on a blog post.
 * @param {number} id
 * @param {boolean} featured
 */
export async function toggleBlogFeatured(id, featured) {
    return updateBlog(id, { is_featured: featured });
}

/**
 * Delete a blog post permanently.
 * @param {number} id
 */
export async function deleteBlog(id) {
    const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);
    return { error };
}

export async function uploadBlogImage(file) {
    try {
        const ext = file.name.split('.').pop();
        const filename = `blog-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('blog-images')
            .upload(filename, file, { upsert: true, contentType: file.type });
        if (uploadError) return { url: null, error: uploadError };
        const { data } = supabase.storage.from('blog-images').getPublicUrl(filename);
        return { url: data.publicUrl, error: null };
    } catch (err) { return { url: null, error: err }; }
}
