/**
 * @module hooks/useBlogs
 * @description Hook for fetching blog data from the API layer.
 */

import { useState, useEffect } from 'react';
import { getBlogs, getBlogById } from '../api/blogs';

/**
 * Fetch blogs with optional filters.
 * @param {{ featured?: boolean, category?: string, limit?: number }} [opts]
 */
export function useBlogs(opts = {}) {
    const [blogs, setBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getBlogs(opts).then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setBlogs(data ?? []);
        });
    }, [JSON.stringify(opts)]); // eslint-disable-line react-hooks/exhaustive-deps

    return { blogs, isLoading, error };
}

/**
 * Fetch a single blog post by ID.
 * @param {number|string} id
 */
export function useBlogById(id) {
    const [blog, setBlog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        getBlogById(id).then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setBlog(data);
        });
    }, [id]);

    return { blog, isLoading, error };
}
